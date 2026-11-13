import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyMeanings,sources} from '../scripts/apply-thai.mjs';
import {buildIndex,search} from '../engine.js';
import {prepareDrum,drumDictionaryEntries,exactDrumTranslation,retrieveDrum} from '../drum.js';
import {courseDictionaryEntries,exactCourseTranslation} from '../course.js';
const read=name=>JSON.parse(readFileSync(new URL(`../data/${name}.json`,import.meta.url)));
const catalog=read('thai-meanings');
const datasets=Object.fromEntries(sources.map(name=>[name,read(name)]));
const drum=prepareDrum(datasets['drum-general'],datasets['drum-medical']);
test('every nonempty English definition has Thai and can be rebuilt without changing source fields',()=>{
 for(const [name,data] of Object.entries(datasets)){
  const copy=structuredClone(data);
  const rows=d=>d.entries.flatMap(e=>name==='dictionary'?e.senses:[e]);
  const field=name==='dictionary'?'th':'thai';
  for(const row of rows(copy))if(row.thaiProvenance){row[field]=[];delete row.thaiProvenance;}
  const report=applyMeanings(copy,name,catalog);
  assert.equal(report.translated,report.english,name);assert.deepEqual(report.missing,[]);
  assert.deepEqual(copy,data,`${name}: rebuilding must preserve source columns, readings, references, and existing Thai`);
  const first=JSON.stringify(copy);applyMeanings(copy,name,catalog);assert.equal(JSON.stringify(copy),first);
  for(const row of rows(data))if((name==='dictionary'?row.en.join('; '):row.english).trim())assert.ok(row[field].every(s=>/[ก-๙]/u.test(s)),name);
 }
});
test('missing English is kept empty and new unmapped glosses are reported, not fabricated',()=>{
 const fixture={meta:{},entries:[{id:'empty',senses:[{en:[],th:[]}]},{id:'new',senses:[{en:['unmapped-example-xyz'],th:[]}]},{id:'existing',senses:[{en:['water'],th:['คำแปลที่ผู้ใช้ตรวจแล้ว']}]}]};
 const result=applyMeanings(fixture,'dictionary',catalog);
 assert.equal(result.noEnglish,1);assert.deepEqual(result.missing,[{id:'new',english:'unmapped-example-xyz'}]);assert.deepEqual(fixture.entries[0].senses[0].th,[]);assert.deepEqual(fixture.entries[2].senses[0].th,['คำแปลที่ผู้ใช้ตรวจแล้ว']);
});
test('Thai aliases find their original entry across all four datasets',()=>{
 const entries=[...datasets.dictionary.entries,...courseDictionaryEntries(datasets['ktwg-course']),...drumDictionaryEntries(drum)];
 const index=buildIndex(entries);
 for(const entry of entries)for(const sense of entry.senses)for(const text of sense.th){
  for(const alias of text.split(';').map(s=>s.trim()).filter(Boolean))assert.ok(search(index,alias,'th',{limit:10000}).matches.some(m=>m.exact&&m.entry.id===entry.id),`${entry.id}: ${alias}`);
 }
});
test('clavicle and collarbone have Thai aliases in search, reverse translation, and AI evidence',()=>{
 const index=buildIndex(drumDictionaryEntries(drum).filter(e=>e.domain==='medical'));
 for(const term of ['กระดูกไหปลาร้า','ไหปลาร้า'])assert.ok(search(index,term,'th').matches.some(m=>m.exact&&m.entry.senses[0].en.includes('clavicle')));
 const entry=drum.entries.find(e=>e.english==='clavicle');
 assert.equal(exactDrumTranslation(drum,'clavicle','english','th').data.translation,'กระดูกไหปลาร้า');
 assert.equal(exactDrumTranslation(drum,'กระดูกไหปลาร้า','thai','sgaw_karen').data.translation,entry.word);
 assert.ok(retrieveDrum(drum,'clavicle','english').some(r=>r.thai.includes('กระดูกไหปลาร้า')));
 assert.ok(!datasets['drum-general'].entries.find(e=>e.english==='Cold').thai.some(t=>t.includes('หวัด')));
});
test('new course Thai keeps source sentence polarity and supports local sentence translation',()=>{
 const entry=datasets['ktwg-course'].entries.find(e=>e.thaiProvenance&&/not|don't|isn't/i.test(e.english)&&e.thai.some(t=>t.includes('ไม่'))&&!e.needsReview);
 assert.ok(entry);const result=exactCourseTranslation(datasets['ktwg-course'],entry.english,'english','th');assert.equal(result.data.translation,entry.thai[0]);assert.ok(result.courseReferences.some(r=>r.id===entry.id));
});
