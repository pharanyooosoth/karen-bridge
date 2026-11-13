// Thai reading aids, NOT a phonemic transcription or a tone conversion.
// Romanization inventory: Wiktionary:S'gaw Karen transliteration and Module:ksw-translit.
// Thai approximations are project adaptations; dictionary originals remain unchanged.
const USER_READINGS = {
  'တၢ်ဘျုး': ['ตาบลึ', 'ตะบลือ'],
};
const INITIALS = {
  ht:'ท', kh:'ค', gh:'ก', ng:'ง', hs:'ซ', sh:'ช', ny:'ญ', hp:'พ', th:'ซ',
  k:'ก', x:'ค', s:'ซ', z:'ซ', t:'ต', d:'ด', n:'น', p:'ป', b:'บ', m:'ม',
  y:'ย', r:'ร', l:'ล', w:'ว', h:'ฮ', 'ʼ':'อ',
};
const MEDIALS = {l:'ล', r:'ร', w:'ว', y:'ย'};
const VOWELS = {
  a:c=>c+'ะ', ah:c=>c+'า', ee:c=>c+'ี', u:c=>c+'ือ', oo:c=>c+'ู',
  uh:c=>'เ'+c+'อ', ay:c=>'เ'+c, eh:c=>'แ'+c, oh:c=>'โ'+c, aw:c=>c+'อ',
};
export function romanSyllableToThai(syllable) {
  // Accept only the known Wiktionary marks. Do not silently strip arbitrary
  // letters, punctuation, or another romanization system into a plausible word.
  if (!syllable || /[^a-zʼ\u0300\u0304\u0308\u0323\u0331]/u.test(syllable.normalize('NFD'))) return null;
  const plain=syllable.normalize('NFD').replace(/[\u0300\u0304\u0308\u0323\u0331]/gu,'');
  if(plain==='ahh')return 'แอ';
  const match=/^(ht|kh|gh|ng|hs|sh|ny|hp|th|[kxsztdnpbmyrlwhʼ])([lrwy]?)(ah|ee|oo|uh|ay|eh|oh|aw|a|u)$/u.exec(plain);
  if(!match)return null;
  const [,initial,medial,vowel]=match;
  if(!INITIALS[initial])return null;
  return VOWELS[vowel](INITIALS[initial]+(MEDIALS[medial]||''));
}
export function thaiReading(entry) {
  if(entry.romanSystem==='drum')return {readings:[...(entry.thaiReading||[])],method:entry.readingMethod||'unavailable'};
  if(entry.romanSystem==='ktwg')return {readings:[...(entry.thaiReading||[])],method:'course-roman-approximation'};
  if(USER_READINGS[entry.word]) return {readings:[...USER_READINGS[entry.word]],method:'user-example'};
  const readings=[];
  for(const roman of entry.roman||[]){
    const parts=roman.trim().split(/\s+/u).map(romanSyllableToThai);
    if(parts.length&&parts.every(Boolean))readings.push(parts.join(' '));
  }
  return {readings:[...new Set(readings)],method:'roman-approximation'};
}
