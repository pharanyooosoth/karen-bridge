// Shared dictionary data, independent of the account owning the API key.
import {readFileSync} from 'node:fs';
import {thaiReading} from '../thai-reading.js';
const entries=JSON.parse(readFileSync(new URL('../data/dictionary.json',import.meta.url),'utf8')).entries;
const clean=text=>text.normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/gu,'').trim();
export function dictionaryReferences(text,language){
 if(language!=='sgaw_karen')return [];
 const lines=new Set(text.split('\n').map(clean).filter(Boolean));
 return entries.filter(e=>lines.has(clean(e.word))).slice(0,12).map(e=>({id:e.id,text:e.word,thai_readings:thaiReading(e).readings,reading_method:thaiReading(e).method,roman:e.roman,meaning_th:e.senses.flatMap(s=>s.th),meaning_en:e.senses.flatMap(s=>s.en),source:e.source}));
}
export function applyReadingEvidence(data,input,references){
 // A whole-text exact lookup is deterministic; never stitch approximate substrings.
 const exact=references.filter(r=>clean(r.text)===clean(input.text||''));
 const readings=[...new Set(exact.flatMap(r=>r.thai_readings))];
 const hasVisual=Boolean(input.referenceImage||input.image);
 const quote=data.reading_quote?.trim();
 const supported=data.reading_basis==='provided_reference'&&data.thai_reading?.trim()&&quote&&(hasVisual||(input.referenceText&&input.referenceText.includes(quote)&&quote.includes(data.thai_reading)&&clean(quote).includes(clean(input.text||''))));
 if(supported)return {...data,notes:[...data.notes,'AI เทียบคำอ่านกับข้อมูลอ้างอิง ยังต้องตรวจว่าเป็นแถวและอักษรเดียวกัน']};
 if(readings.length>0){
  return {...data,thai_reading:readings.join(' / '),reading_basis:'dictionary',reading_quote:exact[0].text,notes:[...data.notes,'คำอ่านจากฐานข้อมูลโครงการ ถอดโรมันโดยประมาณหรือเป็นตัวอย่างจากผู้ใช้ ยังไม่รับรองสำเนียง/วรรณยุกต์']};
 }
 return {...data,thai_reading:'',reading_basis:'unavailable',reading_quote:'',notes:[...data.notes,'ยังระบุคำอ่านจากหลักฐานไม่ได้ กรุณาแนบตารางคำอ่านหรือคำอ่านที่เจ้าของภาษายืนยัน']};
}
