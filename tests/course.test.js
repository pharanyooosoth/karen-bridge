import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {courseKey,courseMatches,exactCourseTranslation,retrieveCourse,courseDictionaryEntries} from '../course.js';
import {buildIndex,search} from '../engine.js';
import {thaiReading} from '../thai-reading.js';
const course=JSON.parse(readFileSync(new URL('../data/ktwg-course.json',import.meta.url)));
test('course import covers all 28 pages and retains original columns, attribution and source hash',()=>{
 assert.equal(course.pages.length,28);assert.equal(course.entries.length,455);assert.equal(course.meta.entryCount,455);assert.match(course.meta.sha256,/^[a-f0-9]{64}$/);assert.equal(new Set(course.entries.map(e=>e.id)).size,455);
 assert.deepEqual([...new Set(course.entries.map(e=>e.page))],Array.from({length:27},(_,i)=>i+2));
 for(const e of course.entries){assert.ok(e.legacy&&e.word&&e.english&&e.roman[0]);assert.match(e.source,new RegExp('#page='+e.page+'$'));assert.ok(e.sourcePages.includes(e.page));}
});
test('name question matches contractions, casing and punctuation, but not negation',()=>{
 for(const text of ['What is your name?',"What's your name?",'WHAT’S YOUR NAME.'])assert.equal(courseMatches(course,text,'english')[0].word,'နမံၤဒ်လဲၣ်');
 assert.equal(exactCourseTranslation(course,"What isn't your name?",'english','sgaw_karen'),null);
 assert.equal(courseMatches(course,'name','english').length,0);
 assert.equal(courseKey('Do not like rice'),'do not like rice');
});
test('Thai aliases and Karen Unicode reverse lookup use the same sourced row',()=>{
 const thai=exactCourseTranslation(course,'คุณชื่ออะไร','thai','sgaw_karen');assert.equal(thai.data.translation,'နမံၤဒ်လဲၣ်');
 const reverse=exactCourseTranslation(course,'နမံၤဒ်လဲၣ်','sgaw_karen','en');assert.equal(reverse.data.translation,'What’s your name?');
 assert.match(thai.data.notes.join(' '),/ไม่ใช่คำอ่านไทยใน PDF/);
});
test('wrapped and cross-page rows retain proper pairings',()=>{
 const twentyFive=courseMatches(course,'Twenty five','english')[0];assert.equal(twentyFive.word,'ခံဆံယဲၢ်');assert.deepEqual(twentyFive.sourcePages,[25,26]);
 assert.equal(courseMatches(course,'Twenty six','english')[0].word,'ခံဆံဃု');
 assert.equal(courseMatches(course,'How many brothers and sisters do you have?','english')[0].roman[0],'na daw pu weh oh pgeh hga leh?');
 assert.equal(courseMatches(course,'ZOA office','english')[0].word,'ZOA ဝဲၤဒၢး');
});
test('questionable source conversions are retained for audit but excluded from answers and retrieval',()=>{
 assert.deepEqual(retrieveCourse(course,'What is your name?','burmese'),[]);
 const pending=course.entries.filter(e=>e.needsReview);assert.equal(pending.length,4);
 for(const e of pending){assert.ok(!courseDictionaryEntries(course).some(r=>r.id===e.id));assert.ok(!retrieveCourse(course,e.english,'english').some(r=>r.id===e.id));}
});
test('all enabled course entries are searchable in the dictionary without using Wiktionary roman rules',()=>{
 const entries=courseDictionaryEntries(course),index=buildIndex(entries);assert.equal(entries.length,451);
 for(const e of entries){assert.ok(search(index,e.word,'ksw',{limit:1000}).matches.some(m=>m.entry.id===e.id));if(!e.thaiReading.length)assert.deepEqual(thaiReading(e).readings,[]);}
 assert.ok(search(index,'What is your name?','en').matches.some(m=>m.entry.coursePage===3));
});
