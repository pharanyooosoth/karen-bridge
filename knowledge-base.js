// One source model for search, medical filtering, sentences, reviewed OCR and API evidence.
import {buildIndex,search,glossKey} from './engine.js';
import {courseDictionaryEntries,courseKey,exactCourseTranslation,retrieveCourse,courseReference} from './course.js';
import {prepareDrum,drumDictionaryEntries} from './drum.js';
import {thaiReading} from './thai-reading.js';
export const SOURCE_FILES=['dictionary','ktwg-course','drum-general','drum-medical'];
export function createKnowledgeBase(dictionary,course,general,medical){
 const drum=prepareDrum(general,medical);
 const entries=[...dictionary.entries.map(e=>({...e,sourceLabel:'Wiktionary',domain:'general'})),...courseDictionaryEntries(course).map(e=>({...e,sourceLabel:'KTWG',domain:'course'})),...drumDictionaryEntries(drum)];
 const originals=new Map([...course.entries,...drum.entries].filter(e=>!e.needsReview).map(e=>[e.id,e]));
 const records=entries.flatMap(e=>e.senses.map((sense,i)=>{
  const original=originals.get(e.id);const reading=thaiReading(e);
  return {id:e.senses.length===1?e.id:`${e.id}:sense:${i}`,entryId:e.id,word:e.word,english:original?.english||sense.en.join('; '),englishAliases:[...sense.en,...sense.en.map(glossKey)],thai:sense.th,roman:e.roman,thaiReading:reading.readings,thaiReadingNote:e.thaiReadingNote||'คำอ่านโดยประมาณ ยังไม่ได้ตรวจโดยเจ้าของภาษา',readingMethod:reading.method,source:e.source,sourceLabel:e.sourceLabel||original?.sourceLabel,domain:e.domain,page:original?.page,sourcePages:original?.sourcePages,section:original?.section};
 }));
 const index=buildIndex(entries);
 return {entries,index,medicalIndex:index.filter(r=>r.entry.domain==='medical'),records,meta:{entries:entries.length,words:new Set(entries.map(e=>e.word)).size,thaiEntries:entries.filter(e=>e.senses.some(s=>s.th.length)).length,audioFiles:new Set(entries.flatMap(e=>e.audio.map(a=>a.url))).size,courseEntries:course.meta.entryCount,drumEntries:drum.meta.entryCount,medicalEntries:medical.meta.entryCount,medicalPages:medical.meta.pageCount}};
}
export function exactTranslation(base,text,language,target){
 const result=exactCourseTranslation({entries:base.records},text,language,target);if(!result)return null;
 const sources=new Set(result.courseReferences.map(r=>r.sourceLabel));
 result.provider=sources.size===1&&sources.has('KTWG')?'ktwg-course':[...sources].every(s=>s?.startsWith('DRUM'))?'drum-glossary':'shared-database';
 const first=base.records.find(r=>r.id===result.courseReferences[0].id);
 result.data.notes=['ตรงกับฐานข้อมูลกลาง · ไม่เรียก AI','ความหมายไทยและคำอ่านไทยเป็นส่วนที่โครงการเพิ่ม ยังไม่ได้ตรวจโดยเจ้าของภาษา',...(result.data.thai_reading?[first.thaiReadingNote]:[])];
 result.data.reading_basis=result.data.thai_reading?(first.sourceLabel==='KTWG'?'course_roman_approximation':first.sourceLabel?.startsWith('DRUM')?'drum_approximation':'dictionary'):'unavailable';
 result.references=result.courseReferences.map(r=>referenceFromRecord(base.records.find(e=>e.id===r.id)));
 result.courseReferences=result.references;
 return result;
}
export function referenceFromRecord(e){return {...courseReference(e),status:e.sourceLabel==='Wiktionary'?'Wiktionary source; project Thai meanings/readings are unverified drafts':'Source extraction and legacy-font conversion; not native-speaker validated',entryId:e.entryId,thai_readings:e.thaiReading,reading_method:e.readingMethod,roman:e.roman,meaning_th:e.thai,meaning_en:[e.english]};}
export function exactReferences(base,text,language){
 if(language!=='sgaw_karen')return [];
 const lines=new Set(text.split('\n').map(s=>courseKey(s,'sgaw_karen')).filter(Boolean));
 return base.records.filter(e=>lines.has(courseKey(e.word,'sgaw_karen'))).slice(0,12).map(referenceFromRecord);
}
export function retrieveKnowledge(base,text,language,limit=8){
 if(!['thai','english','sgaw_karen'].includes(language)||!text.trim())return [];
 const matches=search(base.index,text,{thai:'th',english:'en',sgaw_karen:'ksw'}[language],{limit});
 const ids=new Set(matches.matches.map(m=>m.entry.id));
 const direct=base.records.filter(r=>ids.has(r.entryId)).map(referenceFromRecord);
 const related=retrieveCourse({entries:base.records},text,language,limit).map(r=>referenceFromRecord(base.records.find(e=>e.id===r.id)));
 const unique=new Map();for(const ref of [...direct,...related])if(!unique.has(ref.id))unique.set(ref.id,ref);
 return [...unique.values()].slice(0,limit);
}
export function localTextResult(base,input){
 // Explicit reference evidence is allowed to override approximate project readings via AI.
 if(input.referenceText?.trim()||input.referenceImage)return null;
 if(['sentence','translate'].includes(input.action)){const result=exactTranslation(base,input.text,input.sourceLanguage,input.target);return result?{...result,action:input.action}:null;}
 if(input.action==='reading'){
  const refs=exactReferences(base,input.text,input.sourceLanguage).filter(r=>courseKey(r.text,'sgaw_karen')===courseKey(input.text,'sgaw_karen'));
  const preferred=refs.some(r=>r.reading_method==='user-example')?refs.filter(r=>r.reading_method==='user-example'):refs;
  const readings=[...new Set(preferred.flatMap(r=>r.thai_readings))];if(!readings.length)return null;
  return {action:'reading',provider:'shared-database',draft:true,references:refs,courseReferences:refs,data:{translation:'',thai_reading:readings.join(' / '),reading_basis:'dictionary',reading_quote:input.text,uncertain_spans:[],notes:['คำอ่านจากฐานข้อมูลกลาง · โดยประมาณ ยังไม่ได้ตรวจโดยเจ้าของภาษา']}};
 }
 return null;
}
let loading;
export function loadKnowledgeBase(){
 if(!loading)loading=Promise.all(SOURCE_FILES.map(name=>fetch(`./data/${name}.json`).then(r=>{if(!r.ok)throw Error(`โหลด ${name} ไม่สำเร็จ`);return r.json();}))).then(data=>createKnowledgeBase(...data)).catch(error=>{loading=null;throw error;});
 return loading;
}
