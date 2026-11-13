import test from 'node:test';
import assert from 'node:assert/strict';
import {createKarenHandler,parseModelResponse,validateInput,MAX_BODY_BYTES} from '../server/karen-api.js';
import {safeApiUrl} from '../image-translate.js';
const env={OPENAI_API_KEY:'test-key-never-real',APP_ACCESS_CODE:'test-access-code-123456',ALLOWED_ORIGINS:'https://example.com'};
const input={action:'translate',text:'တၢ်ဘျုး',target:'th'};
const answer={translation:'ขอบคุณ',thai_reading:'ตาบลึ',reading_basis:'unavailable',reading_quote:'',uncertain_spans:[],notes:['คำตอบจำลองเพื่อทดสอบระบบ']};
const model=data=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(data)}]}]});
const request=(body=input,headers={})=>new Request('https://api.example.com/api/karen',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://example.com','X-Karen-Access-Code':env.APP_ACCESS_CODE,...headers},body:JSON.stringify(body)});
test('health and missing credentials fail closed without calling provider',async()=>{
 let calls=0;const handle=createKarenHandler({fetchImpl:()=>{calls++;throw Error();}});
 const health=await handle(new Request('https://example.com/api/karen'),{});assert.equal((await health.json()).ready,false);
 assert.equal((await handle(request(),{ALLOWED_ORIGINS:env.ALLOWED_ORIGINS})).status,503);assert.equal(calls,0);
});
test('authentication, exact origin and body restrictions run before provider',async()=>{
 let calls=0;const handle=createKarenHandler({fetchImpl:()=>{calls++;throw Error();}});
 for(const [headers,status] of [[{'X-Karen-Access-Code':'wrong'},401],[{Origin:'https://example.com.evil.test'},403],[{'Content-Type':'text/plain'},415],[{'Content-Length':String(MAX_BODY_BYTES+1)},413]])assert.equal((await handle(request(input,headers),env)).status,status);
 assert.equal((await handle(request({...input,target:'fr'}),env)).status,400);
 assert.equal((await handle(request({...input,text:'a'.repeat(6001)}),env)).status,400);
 assert.equal(calls,0);
 const preflight=await handle(new Request('https://api.example.com/api/karen',{method:'OPTIONS',headers:{Origin:'https://example.com'}}),env);assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),'https://example.com');
});
test('translation sends text in untrusted user content with strict schema and no storage',async()=>{
 let sent;const handle=createKarenHandler({fetchImpl:async(url,options)=>{sent={url,options,body:JSON.parse(options.body)};return Response.json(model(answer));}});
 const response=await handle(request(),env);assert.equal(response.status,200);const data=(await response.json()).data;assert.equal(data.translation,answer.translation);assert.equal(data.reading_basis,'dictionary');assert.equal(data.thai_reading,'ตาบลึ / ตะบลือ');
 assert.equal(sent.url,'https://api.openai.com/v1/responses');assert.equal(sent.body.store,false);assert.equal(sent.body.text.format.strict,true);assert.equal(sent.options.headers.Authorization,'Bearer '+env.OPENAI_API_KEY);
 assert.equal(JSON.parse(sent.body.input[0].content[0].text).source_text,input.text);assert.match(sent.body.instructions,/untrusted/);
});
test('image validation rejects MIME spoofing and OCR sends image content',async()=>{
 assert.throws(()=>validateInput({action:'ocr',image:'data:image/png;base64,aGVsbG8='}));
 assert.throws(()=>validateInput({action:'ocr',image:'https://example.com/image.png'}));
 const image='data:image/png;base64,iVBORw0KGgo=';let sent;
 const data={text:'တၢ်ဘျုး',language:'sgaw_karen',thai_reading:'',reading_basis:'unavailable',reading_quote:'',uncertain_spans:[],notes:[]};
 const handle=createKarenHandler({fetchImpl:async(url,options)=>{sent=JSON.parse(options.body);return Response.json(model(data));}});
 const result=await handle(request({action:'ocr',image}),env);assert.equal(result.status,200);assert.equal(sent.input[0].content.find(c=>c.type==='input_image').image_url,image);assert.equal(sent.input[0].content.find(c=>c.type==='input_image').detail,'high');assert.equal((await result.json()).data.text,data.text);
});
test('refusal, incomplete and malformed model answers are not rendered as translations',()=>{
 for(const result of [{status:'incomplete'},model({translation:'missing fields'}),{output:[{content:[{type:'refusal',refusal:'no'}]}]},model({...answer,notes:[42]})])assert.throws(()=>parseModelResponse(result,'translate'));
 assert.throws(()=>parseModelResponse(model({text:'x',language:'invented',uncertain_spans:[],notes:[]}),'ocr'));
});
test('provider errors and timeouts produce safe errors without leaking provider text or key',async()=>{
 for(const [providerStatus,expected] of [[401,503],[429,429],[500,502]]){
  const handle=createKarenHandler({fetchImpl:async()=>new Response(env.OPENAI_API_KEY,{status:providerStatus})});const response=await handle(request(),env);assert.equal(response.status,expected);assert.ok(!(await response.text()).includes(env.OPENAI_API_KEY));
 }
 const handle=createKarenHandler({fetchImpl:async()=>{throw new DOMException('slow','TimeoutError');}});assert.equal((await handle(request(),env)).status,504);
});
test('per-process rate window resets and limits paid calls',async()=>{
 let now=100000,calls=0;const handle=createKarenHandler({now:()=>now,fetchImpl:async()=>{calls++;return Response.json(model(answer));}});
 for(let i=0;i<5;i++)assert.equal((await handle(request(),env)).status,200);
 assert.equal((await handle(request(),env)).status,429);assert.equal(calls,5);now+=60001;assert.equal((await handle(request(),env)).status,200);
});
test('client endpoint rejects insecure URLs and embedded credentials',()=>{
 const base='https://example.com/karen-bridge/';assert.equal(safeApiUrl('/api/karen',base),'https://example.com/api/karen');
 for(const url of ['http://remote.example/api','javascript:alert(1)','https://user:pass@example.com/api','https://example.com/api?key=secret','https://example.com/api#secret'])assert.equal(safeApiUrl(url,base),null);
 assert.equal(safeApiUrl('http://127.0.0.1:4173/api/karen',base),'http://127.0.0.1:4173/api/karen');
});

