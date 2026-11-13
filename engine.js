import {thaiReading} from './thai-reading.js';
export function normalize(text) {
  return String(text).normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/gu, '').trim().toLocaleLowerCase('en').replace(/\s+/gu, ' ');
}
export function glossKey(text) {
  return normalize(text).replace(/[.!?。။]+$/u, '').replace(/^(to |a |an |the )/u, '');
}
// Ignore syllable separators, but retain Thai vowels and tone marks.
function thaiReadingKey(text){return normalize(text).replace(/[\s\-‐‑–—]+/gu,'');}
export function buildIndex(entries) {
  return entries.map(entry => ({entry, keys:{
    ksw:[normalize(entry.word)],
    en:entry.senses.flatMap(s=>s.en.flatMap(g=>[normalize(g),glossKey(g)])),
    th:entry.senses.flatMap(s=>s.th.flatMap(g=>g.split(';').map(g=>normalize(g).replace(/[!?。။]+$/u,'')))),
    roman:entry.roman.map(normalize),
    'thai-reading':thaiReading(entry).readings.map(thaiReadingKey)
  }}));
}
export function search(index, query, language='th', {audioOnly=false, limit=40}={}) {
  const cleaned=normalize(query).replace(/[!?。။]+$/u,'');
  const q=language==='thai-reading'?thaiReadingKey(cleaned):cleaned;
  if (!q) return {matches:[],total:0,exact:0};
  const matches=[];
  for(const row of index){
    if(audioOnly&&!row.entry.audio.length) continue;
    const keys=row.keys[language]||[];
    let score=0;
    if(keys.includes(q)) score=100;
    else if(language==='en'&&keys.includes(glossKey(q))) score=95;
    else if(keys.some(k=>k.startsWith(q))) score=65;
    else if(keys.some(k=>k.includes(q))) score=40;
    if(score) matches.push({entry:row.entry,score,exact:score>=95});
  }
  matches.sort((a,b)=>b.score-a.score||a.entry.word.localeCompare(b.entry.word));
  return {matches:matches.slice(0,limit),total:matches.length,exact:matches.filter(m=>m.exact).length};
}
// A reading aid only. Preserve unknown runs; never claim this is sentence translation.
export function segmentKaren(index,text){
  const normalized=normalize(text);
  const words=[...new Set(index.map(r=>r.entry.word).filter(w=>/^[\u1000-\u109f]+$/u.test(w)))].sort((a,b)=>b.length-a.length);
  const parts=[]; let i=0;
  while(i<normalized.length){
    if(/\s|[၊။,.!?]/u.test(normalized[i])){i++;continue;}
    const match=words.find(w=>normalized.startsWith(w,i));
    if(match){parts.push({text:match,known:true});i+=match.length;}
    else {const point=String.fromCodePoint(normalized.codePointAt(i)); const last=parts.at(-1); if(last&&!last.known)last.text+=point; else parts.push({text:point,known:false}); i+=point.length;}
  }
  return parts;
}
