import {safeApiUrl} from './image-translate.js';
import {exactCourseTranslation} from './course.js';
import {prepareDrum,exactDrumTranslation} from './drum.js';
const labels={sgaw_karen:'ปกาเกอะญอ / กะเหรี่ยงสะกอ',th:'ภาษาไทย',en:'English'};
const sourceToTarget={sgaw_karen:'sgaw_karen',thai:'th',english:'en'};
const targetToSource={sgaw_karen:'sgaw_karen',th:'thai',en:'english'};
const $=id=>document.getElementById(id);
function node(tag,cls,text){const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;}
export function initSentenceTranslation(){
 let endpoint=null,ready=false,busy=false,controller=null,revision=0,result=null,healthRevision=0,course=null,drum=null;
 const status=text=>$('sentence-status').textContent=text;
 function update(){
  const text=$('sentence-text').value;
  $('sentence-count').textContent=`${text.length.toLocaleString('en')} / 6,000`;
  $('sentence-submit').disabled=(!ready&&!course&&!drum)||busy||!text.trim();
  $('sentence-cancel').hidden=!busy;
  $('sentence-result').setAttribute('aria-busy',String(busy));
  $('sentence-copy').disabled=!result?.translation;
  $('sentence-text').lang={thai:'th',english:'en',sgaw_karen:'ksw'}[$('sentence-source').value];
 }
 function invalidate(){revision++;controller?.abort();controller=null;busy=false;result=null;$('sentence-result').replaceChildren(node('p','small','คำแปลทั้งประโยคจะปรากฏที่นี่'));update();}
 function render(data,target,body={}){
  const panel=$('sentence-result');panel.replaceChildren(node('span','resource-tag',body.provider==='ktwg-course'?'ตรงกับบทเรียน KTWG · ไม่เรียก AI':body.provider==='drum-glossary'?'ตรงกับฐาน DRUM · ไม่เรียก AI':'คำแปลจาก AI · ฉบับร่าง'));
  panel.append(node('h3','',labels[target]));
  const translation=node('p','ai-translation',data.translation||'ยังแปลประโยคนี้ไม่ได้ ลองเพิ่มบริบทหรือแบ่งประโยค');translation.lang=target==='sgaw_karen'?'ksw':target;panel.append(translation);
  const karenSide=target==='sgaw_karen'||$('sentence-source').value==='sgaw_karen';
  if(data.roman&&karenSide)panel.append(node('p','roman','คำอ่านโรมันตามบทเรียน: '+data.roman));
  if(data.alternatives?.length){panel.append(node('h3','','รูปแบบอื่นที่พบในบทเรียน'));for(const alternative of data.alternatives)panel.append(node('p','ai-translation',alternative));}
  if(karenSide){
   panel.append(node('h3','',target==='sgaw_karen'?'คำอ่านไทยของคำแปลกะเหรี่ยง':'คำอ่านไทยของต้นฉบับกะเหรี่ยง'));
   panel.append(node('p','ai-reading',data.thai_reading||'ยังไม่มีหลักฐานคำอ่านไทยสำหรับประโยคนี้'));
   if(data.thai_reading)panel.append(node('p','small',data.reading_basis==='drum_approximation'?'คำอ่านไทยทดลองตามคู่มือ DRUM · ไม่ใช่คำอ่านไทยใน PDF':data.reading_basis==='course_roman_approximation'?'โครงการถอดจากโรมันโดยประมาณ · ไม่ใช่คำอ่านไทยใน PDF':data.reading_basis==='dictionary'?'จากพจนานุกรม · โดยประมาณ ยังไม่ได้ตรวจสำเนียง':'AI เทียบข้อความอ้างอิง · ยังต้องตรวจโดยเจ้าของภาษา'));
   if(data.reading_quote)panel.append(node('p','small','ข้อความอ้างอิง: '+data.reading_quote));
  }
  const notes=[...data.uncertain_spans.map(s=>'ส่วนที่ไม่แน่ใจ: '+s),...data.notes];
  if(notes.length){const list=document.createElement('ul');list.className='ai-notes';for(const text of notes)list.append(node('li','',text));panel.append(list);}
  if(body.courseReferences?.length){
   panel.append(node('h3','',['ktwg-course','drum-glossary'].includes(body.provider)?'แหล่งข้อมูลที่ตรงกัน':'บทเรียนที่ส่งให้ AI ประกอบ (อาจไม่ครอบคลุมทั้งประโยค)'));
   const seen=new Set();for(const ref of body.courseReferences){if(seen.has(ref.id))continue;seen.add(ref.id);const a=node('a','course-source',`${ref.sourceLabel||'KTWG'} หน้า ${ref.sourcePages?.join(', ')||ref.page} · ${ref.english}`);a.href=ref.source;a.target='_blank';a.rel='noopener noreferrer';panel.append(a);}
  }
 }
 async function submit(event){
  event.preventDefault();if(busy)return;
  const text=$('sentence-text').value.trim(),sourceLanguage=$('sentence-source').value,target=$('sentence-target').value;
  if(!text||text.length>6000){status('กรุณาใส่ประโยคไม่เกิน 6,000 ตัวอักษร');return;}
  if(sourceToTarget[sourceLanguage]===target){status('กรุณาเลือกภาษาต้นทางและปลายทางต่างกัน');return;}
  const direct=(course&&exactCourseTranslation(course,text,sourceLanguage,target))||(drum&&exactDrumTranslation(drum,text,sourceLanguage,target));
  if(direct){invalidate();result=direct.data;render(result,target,direct);update();status('พบในฐาน '+(direct.provider==='ktwg-course'?'KTWG':'DRUM')+' — ค้นในเครื่อง ไม่ส่งข้อความออกและไม่ใช้โควตา API');return;}
  if(!ready||!endpoint){status('ไม่พบคำแปลตรงตัวในบทเรียน และบริการ AI ยังไม่พร้อม');return;}
  if(!$('sentence-consent').checked){status('โปรดยืนยันการส่งข้อความให้ OpenAI');$('sentence-consent').focus();return;}
  const access=$('sentence-access').value;
  if(!access){status('กรุณาใส่รหัสเข้าใช้บริการ AI เดิมของคุณ');$('sentence-access').focus();return;}
  const payload={action:'sentence',text,sourceLanguage,target,dialect:$('sentence-dialect').value,referenceText:$('sentence-reference').value};
  invalidate();const version=revision;controller=new AbortController();const current=controller;busy=true;update();status('กำลังแปลทั้งประโยค…');
  const timeout=setTimeout(()=>current.abort(),65000);
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-Karen-Access-Code':access},body:JSON.stringify(payload),signal:current.signal,credentials:'omit',redirect:'error'});
   let body;try{body=await response.json();}catch{throw Error('บริการส่งคำตอบไม่ถูกต้อง กรุณาลองใหม่');}
   if(version!==revision)return;
   if(!response.ok)throw Error(typeof body.error==='string'?body.error:'แปลไม่สำเร็จ กรุณาลองใหม่');
   const data=body.data;
   if(!data||typeof data.translation!=='string'||typeof data.thai_reading!=='string'||!Array.isArray(data.notes)||!Array.isArray(data.uncertain_spans))throw Error('รูปแบบคำตอบไม่ถูกต้อง');
   result=data;render(data,target,body);status('แปลแล้ว — ตรวจความหมายและส่วนที่ไม่แน่ใจก่อนใช้');
  }catch(error){if(version===revision)status(error.name==='AbortError'?'หมดเวลารอผล กรุณาลองใหม่หรือแบ่งประโยค':error.message||'เชื่อมต่อไม่ได้');}
  finally{clearTimeout(timeout);if(version===revision){busy=false;controller=null;update();}}
 }
 async function checkService(){
  const version=++healthRevision;ready=false;update();$('sentence-service').textContent='กำลังตรวจการเชื่อมต่อ…';
  try{
   const response=await fetch('./api-config.json',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('ยังไม่มีการตั้งค่าบริการ AI');
   const config=await response.json();const url=safeApiUrl(config.apiUrl,location.href);if(!url)throw Error('ยังไม่ได้เชื่อมต่อบริการ AI');
   const healthResponse=await fetch(url,{cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(10000)});
   if(!healthResponse.ok)throw Error('เชื่อมต่อไม่ได้ กรุณาตรวจ URL และ ALLOWED_ORIGINS');
   const health=await healthResponse.json();if(version!==healthRevision)return;
   endpoint=url;ready=health.ready===true&&health.features?.includes('drum-glossary')===true;
   $('sentence-service').textContent=!health.ready?'บริการ AI ยังไม่ได้ตั้งค่า':ready?'API พร้อมใช้งาน · ค้นฐาน KTWG และ DRUM ประกอบแล้ว':'เซิร์ฟเวอร์ยังไม่มีฐาน DRUM รออัปเดตแล้วกดตรวจอีกครั้ง';
  }catch(error){if(version===healthRevision)$('sentence-service').textContent=error.message||'บริการ AI ยังไม่พร้อม';}
  if(version===healthRevision)update();
 }
 $('sentence-form').addEventListener('submit',submit);
 for(const id of ['sentence-text','sentence-dialect','sentence-reference'])$(id).addEventListener('input',()=>{invalidate();status('');});
 for(const id of ['sentence-source','sentence-target'])$(id).addEventListener('change',()=>{invalidate();status('');});
 $('sentence-access').addEventListener('input',()=>{if(busy){invalidate();status('เปลี่ยนรหัสแล้ว กรุณากดแปลใหม่');}});
 $('sentence-consent').addEventListener('change',()=>{if(!$('sentence-consent').checked){invalidate();status('ยกเลิกการยินยอมแล้ว คำขอที่ส่งไปก่อนหน้าอาจยังประมวลผลอยู่');}});
 $('sentence-swap').onclick=()=>{const source=$('sentence-source').value,target=$('sentence-target').value,text=result?.translation||'';$('sentence-source').value=targetToSource[target];$('sentence-target').value=sourceToTarget[source];$('sentence-text').value=text.slice(0,6000);invalidate();status(text?'นำคำแปลมาเป็นต้นฉบับแล้ว ตรวจข้อความก่อนแปลกลับ':'สลับภาษาแล้ว กรุณาใส่ประโยคต้นทาง');};
 $('sentence-clear').onclick=()=>{$('sentence-text').value='';invalidate();status('');$('sentence-text').focus();};
 $('sentence-cancel').onclick=()=>{invalidate();status('หยุดรอผลแล้ว คำขอที่ส่งไปอาจยังประมวลผลและมีค่าใช้จ่าย');};
 $('sentence-copy').onclick=async()=>{if(!result?.translation)return;try{await navigator.clipboard.writeText(result.translation);status('คัดลอกคำแปลแล้ว');}catch{status('คัดลอกไม่ได้ กรุณาเลือกข้อความและคัดลอกเอง');}};
 $('sentence-check').onclick=checkService;
 window.addEventListener('pagehide',()=>{controller?.abort();$('sentence-access').value='';});
 invalidate();checkService();
 Promise.all(['general','medical'].map(kind=>fetch(`./data/drum-${kind}.json`).then(r=>{if(!r.ok)throw Error();return r.json();}))).then(([g,m])=>{drum=prepareDrum(g,m);$('sentence-drum-status').textContent=`ฐาน DRUM พร้อมค้น · ${drum.entries.filter(e=>!e.needsReview).length} รายการพร้อมใช้ · ทั่วไปและศัพท์แพทย์`;update();}).catch(()=>{$('sentence-drum-status').textContent='โหลดฐาน DRUM ไม่สำเร็จ กรุณารีโหลด';});
 fetch('./data/ktwg-course.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{course=data;$('sentence-course-status').textContent=`ฐาน KTWG พร้อมค้น · ${data.entries.filter(e=>!e.needsReview).length} รายการพร้อมใช้ / ${data.meta.entryCount} รายการ จาก ${data.meta.pageCount} หน้า · รายการตรงตัวไม่ต้องใช้รหัสหรือ API` ;update();}).catch(()=>{$('sentence-course-status').textContent='โหลดฐาน KTWG ไม่สำเร็จ กรุณารีโหลด';});
}
