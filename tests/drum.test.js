import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {prepareDrum,drumDictionaryEntries,exactDrumTranslation,retrieveDrum} from '../drum.js';
import {drumRomanToThai,karenScriptReading} from '../drum-reading.js';
import {buildIndex,search} from '../engine.js';
const general=JSON.parse(fs.readFileSync(new URL('../data/drum-general.json',import.meta.url)));
const medical=JSON.parse(fs.readFileSync(new URL('../data/drum-medical.json',import.meta.url)));
const data=prepareDrum(general,medical);
test('DRUM imports retain every page, unique IDs, both source columns, and provenance',()=>{
 assert.equal(general.pages.length,26);assert.equal(general.entries.length,958);assert.equal(medical.pages.length,32);assert.equal(medical.entries.length,720);
 assert.equal(new Set(data.entries.map(e=>e.id)).size,1678);
 for(const source of [general,medical]){assert.match(source.meta.sha256,/^[a-f0-9]{64}$/);for(const e of source.entries){assert.ok(e.word&&e.english&&e.legacy);assert.equal(e.source,`${source.meta.source}#page=${e.page}`);if(e.domain==='medical')assert.ok(e.burmeseLegacy&&e.rowY);}}
});
test('medical wrapped rows and differently aligned X-Rays remain correctly paired',()=>{
 for(const term of ['acute renal failure','Cardio Pulmonary Resuscitation','cerebral haemorrhage','Sexually Transmitted Diseases (STD)','Urinary Tract Infection (UTI)','X-Rays'])assert.equal(medical.entries.filter(e=>e.english===term).length,1,term);
 for(const term of ['failure','Pulmonary Resuscitation','shock','Transmitted Diseases (STD)']){if(term==='shock')assert.equal(medical.entries.filter(e=>e.english===term).length,1);else assert.equal(medical.entries.filter(e=>e.english===term).length,0);}
 const wrist=medical.entries.find(e=>e.english==='wrist');assert.equal(wrist.legacy,"pk'hudm");assert.ok(!wrist.english.includes('X-Rays'));
 assert.equal(medical.entries.at(-1).legacy,'wuD< ouD');
});
test('experimental pronunciation uses DRUM rules, never partial output for unsupported text',()=>{
 assert.deepEqual(drumRomanToThai('na mēe di lèh'),['นะ มี ดิ แล']);
 assert.deepEqual(drumRomanToThai('huh hpuh'),['เฮอะ เพอะ']);
 assert.deepEqual(karenScriptReading('ဟၢဖၢ'),['เฮอะ เพอะ']);
 for(const value of ['abc','ဟၢ\u1031','ဟၢ_ဖၢ','ဟၢB','◌ျ'])assert.deepEqual(karenScriptReading(value),[]);
 assert.deepEqual(drumRomanToThai('na completely-unknown'),[]);
});
test('medical exact word match cites original general pronunciation; unfamiliar compounds are labelled experimental',()=>{
 const abdomen=data.entries.find(e=>e.domain==='medical'&&e.english==='abdomen');assert.equal(abdomen.readingMethod,'drum-matched-roman');assert.equal(abdomen.readingReferences[0].page,3);assert.deepEqual(abdomen.readingReferences[0].roman,['huh hpuh']);
 const diabetes=data.entries.find(e=>e.domain==='medical'&&e.english==='diabetes');assert.equal(diabetes.readingMethod,'drum-script-experimental');assert.equal(diabetes.readingReferences.length,0);assert.match(diabetes.thaiReadingNote,/ทดลอง/);
});
test('quarantined medical source anomalies cannot become search answers or AI evidence',()=>{
 const bad=medical.entries.filter(e=>e.needsReview);assert.equal(bad.length,2);
 for(const e of bad){assert.ok(!drumDictionaryEntries(data).some(r=>r.id===e.id));assert.equal(exactDrumTranslation(data,e.english,'english','sgaw_karen'),null);assert.ok(!retrieveDrum(data,e.english,'english').some(r=>r.id===e.id));}
 assert.deepEqual(retrieveDrum(data,'abdomen','burmese'),[]);
});
test('medical search is separate and supports Thai meanings, Karen script, and Thai reading',()=>{
 const entries=drumDictionaryEntries(data),index=buildIndex(entries.filter(e=>e.domain==='medical'));
 assert.equal(index.length,718);assert.ok(search(index,'เบาหวาน','th').matches.some(m=>m.exact&&m.entry.senses[0].en.includes('diabetes')));
 const match=search(index,'abdomen','en').matches.find(m=>m.exact);assert.ok(match);assert.ok(search(index,match.entry.word,'ksw').matches.some(m=>m.exact));assert.ok(search(index,'เฮอะเพอะ','thai-reading').matches.some(m=>m.exact&&m.entry.id===match.entry.id));
 assert.equal(exactDrumTranslation(data,'diabetes','english','sgaw_karen').provider,'drum-glossary');assert.ok(exactDrumTranslation(data,'diabetes','english','sgaw_karen').courseReferences.some(r=>r.sourceLabel==='DRUM Medical 2008')); 
});
