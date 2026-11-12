// Image preparation is local. Only explicit OCR/translation submits data to the server.
const INPUT_LIMIT=10*1024*1024,OUTPUT_LIMIT=2*1024*1024,MAX_SIDE=2200,MAX_TEXT=6000;
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
  let dataUrl=canvas.toDataURL('image/jpeg',.92);
  if(dataUrl.length*3/4>OUTPUT_LIMIT)dataUrl=canvas.toDataURL('image/jpeg',.78);
  if(dataUrl.length*3/4>OUTPUT_LIMIT)throw Error('ภาพยังใหญ่เกินไป กรุณาครอปเฉพาะข้อความหรือแบ่งภาพ');
  return {dataUrl,width:canvas.width,height:canvas.height,resized:scale<1};
 }finally{URL.revokeObjectURL(url);}
}
export function initImageTranslation({onDictionaryLookup}){
 let endpoint=null,ready=false,image=null,busy=false,controller=null,revision=0,preparing=false,translated=null;
 const status=message=>$('image-status').textContent=message;
 function clearTranslation(){translated=null;$('ai-result').replaceChildren();$('ai-copy').disabled=true;$('ai-download').disabled=true;}
 function update(){
  $('ocr-start').disabled=!ready||!image||busy||preparing;
  $('ai-translate').disabled=!ready||!$('ocr-text').value.trim()||busy||preparing;
  $('image-cancel').hidden=!busy;$('image-target').disabled=busy;
  $('ocr-text-count').textContent=`${$('ocr-text').value.length.toLocaleString('en')} / 6,000`;
  $('ocr-dictionary').disabled=!$('ocr-text').value.trim()||busy;
 }
 function invalidate(){revision++;controller?.abort();controller=null;busy=false;clearTranslation();update();}
 function resetImage(){invalidate();image=null;preparing=false;$('image-file').value='';$('image-preview').removeAttribute('src');$('image-preview').hidden=true;$('image-empty').hidden=false;$('image-name').textContent='';$('ocr-text').value='';$('ocr-info').replaceChildren();$('image-consent').checked=false;status('เลือกรูปที่มีข้อความกะเหรี่ยง');update();}
 function notes(container,items){if(!items?.length)return;const list=node('ul','ai-notes');for(const item of items)list.append(node('li','',item));container.append(list);}
 async function selectFile(file){
  resetImage();if(!file)return;const version=revision;preparing=true;status('กำลังเตรียมภาพในเครื่อง…');update();
  try{const prepared=await prepareImage(file);if(version!==revision)return;image=prepared.dataUrl;$('image-preview').src=image;$('image-preview').hidden=false;$('image-empty').hidden=true;$('image-name').textContent=`${file.name} · ${prepared.width} × ${prepared.height}${prepared.resized?' · ย่อขนาดแล้ว':''}`;status('ภาพพร้อมแล้ว ยังไม่ได้ส่งออกจากเครื่อง');}
  catch(error){if(version===revision)status(error.message||'เปิดภาพไม่ได้ กรุณาเลือกภาพอื่น');}
  finally{if(version===revision){preparing=false;update();}}
 }
 async function submit(action){
  if(!ready||!endpoint){status('บริการ AI ยังไม่พร้อม เจ้าของเว็บไซต์ต้องตั้งค่าการเชื่อมต่อก่อน');return;}
  if(!$('image-consent').checked){status('โปรดยืนยันการส่งภาพหรือข้อความไปให้ OpenAI ประมวลผล');$('image-consent').focus();return;}
  const access=$('image-access-code').value;
  if(!access){status('กรุณาใส่รหัสเข้าใช้ที่ได้รับจากเจ้าของเว็บไซต์');$('image-access-code').focus();return;}
  if(action==='ocr'&&!image)return;
  const text=$('ocr-text').value.trim();if(action==='translate'&&(!text||text.length>MAX_TEXT)){status('กรุณาตรวจข้อความ ไม่เกิน 6,000 ตัวอักษร');return;}
  invalidate();const version=revision;controller=new AbortController();const currentController=controller;busy=true;update();status(action==='ocr'?'AI กำลังอ่านข้อความจากภาพ…':'AI กำลังแปลข้อความที่คุณตรวจแล้ว…');
  const timeout=setTimeout(()=>currentController.abort(),65000);
  const target=$('image-target').value;
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-Karen-Access-Code':access},body:JSON.stringify(action==='ocr'?{action,image}:{action,text,target}),signal:currentController.signal,credentials:'omit',redirect:'error'});
   let result;try{result=await response.json();}catch{throw Error('บริการส่งคำตอบไม่ถูกต้อง กรุณาติดต่อเจ้าของเว็บไซต์');}
   if(version!==revision)return;
   if(!response.ok)throw Error(typeof result.error==='string'?result.error:'บริการ AI ไม่สำเร็จ');
   const data=result.data;if(!data||typeof data!=='object')throw Error('ไม่พบผลลัพธ์จาก AI');
   if(action==='ocr'){
    if(typeof data.text!=='string'||data.text.length>MAX_TEXT)throw Error('ข้อความยาวเกินกำหนด กรุณาแบ่งภาพ');
    $('ocr-text').value=data.text;
    $('ocr-info').replaceChildren(node('p','small','ข้อความที่ AI อ่านได้ · โปรดเทียบอักษรกับภาพก่อนแปล'));
    const languages={sgaw_karen:'AI คาดว่าเป็นกะเหรี่ยงสะกอ',other_karen:'AI คาดว่าเป็นกะเหรี่ยงภาษาอื่น',burmese:'AI คาดว่าเป็นภาษาพม่า',other:'AI คาดว่าเป็นภาษาอื่น',unclear:'AI ยังระบุภาษาไม่ได้'};
    $('ocr-info').append(node('p','small',languages[data.language]||'ยังระบุภาษาไม่ได้'));
    notes($('ocr-info'),data.uncertain_spans?.map(s=>'อ่านไม่แน่ใจ: '+s));notes($('ocr-info'),data.notes);
    status(data.text?'อ่านภาพแล้ว — ตรวจแก้ข้อความด้านล่างก่อนแปล':'ไม่พบข้อความที่อ่านได้ ลองภาพที่ชัดขึ้นหรือพิมพ์ข้อความเอง');
   }else{
    if(typeof data.translation!=='string')throw Error('ไม่พบคำแปลจาก AI');
    translated={source:text,target,...data};
    const panel=$('ai-result');panel.replaceChildren(node('span','resource-tag','คำแปลฉบับร่างจาก AI · ยังไม่ได้ตรวจโดยเจ้าของภาษา'),node('h3','',target==='th'?'คำแปลภาษาไทย':'English translation'),node('p','ai-translation',data.translation||'AI ยังแปลข้อความนี้ไม่ได้'));
    if(data.thai_reading){panel.append(node('h3','','คำอ่านไทยจาก AI โดยประมาณ'),node('p','ai-reading',data.thai_reading));}
    notes(panel,data.uncertain_spans?.map(s=>'ไม่แน่ใจ: '+s));notes(panel,data.notes);
    $('ai-copy').disabled=false;$('ai-download').disabled=false;status('แปลแล้ว — ตรวจทานจุดที่ไม่แน่ใจกับผู้รู้ภาษา');
   }
  }catch(error){if(version===revision)status(error.name==='AbortError'?'คำขอหมดเวลาหรือถูกยกเลิก ลองแบ่งภาพให้เล็กลง':error.message||'เชื่อมต่อไม่ได้');}
  finally{clearTimeout(timeout);if(version===revision){busy=false;controller=null;update();}}
 }
 $('image-file').onchange=e=>selectFile(e.target.files?.[0]);
 const drop=$('image-drop');drop.ondragover=e=>{e.preventDefault();drop.classList.add('dragging');};drop.ondragleave=()=>drop.classList.remove('dragging');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('dragging');selectFile(e.dataTransfer.files?.[0]);};
 $('image-clear').onclick=resetImage;
 $('image-cancel').onclick=()=>{invalidate();status('ยกเลิกการรอผลแล้ว หากส่งไปแล้วบริการอาจประมวลผลต่อและคิดค่าใช้จ่าย');};
 $('ocr-start').onclick=()=>submit('ocr');$('ai-translate').onclick=()=>submit('translate');
 $('ocr-text').oninput=()=>{invalidate();status('ข้อความถูกแก้ไขแล้ว กดแปลเพื่อใช้ข้อความล่าสุด');};
 $('image-target').onchange=()=>{clearTranslation();update();};
 $('ocr-dictionary').onclick=()=>onDictionaryLookup($('ocr-text').value);
 $('ai-copy').onclick=async()=>{if(!translated)return;try{await navigator.clipboard.writeText(translated.translation);status('คัดลอกคำแปลแล้ว');}catch{status('คัดลอกไม่ได้ กรุณาเลือกข้อความเพื่อคัดลอกเอง');}};
 $('ai-download').onclick=()=>{if(!translated)return;const blob=new Blob([JSON.stringify({...translated,draft:true,sourceType:'OpenAI AI draft'},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=node('a');a.href=url;a.download='karen-image-translation.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('image-check-service').onclick=checkService;
 async function checkService(){
  ready=false;update();$('image-service-status').textContent='กำลังตรวจการเชื่อมต่อ…';
  try{
   const configResponse=await fetch('./api-config.json',{cache:'no-store'});if(!configResponse.ok)throw Error('ยังไม่มีการตั้งค่าบริการ AI');
   const config=await configResponse.json();endpoint=safeApiUrl(config.apiUrl,location.href);
   if(!endpoint)throw Error('ยังไม่ได้เชื่อมต่อบริการ AI — อัปโหลดดูภาพและพิมพ์ค้นพจนานุกรมได้');
   const response=await fetch(endpoint,{signal:AbortSignal.timeout(10000),credentials:'omit',redirect:'error',cache:'no-store'});
   if(!response.ok)throw Error('เชื่อมต่อบริการ AI ไม่ได้ กรุณาติดต่อเจ้าของเว็บไซต์');
   const health=await response.json();ready=health.ready===true;
   $('image-service-status').textContent=ready?'เชื่อมต่อบริการ AI แล้ว · ต้องใช้รหัสเข้าใช้':'บริการ AI ยังไม่ได้ตั้งค่าคีย์หรือรหัสเข้าใช้';
  }catch(error){$('image-service-status').textContent=error.message||'บริการ AI ยังไม่พร้อม';}
  update();
 }
 window.addEventListener('pagehide',()=>{controller?.abort();$('image-access-code').value='';image=null;});
 resetImage();checkService();
}
