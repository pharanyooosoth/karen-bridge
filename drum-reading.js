// DRUM guide pp1–5: https://www.drumpublications.org/download/transliterate.pdf
// Thai is a project approximation. Karen tones and several consonants have no
// exact Thai equivalent. Never use Wiktionary roman rules for this source.
const INITIAL={g:'ก',k:'ค',gh:'ก',hk:'ค',ng:'ง',s:'ซ',hs:'ซ',sh:'ช',ny:'ญ',t:'ต',ht:'ท',d:'ด',n:'น',p:'ป',hp:'พ',b:'บ',m:'ม',y:'ย',r:'ร',l:'ล',w:'ว',th:'ซ',h:'ฮ','':'อ',ch:'ช',j:'จ'};
const VOWEL={a:c=>c+'ะ',ah:c=>c+'า',uh:c=>'เ'+c+'อะ',eh:c=>'แ'+c,ay:c=>'เ'+c,ee:c=>c+'ี',oo:c=>c+'ู',u:c=>c+'ุ',oh:c=>'โ'+c,aw:c=>c+'อ'};
function syllable(initial,medial,vowel){return INITIAL[initial]!==undefined&&VOWEL[vowel]?VOWEL[vowel](INITIAL[initial]+medial):null;}
export function drumRomanToThai(roman){
 const clean=roman.toLowerCase().normalize('NFD').replace(/[\u0300\u0301\u0304\u0308\u0323\u0331]/gu,'').normalize('NFC').replace(/[?!.]+$/u,'').trim();
 const result=[];
 for(const word of clean.split(/\s+/u)){
  if(word==='di'){result.push('ดิ');continue;}if(word==='ahh'){result.push('แอ');continue;}
  const m=/^(gh|hk|ng|hs|sh|ny|ht|hp|th|ch|[gkstdnpbmyrlwhj]?)([lrw]?)(ah|uh|eh|ay|ee|oo|oh|aw|a|u)$/.exec(word);
  if(!m)return [];const value=syllable(m[1],{l:'ล',r:'ร',w:'ว','':''}[m[2]],m[3]);if(!value)return [];result.push(value);
 }return result.length?[result.join(' ')]:[];
}
const BASE={'က':'g','ခ':'k','ဂ':'gh','ဃ':'hk','င':'ng','စ':'s','ဆ':'hs','ၡ':'sh','ည':'ny','တ':'t','ထ':'ht','ဒ':'d','န':'n','ပ':'p','ဖ':'hp','ဘ':'b','မ':'m','ယ':'y','ရ':'r','လ':'l','ဝ':'w','သ':'th','ဟ':'h','အ':'','ဧ':'ahh'};
const MARK={'ၢ':'uh','ါ':'ah','ဲ':'eh','့':'ay','ံ':'ee','ူ':'oo','ု':'u','ိ':'oh','ီ':'aw'};
export function karenScriptReading(word){
 const result=[];let rest=word.normalize('NFC').replace(/\s+/gu,'');
 while(rest){
  const sep=/^[,၊။.?!/()]+/.exec(rest);if(sep){result.push(' / ');rest=rest.slice(sep[0].length);continue;}
  const m=/^([ကခဂဃငစဆၡညတထဒနပဖဘမယရလဝသဟအဧ])([\u102b-\u103e\u1060\u1062-\u1064]*)/u.exec(rest);
  if(!m)return [];rest=rest.slice(m[0].length);
  let marks=m[2].replace(/ၢ်|ာ်|ၣ်|း|ၤ/gu,'');
  if(marks==='်'&&['ဒ','မ'].includes(m[1])){result.push(m[1]==='ဒ'?'ดิ':'มอ');continue;}
  let initial=BASE[m[1]],medial='';
  const cluster=/^[ျြွှၠ]+/u.exec(marks)?.[0]||'';marks=marks.slice(cluster.length);
  if(cluster==='ၠ'&&['က','ခ'].includes(m[1]))initial=m[1]==='က'?'j':'ch';
  else if(cluster==='ှ'&&['မ','ဖ','ပ','ဘ'].includes(m[1]))medial='ว';
  else if(cluster==='ှ'&&['စ','ဆ'].includes(m[1]))medial='ก';
  else {for(const c of cluster){if(!{'ျ':'ล','ြ':'ร','ွ':'ว'}[c])return [];medial+=({'ျ':'ล','ြ':'ร','ွ':'ว'})[c];}}
  if(marks.length>1||marks&&!MARK[marks])return [];
  if(initial==='ahh'){if(marks||medial)return [];result.push('แอ');continue;}
  result.push(syllable(initial,medial,MARK[marks]||'a'));
 }
 return result.length?[result.join(' ').replace(/\s*\/\s*/g,' / ').replace(/(?: \/ )+/g,' / ').replace(/^ \/ | \/ $/g,'')]:[];
}
export function drumReading(entry){
 const refs=entry.readingReferences||[];
 const roman=entry.roman?.length?entry.roman:refs.flatMap(r=>r.roman);
 const fromRoman=[...new Set(roman.flatMap(drumRomanToThai))];
 if(fromRoman.length)return {readings:fromRoman,method:entry.domain==='medical'?'drum-matched-roman':'drum-roman',references:refs};
 const readings=karenScriptReading(entry.word);
 return {readings,method:readings.length?'drum-script-experimental':'unavailable',references:refs};
}
export const DRUM_READING_NOTE='คำอ่านไทยทดลองตามคู่มือ DRUM ไม่ใช่คำอ่านใน PDF ไม่ถ่ายทอดวรรณยุกต์ครบ และยังไม่ได้ตรวจโดยเจ้าของภาษา';
