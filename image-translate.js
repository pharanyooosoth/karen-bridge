// Images stay local until an explicit request. Only reference notes can be saved locally.
const INPUT_LIMIT=10*1024*1024,OUTPUT_LIMIT=1.25*1024*1024,MAX_SIDE=2200,MAX_TEXT=6000;
const $=id=>document.getElementById(id);
export function safeApiUrl(value,base){
 if(typeof value!=='string'||!value)return null;
 try{const url=new URL(value,base);const local=['localhost','127.0.0.1'].includes(url.hostname);if(url.username||url.password||url.search||url.hash)return null;if(url.protocol!=='https:'&&!(local&&url.protocol==='http:'))return null;return url.href;}catch{return null;}
}
function node(tag,className,text){const element=document.createElement(tag);if(className)element.className=className;if(text!==undefined)element.textContent=text;return element;}
export async function prepareImage(file){
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('รองรับ JPG, PNG และ WebP กรุณาแปลง HEIC/PDF เป็นภาพก่อน');
 if(file.size>INPUT_LIMIT)throw Error('ภาพต้นฉบับต้องไม่เกิน 10 MB');
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();image.src=url;await image.decode();
  const scale=Math.min(1,MAX_SIDE/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('เบราว์เซอร์ไม่รองรับเตรียมภาพ');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  // Keep small text lossless when it fits; never upscale and claim recovered detail.
  let dataUrl=canvas.toDataURL('image/png');
  if(dataUrl.length*3/4>OUTPUT_LIMIT)dataUrl=canvas.toDataURL('image/jpeg',.94);
  if(dataUrl.length*3/4>OUTPUT_LIMIT)throw Error('ภาพยังใหญ่เกินไป กรุณาแบ่งภาพ โดยเก็บอักษรและเครื่องหมายเสียงให้ครบ');
  return {dataUrl,width:canvas.width,height:canvas.height,resized:scale<1,small:image.naturalWidth<320||image.naturalHeight<100};
 }finally{URL.revokeObjectURL(url);}
}
export function initImageTranslation({onDictionaryLookup}){
 let endpoint=null,ready=false,image=null,referenceImage=null,busy=false,controller=null,revision=0,translated=null;
 const preparing={target:false,reference:false},tokens={target:0,reference:0};
 const status=message=>$('image-status').textContent=message;
 function clearTranslation(){translated=null;$('ai-result').replaceChildren();$('ai-copy').disabled=true;$('ai-download').disabled=true;}
 function update(){
  const loading=preparing.target||preparing.reference;
  $('ocr-start').disabled=!ready||!image||busy||loading;
  $('ai-translate').disabled=!ready||!$('ocr-text').value.trim()||busy||loading;
  $('image-cancel').hidden=!busy;$('image-target').disabled=busy||$('image-mode').value==='reading';
  $('ai-translate').textContent=$('image-mode').value==='reading'?'หาคำอ่านจากหลักฐาน ↗':'แปลข้อความพร้อมคำอ่าน ↗';
  $('ocr-text-count').textContent=`${$('ocr-text').value.length.toLocaleString('en')} / 6,000`;
  $('ocr-dictionary').disabled=!$('ocr-text').value.trim()||busy||$('image-source-language').value!=='sgaw_karen';
 }
 function invalidate(){revision++;controller?.abort();controller=null;busy=false;clearTranslation();update();}
 function resetImage(){tokens.target++;preparing.target=false;invalidate();image=null;$('image-file').value='';$('image-preview').removeAttribute('src');$('image-preview').hidden=true;$('image-empty').hidden=false;$('image-name').textContent='';$('ocr-text').value='';$('ocr-info').replaceChildren();$('image-consent').checked=false;status('เลือกรูปข้อความและภาษาต้นทาง');update();}
 function clearReference(){tokens.reference++;preparing.reference=false;referenceImage=null;invalidate();$('ocr-info').replaceChildren();$('reference-file').value='';$('reference-preview').removeAttribute('src');$('reference-preview').hidden=true;$('reference-name').textContent='';$('image-consent').checked=false;}
 function notes(container,items){if(!items?.length)return;const list=node('ul','ai-notes');for(const item of items)list.append(node('li','',item));container.append(list);}
 function showReading(container,data){
  container.append(node('h3','','คำอ่านภาษาไทย'));
  container.append(node('p','ai-reading',data.thai_reading||'ยังระบุคำอ่านจากหลักฐานไม่ได้'));
  const basis={dictionary:'จากพจนานุกรมโครงการ · คำอ่านโดยประมาณ ยังไม่ยืนยันสำเนียง',provided_reference:'AI เทียบกับข้อมูลอ้างอิง · ต้องตรวจว่าเป็นแถวเดียวกับต้นฉบับ',unavailable:'ไม่สร้างคำอ่านเดาเมื่อหลักฐานไม่พอ'};
  container.append(node('p','small',basis[data.reading_basis]||basis.unavailable));
  if(data.reading_quote)container.append(node('p','small','หลักฐานที่ AI ใช้: '+data.reading_quote));
 }
 async function selectFile(file,kind='target'){
  if(kind==='target')resetImage();else clearReference();if(!file)return;
  const token=++tokens[kind];preparing[kind]=true;status('กำลังเตรียมภาพในเครื่อง…');update();
  try{
   const prepared=await prepareImage(file);if(token!==tokens[kind])return;
   const preview=$(kind==='target'?'image-preview':'reference-preview');preview.src=prepared.dataUrl;preview.hidden=false;
   if(kind==='target'){image=prepared.dataUrl;$('image-empty').hidden=true;}else referenceImage=prepared.dataUrl;
   $(kind==='target'?'image-name':'reference-name').textContent=`${file.name} · ${prepared.width} × ${prepared.height}${prepared.resized?' · ย่อขนาดแล้ว':''}${prepared.small?' · ภาพเล็ก อักษรอาจอ่านผิด ควรใช้ต้นฉบับชัดและแนบตารางเต็ม':''}`;
   status('ภาพพร้อมแล้ว ยังไม่ได้ส่งออกจากเครื่อง');
  }catch(error){if(token===tokens[kind])status(error.message||'เปิดภาพไม่ได้');}
  finally{if(token===tokens[kind]){preparing[kind]=false;update();}}
 }
 async function submit(action){
  if(!ready||!endpoint){status('บริการ AI ยังไม่พร้อม');return;}
  if(!$('image-consent').checked){status('โปรดยืนยันการส่งภาพต้นทาง ภาพอ้างอิง และข้อความที่กรอกไปให้ OpenAI');$('image-consent').focus();return;}
  const access=$('image-access-code').value;
  if(!access){status('กรุณาใส่รหัสเข้าใช้ที่ได้รับจากเจ้าของเว็บไซต์');$('image-access-code').focus();return;}
  if(action==='ocr'&&!image)return;
  const text=$('ocr-text').value.trim();if(action!=='ocr'&&(!text||text.length>MAX_TEXT)){status('กรุณาตรวจข้อความ ไม่เกิน 6,000 ตัวอักษร');return;}
  const payload={action,sourceLanguage:$('image-source-language').value,dialect:$('image-dialect').value,referenceText:$('reference-text').value};
  if(image)payload.image=image;if(referenceImage)payload.referenceImage=referenceImage;
  const target=$('image-target').value;
  if(action!=='ocr')Object.assign(payload,{text,target});
  invalidate();const version=revision;controller=new AbortController();const currentController=controller;busy=true;update();
  status(action==='ocr'?'กำลังอ่านภาพโดยเทียบภาษาและข้อมูลอ้างอิง…':action==='reading'?'กำลังหาคำอ่านจากหลักฐาน…':'กำลังแปลข้อความที่ตรวจแล้ว…');
  const timeout=setTimeout(()=>currentController.abort(),65000);
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-Karen-Access-Code':access},body:JSON.stringify(payload),signal:currentController.signal,credentials:'omit',redirect:'error'});
   let result;try{result=await response.json();}catch{throw Error('บริการส่งคำตอบไม่ถูกต้อง กรุณาติดต่อเจ้าของเว็บไซต์');}
   if(version!==revision)return;
   if(!response.ok)throw Error(typeof result.error==='string'?result.error:'บริการ AI ไม่สำเร็จ');
   const data=result.data;if(!data||typeof data!=='object')throw Error('ไม่พบผลลัพธ์จาก AI');
   if(action==='ocr'){
    if(typeof data.text!=='string'||data.text.length>MAX_TEXT)throw Error('ข้อความยาวเกินกำหนด กรุณาแบ่งภาพ');
    $('ocr-text').value=data.text;
    $('ocr-info').replaceChildren(node('p','small','ข้อความที่ AI อ่านได้ · ตรวจอักษรและเครื่องหมายกับภาพก่อนใช้'));
    const languages={sgaw_karen:'กะเหรี่ยงสะกอ',pwo_karen:'กะเหรี่ยงโปว์',other_karen:'กะเหรี่ยงภาษาอื่น',burmese:'พม่า',thai:'ไทย',english:'อังกฤษ',other:'ภาษาอื่น',unclear:'ยังระบุไม่ได้'};
    $('ocr-info').append(node('p','small','ภาษาที่ AI ประเมิน: '+(languages[data.language]||'ยังระบุไม่ได้')));
    showReading($('ocr-info'),data);notes($('ocr-info'),data.uncertain_spans?.map(s=>'อ่านไม่แน่ใจ: '+s));notes($('ocr-info'),data.notes);
    status(data.text?'อ่านภาพแล้ว — ตรวจแก้ข้อความและคำอ่านกับต้นฉบับ':'ยังอ่านไม่ได้ ลองภาพต้นฉบับที่ชัดกว่าและตารางอ้างอิง');
   }else{
    if(typeof data.translation!=='string'||typeof data.thai_reading!=='string')throw Error('รูปแบบคำตอบไม่ถูกต้อง');
    translated={source:text,target,action,...data};
    const panel=$('ai-result');panel.replaceChildren(node('span','resource-tag','ผลช่วยอ่าน · ยังไม่ได้ตรวจโดยเจ้าของภาษา'));
    showReading(panel,data);
    if(action==='translate')panel.append(node('h3','',target==='th'?'คำแปลภาษาไทยฉบับร่าง':'English translation draft'),node('p','ai-translation',data.translation||'ยังแปลส่วนนี้ไม่ได้'));
    notes(panel,data.uncertain_spans?.map(s=>'ไม่แน่ใจ: '+s));notes(panel,data.notes);
    if(result.references?.length){panel.append(node('h3','','รายการพจนานุกรมที่ส่งให้ API'));for(const ref of result.references){const a=node('a','small',ref.text+' · ที่มา');a.href=ref.source;a.target='_blank';a.rel='noopener noreferrer';panel.append(a,node('br'));}}
    $('ai-copy').disabled=!(data.thai_reading||data.translation);$('ai-download').disabled=false;status('เสร็จแล้ว — ตรวจคำอ่านและหลักฐานก่อนนำไปใช้');
   }
  }catch(error){if(version===revision)status(error.name==='AbortError'?'คำขอหมดเวลาหรือถูกยกเลิก ลองแบ่งภาพ':error.message||'เชื่อมต่อไม่ได้');}
  finally{clearTimeout(timeout);if(version===revision){busy=false;controller=null;update();}}
 }
 $('image-file').onchange=e=>selectFile(e.target.files?.[0]);
 $('reference-file').onchange=e=>selectFile(e.target.files?.[0],'reference');
 const drop=$('image-drop');drop.ondragover=e=>{e.preventDefault();drop.classList.add('dragging');};drop.ondragleave=()=>drop.classList.remove('dragging');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('dragging');selectFile(e.dataTransfer.files?.[0]);};
 $('image-clear').onclick=resetImage;
 $('reference-clear').onclick=()=>{clearReference();$('ocr-info').replaceChildren();status('ล้างภาพอ้างอิงแล้ว');};
 $('image-cancel').onclick=()=>{invalidate();status('ยกเลิกการรอผลแล้ว หากส่งไปแล้วบริการอาจประมวลผลต่อและคิดค่าใช้จ่าย');};
 $('ocr-start').onclick=()=>submit('ocr');$('ai-translate').onclick=()=>submit($('image-mode').value);
 $('ocr-text').oninput=()=>{invalidate();$('ocr-info').replaceChildren();status('แก้ไขข้อความแล้ว ผลคำอ่านเดิมถูกล้าง กรุณาหาคำอ่านใหม่');};
 for(const id of ['image-source-language','image-dialect','reference-text'])$(id).addEventListener(id==='image-source-language'?'change':'input',()=>{if(id==='image-source-language'&&$('image-source-language').value!=='sgaw_karen'&&$('image-dialect').value==='ปกาเกอะญอ / กะเหรี่ยงสะกอในประเทศไทย')$('image-dialect').value='';invalidate();$('ocr-info').replaceChildren();status('เปลี่ยนภาษาหรือหลักฐานแล้ว กรุณาอ่านภาพหรือหาคำอ่านใหม่');});
 for(const id of ['image-target','image-mode'])$(id).onchange=()=>{invalidate();};
 $('ocr-dictionary').onclick=()=>onDictionaryLookup($('ocr-text').value);
 $('ai-copy').onclick=async()=>{if(!translated)return;try{await navigator.clipboard.writeText([translated.thai_reading,translated.action==='translate'?translated.translation:''].filter(Boolean).join('\n'));status('คัดลอกผลลัพธ์แล้ว');}catch{status('คัดลอกไม่ได้ กรุณาเลือกข้อความเพื่อคัดลอกเอง');}};
 $('ai-download').onclick=()=>{if(!translated)return;const blob=new Blob([JSON.stringify({...translated,draft:true},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=node('a');a.href=url;a.download='karen-reading-result.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const referenceKey='karen-bridge:reference-notes:v1';
 try{const saved=localStorage.getItem(referenceKey);if(saved&&saved.length<=6000)$('reference-text').value=saved;}catch{}
 $('reference-save').onclick=()=>{try{localStorage.setItem(referenceKey,$('reference-text').value);status('บันทึกเฉพาะข้อความอ้างอิงในเบราว์เซอร์เครื่องนี้แล้ว ไม่ได้บันทึกภาพหรือรหัส');}catch{status('บันทึกไม่ได้ เบราว์เซอร์ปิดกั้นพื้นที่เก็บข้อมูล');}};
 $('reference-forget').onclick=()=>{try{localStorage.removeItem(referenceKey);$('reference-text').value='';invalidate();$('ocr-info').replaceChildren();status('ลบข้อความอ้างอิงที่บันทึกแล้ว');}catch{status('ลบไม่ได้ กรุณาตรวจสิทธิ์พื้นที่เก็บข้อมูลของเบราว์เซอร์');}};
 $('image-check-service').onclick=checkService;
 async function checkService(){
  ready=false;update();$('image-service-status').textContent='กำลังตรวจการเชื่อมต่อ…';
  try{
   const configResponse=await fetch('./api-config.json',{cache:'no-store'});if(!configResponse.ok)throw Error('ยังไม่มีการตั้งค่าบริการ AI');
   const config=await configResponse.json();endpoint=safeApiUrl(config.apiUrl,location.href);
   if(!endpoint)throw Error('ยังไม่ได้เชื่อมต่อบริการ AI — ค้นพจนานุกรมได้');
   const response=await fetch(endpoint,{signal:AbortSignal.timeout(10000),credentials:'omit',redirect:'error',cache:'no-store'});
   if(!response.ok)throw Error('เชื่อมต่อบริการ AI ไม่ได้ กรุณาตรวจ URL และ ALLOWED_ORIGINS');
   const health=await response.json();ready=health.ready===true&&health.apiVersion>=2;
   $('image-service-status').textContent=health.apiVersion<2||!health.apiVersion?'เซิร์ฟเวอร์ยังเป็นรุ่นเดิม รอ Vercel deploy รุ่นใหม่แล้วกดตรวจอีกครั้ง':ready?'เชื่อมต่อแล้ว · รองรับภาษาต้นทาง ภาพอ้างอิง และโหมดคำอ่าน':'บริการ AI ยังไม่ได้ตั้งค่าคีย์หรือรหัสเข้าใช้';
  }catch(error){$('image-service-status').textContent=error.message||'บริการ AI ยังไม่พร้อม';}
  update();
 }
 window.addEventListener('pagehide',()=>{controller?.abort();$('image-access-code').value='';image=null;referenceImage=null;});
 resetImage();checkService();
}
