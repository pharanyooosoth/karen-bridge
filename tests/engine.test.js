import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildIndex,search,segmentKaren,normalize} from '../engine.js';
const data=JSON.parse(readFileSync(new URL('../data/dictionary.json',import.meta.url)));
const index=buildIndex(data.entries);
test('Thai water resolves to referenced Sgaw word',()=>{assert.equal(search(index,'น้ำ','th').matches[0].entry.word,'ထံ');assert.equal(search(index,'น้ำ','th').matches[0].exact,true);});
test('English and Karen reverse lookups work',()=>{assert.equal(search(index,' water ','en').matches[0].entry.word,'ထံ');assert.ok(search(index,'ထံ','ksw').matches[0].entry.senses.some(s=>s.en.includes('water')));});
test('Thank you retains its phrase instead of being concatenated',()=>{assert.equal(search(index,'thank you','en').matches[0].entry.word,'တၢ်ဘျုး');});
test('No fabricated sentence translation',()=>{assert.equal(search(index,'please bring me water tomorrow','en').total,0);assert.equal(search(index,'unknownwordxyz','en').total,0);});
test('Whitespace and zero-width separators normalize, marks retained',()=>{assert.equal(normalize(' ထ\u200bံ '),'ထံ');assert.equal(search(index,'hṭee','roman').matches[0].entry.word,'ထံ');});
test('Audio filter only returns attested recordings',()=>{assert.equal(search(index,'น้ำ','th',{audioOnly:true}).total,0);assert.ok(search(index,'ส้มโอ','th',{audioOnly:true}).matches[0].entry.audio[0].license==='CC BY-SA 4.0');});
test('Sense-specific Thai does not overwrite English or invent missing Thai',()=>{assert.ok(data.entries.some(e=>e.senses.some(s=>!s.th.length)));const house=search(index,'house','en');assert.ok(house.exact>0);});
test('Unknown Karen spans remain visible',()=>{const parts=segmentKaren(index,'ထံ🙂');assert.ok(parts.some(p=>p.text==='ထံ'&&p.known));assert.ok(parts.some(p=>p.text==='🙂'&&!p.known));});
test('Sources, IDs, language metadata and counts are consistent',()=>{assert.equal(new Set(data.entries.map(e=>e.id)).size,data.entries.length);assert.equal(data.meta.words,new Set(data.entries.map(e=>e.word)).size);assert.equal(data.meta.thaiEntries,data.entries.filter(e=>e.senses.some(s=>s.th.length)).length);for(const e of data.entries){assert.ok(e.source.startsWith('https://en.wiktionary.org/wiki/'));assert.ok(e.senses.length);for(const a of e.audio)assert.ok(a.url.startsWith('https://upload.wikimedia.org/'));}});
test('Empty input and result pagination',()=>{assert.equal(search(index,'','en').total,0);const result=search(index,'a','en',{limit:3});assert.equal(result.matches.length,3);assert.ok(result.total>3);});

test('Thai reading water and thank-you spellings resolve back to meanings',()=>{
 const water=search(index,'ที','thai-reading');assert.equal(water.matches[0].entry.word,'ထံ');assert.equal(water.matches[0].exact,true);assert.ok(water.matches[0].entry.senses.some(s=>s.th.includes('น้ำ')&&s.en.includes('water')));
 for(const reading of ['ตาบลึ','ตะบลือ','ตะ บลือ','ตะ-บลือ',' ตะ\u200bบลือ '])assert.ok(search(index,reading,'thai-reading').matches.some(m=>m.exact&&m.entry.word==='တၢ်ဘျုး'));
});
test('Thai reading mode stays distinct from Thai meaning and roman search',()=>{
 assert.equal(search(index,'น้ำ','thai-reading').total,0);
 assert.equal(search(index,'hṭee','thai-reading').total,0);
 assert.equal(search(index,'คำอ่านที่ไม่มีในฐานข้อมูล','thai-reading').total,0);
 assert.equal(search(index,' - — ','thai-reading').total,0);
 assert.equal(search(index,'ที','thai-reading',{audioOnly:true}).matches.some(m=>m.entry.word==='ထံ'),false);
});
test('Thai reading homophones are all retained; exact precedes partial and tones stay distinct',()=>{
 const fixture=buildIndex([
  {word:'long',roman:['hṭee ta'],senses:[],audio:[]},
  {word:'one',roman:['hṭee'],senses:[],audio:[]},
  {word:'two',roman:['hṭee'],senses:[],audio:[]}
 ]);
 const result=search(fixture,'ที','thai-reading');assert.equal(result.exact,2);assert.equal(result.total,3);assert.deepEqual(result.matches.map(m=>m.exact),[true,true,false]);
 assert.equal(search(fixture,'ที่','thai-reading').total,0);
 assert.equal(search(fixture,'ทีตะ','thai-reading').matches[0].entry.word,'long');
 assert.equal(search(fixture,'ที','thai-reading',{limit:1}).exact,2);
});
