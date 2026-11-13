// Shared, deterministic retrieval. The original course and project additions stay distinct.
export function courseKey(text,language='english'){
 let value=String(text).normalize('NFC').replace(/[\u200b-\u200d\ufeff]/gu,'').toLowerCase().replace(/[’‘]/gu,"'").trim().replace(/\s+/gu,' ');
 if(language==='english')value=value.replace(/\bwhat's\b/g,'what is').replace(/\bwhere's\b/g,'where is').replace(/\bi'm\b/g,'i am').replace(/\byou're\b/g,'you are').replace(/\bdon't\b/g,'do not').replace(/\bisn't\b/g,'is not').replace(/\bhaven't\b/g,'have not');
 value=value.replace(/[.!?။]+$/u,'').trim();
 return language==='sgaw_karen'?value.replace(/\s+/gu,''):value;
}
function values(entry,language){return language==='sgaw_karen'?[entry.word]:language==='thai'?entry.thai:[entry.english];}
export function courseMatches(course,text,language){
 const key=courseKey(text,language);if(!key||!['sgaw_karen','thai','english'].includes(language))return [];
 return course.entries.filter(e=>!e.needsReview&&values(e,language).some(s=>courseKey(s,language)===key));
}
export function courseReference(e){return {id:e.id,sourceLabel:e.sourceLabel||'KTWG',domain:e.domain||'course',text:e.word,english:e.english,thai:e.thai,roman:e.roman,page:e.page,sourcePages:e.sourcePages,source:e.source,section:e.section,thai_reading:e.thaiReading?.join(' / ')||'',thai_reading_note:e.thaiReadingNote||'',status:'Source extraction and legacy-font conversion; not native-speaker validated'};}
export function exactCourseTranslation(course,text,sourceLanguage,target){
 if(({english:'en',thai:'th',sgaw_karen:'sgaw_karen'})[sourceLanguage]===target)return null;
 const matches=courseMatches(course,text,sourceLanguage).filter(e=>target!=='th'||e.thai.length);
 if(!matches.length)return null;
 const output=e=>target==='sgaw_karen'?e.word:target==='en'?e.english:e.thai[0];
 // An ambiguous Karen phrase needs context; do not silently choose an English meaning.
 if(sourceLanguage==='sgaw_karen'&&new Set(matches.map(e=>courseKey(output(e),target==='en'?'english':'thai'))).size>1)return null;
 const first=matches[0],alternatives=[...new Set(matches.map(output))].filter(s=>s!==output(first));
 const karenSide=target==='sgaw_karen'||sourceLanguage==='sgaw_karen';
 return {action:'sentence',provider:'ktwg-course',draft:true,courseReferences:matches.map(courseReference),data:{translation:output(first),thai_reading:karenSide?first.thaiReading?.join(' / ')||'':'',roman:karenSide?first.roman.join(' / '):'',reading_basis:first.thaiReading?.length&&karenSide?'course_roman_approximation':'unavailable',reading_quote:karenSide?first.roman.join(' / '):'',uncertain_spans:[],alternatives,notes:['ตรงกับรายการใน KTWG หน้า '+first.page+' · ไม่ได้สร้างคำแปลนี้ด้วย AI','อักษรกะเหรี่ยงแปลงจากฟอนต์เก่าเป็น Unicode ยังควรตรวจเทียบต้นฉบับ',...(first.thaiReadingNote&&karenSide?[first.thaiReadingNote]:[]),...(target==='th'?['ความหมายไทยเพิ่มโดยโครงการ ไม่ใช่ข้อความภาษาไทยใน PDF']:[])]}};
}
const STOP=new Set('a an the is are am was were do does did you your i my it its of to in on and or for this that what where how when who why'.split(' '));
export function retrieveCourse(course,text,language,limit=8){
 if(!['sgaw_karen','thai','english'].includes(language))return [];
 const exact=courseMatches(course,text,language);if(exact.length)return exact.slice(0,limit).map(courseReference);
 const query=courseKey(text,language),tokens=query.split(/[^a-z0-9]+/u).filter(w=>w.length>1&&!STOP.has(w));
 if(!query)return [];
 return course.entries.filter(e=>!e.needsReview).map(e=>{
  const candidates=values(e,language);let score=0;
  for(const candidate of candidates){const key=courseKey(candidate,language);if(!key)continue;
   if(language==='english'){
    const words=key.split(/[^a-z0-9]+/u);const overlap=new Set(tokens.filter(t=>words.includes(t))).size;
    const phrase=(' '+query.replace(/[.!?,;:]/g,' ').replace(/\s+/g,' ')+' ').includes(' '+key.replace(/[.!?,;:]/g,' ').replace(/\s+/g,' ')+' ')&&key.length>2;
    score=Math.max(score,phrase?20+key.length:overlap>=2?overlap:0);
   }else if(key.length>=2&&query.includes(key))score=Math.max(score,key.length);
  }return {entry:e,score};
 }).filter(r=>r.score>0).sort((a,b)=>b.score-a.score||a.entry.page-b.entry.page).slice(0,limit).map(r=>courseReference(r.entry));
}
export function courseDictionaryEntries(course){return course.entries.filter(e=>!e.needsReview).map(e=>({id:e.id,word:e.word,pos:'KTWG · หน้า '+e.page,roman:e.roman,romanSystem:'ktwg',thaiReading:e.thaiReading||[],thaiReadingNote:e.thaiReadingNote||'',ipa:[],audio:[],senses:[{en:[e.english,...(courseKey(e.english)!==e.english.toLowerCase()? [courseKey(e.english)]:[])],th:e.thai,tags:[]}],source:e.source,coursePage:e.page}));}
