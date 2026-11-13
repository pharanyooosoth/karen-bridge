import test from 'node:test';import assert from 'node:assert/strict';
import {knowledge} from '../server/knowledge.js';
import {createKnowledgeBase,exactReferences,exactTranslation,retrieveKnowledge,localTextResult,loadKnowledgeBase} from '../knowledge-base.js';
import {search} from '../engine.js';
import {readFileSync} from 'node:fs';
import {createKarenHandler} from '../server/karen-api.js';
const names=['dictionary','ktwg-course','drum-general','drum-medical'];
const raw=names.map(n=>JSON.parse(readFileSync(new URL(`../data/${n}.json`,import.meta.url))));
test('general and medical views use the same records; user symptom is available in both',()=>{
 const all=search(knowledge.index,'ปัสสาวะแสบ','th');const medical=search(knowledge.medicalIndex,'ปัสสาวะแสบ','th');
 assert.ok(medical.total);for(const match of medical.matches){assert.ok(all.matches.some(m=>m.entry===match.entry));assert.equal(match.exact,false);}
 assert.ok(all.matches.some(m=>m.entry.senses.some(s=>s.en.includes('dysuria'))));
 const evidence=retrieveKnowledge(knowledge,'ปัสสาวะแสบ','thai');assert.ok(evidence.some(r=>r.english==='dysuria'));
 // Partial matches are evidence, never silently promoted to a direct sentence translation.
 assert.equal(exactTranslation(knowledge,'ปัสสาวะแสบ','thai','sgaw_karen'),null);
});
test('all four sources survive in one model, retaining source identifiers and quarantines',()=>{
 assert.equal(knowledge.entries.length,3327);assert.equal(knowledge.medicalIndex.length,718);
 const quarantined=raw.flatMap(d=>d.entries.filter(e=>e.needsReview));assert.equal(quarantined.length,6);
 for(const e of quarantined)assert.ok(!knowledge.records.some(r=>r.entryId===e.id));
 for(const label of ['Wiktionary','KTWG','DRUM Word List','DRUM Medical 2008'])assert.ok(knowledge.records.some(r=>r.sourceLabel===label));
 assert.equal(new Set(knowledge.records.map(r=>r.id)).size,knowledge.records.length);
});
test('word, sentence and reviewed-image translations share meanings and source IDs for every source',()=>{
 for(const [label,query] of [['Wiktionary','pangolin'],['KTWG','What is your name?'],['DRUM Word List','Cold'],['DRUM Medical 2008','dysuria']]){
  const sentence=localTextResult(knowledge,{action:'sentence',text:query,sourceLanguage:'english',target:'th'});
  const image=localTextResult(knowledge,{action:'translate',text:query,sourceLanguage:'english',target:'th'});
  assert.ok(sentence,label);assert.deepEqual(sentence.data,image.data);assert.deepEqual(sentence.references,image.references);
  assert.ok(sentence.references.some(r=>r.sourceLabel===label));
  const word=search(knowledge.index,query,'en');assert.ok(word.matches.some(m=>sentence.references.some(r=>r.entryId===m.entry.id)));
 }
});
test('same-spelling distinct meanings stay separate; unsupported languages and evidence overrides never silently match',()=>{
 const fixture=createKnowledgeBase({entries:[{id:'a',word:'က',roman:[],ipa:[],audio:[],senses:[{en:['one'],th:['หนึ่ง'],tags:[]},{en:['two'],th:['สอง'],tags:[]}],source:'https://example.com'}]}, {meta:{},entries:[]},{entries:[]},{meta:{},entries:[]});
 assert.equal(exactTranslation(fixture,'က','sgaw_karen','en'),null);
 assert.deepEqual(exactReferences(fixture,'က','burmese'),[]);
 assert.deepEqual(retrieveKnowledge(fixture,'one','burmese'),[]);
 assert.equal(localTextResult(knowledge,{action:'translate',text:'dysuria',sourceLanguage:'english',target:'th',referenceText:'context'}),null);
});
test('browser consumers share a single load and server uses the identical compiled model',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async url=>{calls++;const name=String(url).split('/').at(-1).replace('.json','');return Response.json(raw[names.indexOf(name)]);};
 try{const [a,b,c]=await Promise.all([loadKnowledgeBase(),loadKnowledgeBase(),loadKnowledgeBase()]);assert.equal(a,b);assert.equal(b,c);assert.equal(calls,4);assert.deepEqual(a,knowledge);}finally{globalThis.fetch=original;}
});
const env={OPENAI_API_KEY:'fixture',APP_ACCESS_CODE:'fixture-code-12345678',ALLOWED_ORIGINS:'https://example.com'};
const request=body=>new Request('https://example.com/api/karen',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json','X-Karen-Access-Code':env.APP_ACCESS_CODE},body:JSON.stringify(body)});
test('protected API shares exact sentence/image/reading paths without paid calls',async()=>{
 let calls=0;const handler=createKarenHandler({fetchImpl:async()=>{calls++;throw Error('unexpected');}});
 for(const action of ['sentence','translate']){const response=await handler(request({action,text:'dysuria',sourceLanguage:'english',target:'th'}),env);assert.equal(response.status,200);const body=await response.json();assert.equal(body.data.translation,'ปัสสาวะแสบขัด');assert.ok(body.references.some(r=>r.domain==='medical'));}
 const text=knowledge.records.find(r=>r.english==='dysuria').word;
 const response=await handler(request({action:'reading',text,sourceLanguage:'sgaw_karen'}),env);assert.equal(response.status,200);assert.equal((await response.json()).data.translation,'');assert.equal(calls,0);
});
test('OCR retrieves all-source evidence after recognition, including KTWG absent from old OCR database',async()=>{
 const text='နမံၤဒ်လဲၣ်';
 const handler=createKarenHandler({fetchImpl:async()=>Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({text,language:'sgaw_karen',thai_reading:'',reading_quote:'',reading_basis:'unavailable',uncertain_spans:[],notes:[]})}]}]})});
 const response=await handler(request({action:'ocr',image:'data:image/png;base64,iVBORw0KGgo=',sourceLanguage:'auto'}),env);const body=await response.json();assert.ok(body.references.some(r=>r.sourceLabel==='KTWG'));assert.equal(body.data.reading_basis,'dictionary');assert.ok(body.courseReferences.some(r=>r.sourceLabel==='KTWG'));
});
