import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {romanSyllableToThai,thaiReading} from '../thai-reading.js';
const entries=JSON.parse(readFileSync(new URL('../data/dictionary.json',import.meta.url))).entries;
test('Thank-you user examples take priority and retain provenance',()=>{
 const entry=entries.find(e=>e.word==='တၢ်ဘျုး');
 assert.deepEqual(thaiReading(entry),{readings:['ตาบลึ','ตะบลือ'],method:'user-example'});
 assert.deepEqual(entry.roman,['ta̱ blü']);
});
test('Source aspirated t is not confused with th; vowel spellings are not read as English',()=>{
 assert.equal(romanSyllableToThai('hṭee'),'ที');
 assert.equal(romanSyllableToThai('thee'),'ซี');
 assert.equal(romanSyllableToThai('hṭee'.normalize('NFD')),'ที');
 assert.equal(romanSyllableToThai('thoo'),'ซู');
 assert.equal(romanSyllableToThai('moẖ'),'โม');
});
test('Unsupported romanizations never turn into partial invented readings',()=>{
 for(const roman of ['KaKho','123','hello!','pə','unknown','phgā',''])assert.equal(romanSyllableToThai(roman),null);
 assert.deepEqual(thaiReading({word:'unknown',roman:['ta unknown']} ).readings,[]);
 assert.deepEqual(thaiReading({word:'unknown',roman:[]} ).readings,[]);
});
test('Common water entry has a Thai reading and dictionary remains unchanged',()=>{
 const entry=entries.find(e=>e.word==='ထံ');const before=JSON.stringify(entry);
 assert.deepEqual(thaiReading(entry).readings,['ที']);
 assert.equal(JSON.stringify(entry),before);
});
