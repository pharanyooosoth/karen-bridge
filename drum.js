import {drumReading,DRUM_READING_NOTE} from './drum-reading.js';
import {exactCourseTranslation,retrieveCourse} from './course.js';
export function prepareDrum(general,medical){
 const words=new Map();for(const e of general.entries.filter(e=>!e.needsReview)){const list=words.get(e.word)||[];list.push({id:e.id,roman:e.roman,source:e.source,page:e.page});words.set(e.word,list);}
 return {meta:{entryCount:general.entries.length+medical.entries.length},entries:[...general.entries,...medical.entries].map(e=>{
  const entry={...e,readingReferences:e.domain==='medical'?(words.get(e.word)||[]):[]};const reading=drumReading(entry);
  return {...entry,thaiReading:reading.readings,thaiReadingNote:DRUM_READING_NOTE,readingMethod:reading.method};
 })};
}
export function drumDictionaryEntries(data){return data.entries.filter(e=>!e.needsReview).map(e=>({id:e.id,word:e.word,pos:`${e.sourceLabel} · หน้า PDF ${e.page}`,roman:e.roman,romanSystem:'drum',thaiReading:e.thaiReading,thaiReadingNote:e.thaiReadingNote,readingMethod:e.readingMethod,readingReferences:e.readingReferences,domain:e.domain,ipa:[],audio:[],senses:[{en:[e.english],th:e.thai,tags:e.domain==='medical'?['ศัพท์แพทย์ · ฉบับปี 2008']:[]}],source:e.source,drumPage:e.page,license:'DRUM Publication Group; original rights retained; user-confirmed publishing permission'}));}
export function exactDrumTranslation(data,text,language,target){
 const response=exactCourseTranslation(data,text,language,target);if(!response)return null;
 response.provider='drum-glossary';response.data.notes=response.data.notes.filter(n=>!n.includes('KTWG'));
 response.data.notes.unshift('ตรงกับฐาน DRUM · ไม่ได้สร้างคำแปลด้วย AI');
 response.data.reading_basis=response.data.thai_reading?'drum_approximation':'unavailable';
 if(response.courseReferences.some(r=>r.domain==='medical'))response.data.notes.push('ศัพท์แพทย์จากฉบับปี 2008 ใช้ช่วยค้นศัพท์ ไม่ใช้ตัดสินใจรักษาหรือคำนวณขนาดยา');
 return response;
}
export function retrieveDrum(data,text,language,limit=8){return retrieveCourse(data,text,language,limit);}