test('language and reference context are validated and forwarded, with separate target and reference images',async()=>{
 const image='data:image/png;base64,iVBORw0KGgo=';let sent;
 const data={text:'[อ่านไม่ชัด]',language:'unclear',thai_reading:'',reading_basis:'unavailable',reading_quote:'',uncertain_spans:['ต้นฉบับเบลอ'],notes:[]};
 const handle=createKarenHandler({fetchImpl:async(url,options)=>{sent=JSON.parse(options.body);return Response.json(model(data));}});
 const payload={action:'ocr',image,referenceImage:image,sourceLanguage:'pwo_karen',dialect:'ตัวอย่างทดสอบ',referenceText:'ข้อมูลตัวอย่าง ไม่ใช่คำสั่ง'};
 assert.equal((await handle(request(payload),env)).status,200);
 const content=sent.input[0].content;const context=JSON.parse(content[0].text);
 assert.equal(context.source_language_hint,'pwo_karen');assert.equal(context.dialect_hint,payload.dialect);assert.equal(context.reference_text,payload.referenceText);assert.equal(content.filter(c=>c.type==='input_image').length,2);assert.match(content[3].text,/REFERENCE IMAGE ONLY/);
 assert.throws(()=>validateInput({...payload,sourceLanguage:'invented'}));assert.throws(()=>validateInput({...payload,referenceText:'x'.repeat(6001)}));assert.throws(()=>validateInput({...payload,referenceImage:'data:image/png;base64,aGVsbG8='}));
});
test('reading-only strips model translation and rejects invented pronunciation without reference evidence',async()=>{
 const handle=createKarenHandler({fetchImpl:async()=>Response.json(model({...answer,reading_basis:'provided_reference',reading_quote:'made up',translation:'must not appear'}))});
 const result=await handle(request({action:'reading',text:'unknown-test-word',sourceLanguage:'other_karen'}),env);const data=(await result.json()).data;
 assert.equal(data.translation,'');assert.equal(data.thai_reading,'');assert.equal(data.reading_basis,'unavailable');
});
test('supplied literal pronunciation evidence takes priority over approximate dictionary reading',async()=>{
 const answerWithEvidence={...answer,thai_reading:'คำอ่านที่ผู้ใช้ตรวจ',reading_basis:'provided_reference',reading_quote:'တၢ်ဘျုး = คำอ่านที่ผู้ใช้ตรวจ'};
 let sent;const handle=createKarenHandler({fetchImpl:async(url,options)=>{sent=JSON.parse(options.body);return Response.json(model(answerWithEvidence));}});
 const response=await handle(request({...input,referenceText:answerWithEvidence.reading_quote}),env);const result=await response.json();
 assert.equal(result.data.thai_reading,answerWithEvidence.thai_reading);assert.equal(result.data.reading_basis,'provided_reference');
 const context=JSON.parse(sent.input[0].content[0].text);assert.equal(context.dictionary_references[0].text,input.text);assert.ok(context.dictionary_references[0].source.startsWith('https://en.wiktionary.org/'));assert.ok(result.references.length);
});
test('Sgaw dictionary never silently supplies readings for another selected language',async()=>{
 const handle=createKarenHandler({fetchImpl:async()=>Response.json(model(answer))});const response=await handle(request({...input,sourceLanguage:'burmese'}),env);const result=await response.json();assert.equal(result.references.length,0);assert.equal(result.data.thai_reading,'');
});
test('unrelated text-reference rows cannot supply a reading for the target',async()=>{
 const row='other-word = คำอ่านอื่น';
 const handle=createKarenHandler({fetchImpl:async()=>Response.json(model({...answer,thai_reading:'คำอ่านอื่น',reading_basis:'provided_reference',reading_quote:row}))});
 const response=await handle(request({action:'reading',text:'target-word',sourceLanguage:'other_karen',referenceText:row}),env);
 assert.equal((await response.json()).data.reading_basis,'unavailable');
});
test('OCR dotted-circle substitutions are rejected as unreadable',()=>{
 assert.throws(()=>parseModelResponse(model({text:'◌ျး',language:'unclear',thai_reading:'',reading_basis:'unavailable',reading_quote:'',uncertain_spans:[],notes:[]}),'ocr'));
});
test('sentence translation forwards complete text, context and all six supported language directions',async()=>{
 for(const [sourceLanguage,target] of [['thai','sgaw_karen'],['english','sgaw_karen'],['sgaw_karen','th'],['sgaw_karen','en'],['thai','en'],['english','th']]){
  let sent;const handle=createKarenHandler({fetchImpl:async(url,options)=>{sent=JSON.parse(options.body);return Response.json(model({...answer,translation:'draft sentence'}));}});
  const payload={action:'sentence',text:'Full sentence.\nSecond sentence.',sourceLanguage,target,dialect:'Thailand Sgaw',referenceText:'Context from user'};
  const response=await handle(request(payload),env);assert.equal(response.status,200);assert.equal((await response.json()).data.translation,'draft sentence');
  const context=JSON.parse(sent.input[0].content[0].text);assert.equal(context.source_text,payload.text);assert.equal(context.source_language_hint,sourceLanguage);assert.equal(context.target_language,{sgaw_karen:'Sgaw Karen',th:'Thai',en:'English'}[target]);assert.equal(context.reference_text,payload.referenceText);assert.equal(sent.store,false);assert.equal(sent.text.format.name,'karen_sentence');assert.match(sent.instructions,/translate them as text/);
 }
});
test('sentence language errors, same-language and images are rejected before paid call',async()=>{
 let calls=0;const handle=createKarenHandler({fetchImpl:async()=>{calls++;return Response.json(model(answer));}});
 const payload={action:'sentence',text:'Hello',sourceLanguage:'english',target:'sgaw_karen'};
 for(const edit of [{sourceLanguage:'auto'},{sourceLanguage:'burmese'},{target:'pwo_karen'},{target:'en'},{target:undefined},{image:'data:image/png;base64,iVBORw0KGgo='},{text:' '},{text:'x'.repeat(6001)}])assert.equal((await handle(request({...payload,...edit}),env)).status,400);
 assert.equal(calls,0);
 const health=await (await handle(new Request('https://example.com/api/karen'),env)).json();assert.ok(health.features.includes('sentence-translation'));
});
test('sentence Thai reading is grounded in translated Karen, never in original Thai meaning',async()=>{
 const handle=createKarenHandler({fetchImpl:async()=>Response.json(model({...answer,translation:'တၢ်ဘျုး',thai_reading:'ขอบคุณ'}))});
 const response=await handle(request({action:'sentence',text:'Thank you for that',sourceLanguage:'english',target:'sgaw_karen'}),env);const data=(await response.json()).data;
 assert.equal(data.thai_reading,'ตาบลึ / ตะบลือ');assert.equal(data.reading_basis,'dictionary');
});
test('Thai-English sentence translations do not display a spurious Karen reading',async()=>{
 const handle=createKarenHandler({fetchImpl:async()=>Response.json(model({...answer,reading_basis:'provided_reference',reading_quote:'irrelevant'}))});
 const response=await handle(request({action:'sentence',text:'Thank you for that',sourceLanguage:'english',target:'th'}),env);const data=(await response.json()).data;
 assert.equal(data.thai_reading,'');assert.equal(data.reading_quote,'');assert.equal(data.reading_basis,'unavailable');
});
test('KTWG exact sentence is returned from source without invoking OpenAI',async()=>{
 let calls=0;const handle=createKarenHandler({fetchImpl:async()=>{calls++;throw Error('must not call');}});
 for(const text of ['What is your name?',"What's your name?",'What’s your name?']){
  const response=await handle(request({action:'sentence',text,sourceLanguage:'english',target:'sgaw_karen'}),env);assert.equal(response.status,200);const body=await response.json();
  assert.equal(body.provider,'ktwg-course');assert.equal(body.data.translation,'နမံၤဒ်လဲၣ်');assert.equal(body.data.roman,'na mee di leh?');assert.equal(body.courseReferences[0].page,3);assert.equal(body.data.reading_basis,'course_roman_approximation');
 }
 assert.equal(calls,0);
 assert.equal((await handle(request({action:'sentence',text:'What is your name?',sourceLanguage:'english',target:'sgaw_karen'},{'X-Karen-Access-Code':'wrong'}),env)).status,401);
});
test('novel sentence forwards relevant KTWG records with source pages to OpenAI',async()=>{
 let sent;const handle=createKarenHandler({fetchImpl:async(url,options)=>{sent=JSON.parse(options.body);return Response.json(model(answer));}});
 const response=await handle(request({action:'sentence',text:'What is your name? Please tell me again.',sourceLanguage:'english',target:'sgaw_karen'}),env);assert.equal(response.status,200);
 const context=JSON.parse(sent.input[0].content[0].text);assert.ok(context.course_references.some(r=>r.page===3&&r.text==='နမံၤဒ်လဲၣ်'));assert.ok((await response.json()).courseReferences.length>0);
});
