import {buildIndex,search,segmentKaren} from './engine.js';
import {thaiReading} from './thai-reading.js';
import {initImageTranslation} from './image-translate.js';
const $=id=>document.getElementById(id);
let data,index,limit=40,currentView='translate',recognition=null,playing=null;
const KEY='karen-bridge:saved:v1';
let saved=[];
try{const value=JSON.parse(localStorage.getItem(KEY)||'[]');saved=Array.isArray(value)?value.filter(x=>typeof x==='string'):[];}catch{}
const labels={th:'ไทย',en:'English',ksw:'กะเหรี่ยงสะกอ',roman:'คำอ่านโรมัน','thai-reading':'คำอ่านภาษาไทย'};
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function link(text,url,cls){const a=el('a',cls,text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
function toast(message){$('toast').textContent=message;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').textContent='',3300);}
function updateCount(){$('saved-count').textContent=saved.length;}
function saveEntry(id){const next=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];try{localStorage.setItem(KEY,JSON.stringify(next));saved=next;}catch{toast('บันทึกไม่ได้: เบราว์เซอร์ปิดกั้นพื้นที่เก็บข้อมูล');return;}updateCount();render();renderSaved();}
function entryCard(entry,matchType){
 const card=el('article','entry');
 if(matchType)card.append(el('span','match-label',matchType));
 const top=el('div','entry-top');const title=el('div');title.append(el('div','pos',entry.pos+' · S’gaw Karen'));const word=el('h3','karen',entry.word);word.lang='ksw';title.append(word);top.append(title);
 const star=el('button','save',saved.includes(entry.id)?'★':'☆');star.setAttribute('aria-label',`${saved.includes(entry.id)?'เลิกบันทึก':'บันทึก'} ${entry.word}`);star.setAttribute('aria-pressed',saved.includes(entry.id));star.onclick=()=>saveEntry(entry.id);top.append(star);card.append(top);
 const reading=thaiReading(entry);
 const thaiBox=el('div','thai-reading');
 thaiBox.append(el('div','thai-reading-label','คำอ่านภาษาไทยโดยประมาณ'));
 if(reading.readings.length){
  thaiBox.append(el('div','thai-reading-text',reading.readings.join(' / ')));
  thaiBox.append(el('div','thai-reading-note',reading.method==='user-example'?'ตัวอย่างคำอ่านที่ผู้ใช้เสนอ · ยังไม่ได้ตรวจโดยเจ้าของภาษา':'ถอดจากคำอ่านโรมันอัตโนมัติ · ยังไม่ได้ตรวจโดยเจ้าของภาษา'));
  thaiBox.append(el('div','thai-reading-note','เสียงและวรรณยุกต์อาจไม่ตรงกับสำเนียงของคุณ'));
 }else thaiBox.append(el('div','small','ยังไม่มีคำอ่านไทยสำหรับรูปแบบนี้'));
 card.append(thaiBox);
 if(entry.roman.length)card.append(el('div','roman','คำอ่านโรมัน · '+entry.roman.join(' / ')));
 else card.append(el('div','small','ต้นฉบับไม่มีคำอ่านโรมัน'));
 for(const ipa of entry.ipa)card.append(el('div','ipa',`IPA ${ipa.text}${ipa.note?' · '+ipa.note:''}`));
 for(const sense of entry.senses){const d=el('div','sense');if(sense.th.length){d.append(el('div','',sense.th.join(' · ')),el('div','draft','ความหมายไทยฉบับร่าง · แปลจากอังกฤษ'));}else d.append(el('div','small','ยังไม่มีความหมายไทย — ดูภาษาอังกฤษด้านล่าง'));d.append(el('div','english',sense.en.join('; ')));for(const tag of sense.tags)d.append(el('span','tag',tag));card.append(d);}
 const actions=el('div','entry-actions');
 if(entry.audio.length){const audio=entry.audio[0];const play=el('button','','♫ ฟังเสียงกะเหรี่ยง');play.onclick=async()=>{if(playing){playing.pause();playing=null;}const sound=new Audio(audio.url);playing=sound;try{await sound.play();toast('กำลังเล่นเสียงจาก Wikimedia Commons');}catch{toast('เปิดเสียงไม่ได้ กรุณาเปิดแหล่งเสียงต้นฉบับ');}};actions.append(play);card.append(link(`เสียง: ${audio.author} · ${audio.license}`,audio.source,'audio-credit'));}
 else actions.append(el('span','no-audio','ยังไม่มีไฟล์เสียงคำนี้'));
 const copy=el('button','','คัดลอก');copy.onclick=async()=>{try{await navigator.clipboard.writeText(entry.word);toast('คัดลอกคำกะเหรี่ยงแล้ว');}catch{toast('คัดลอกไม่ได้ กรุณาเลือกข้อความและคัดลอกเอง');}};actions.append(copy,link('ที่มาของคำ ↗',entry.source));card.append(actions);return card;
}
function render(){
 if(!index)return;
 const query=$('query').value,language=$('language').value;
 $('char-count').textContent=`${query.length} / 500`;
 $('result-language').textContent=['ksw','thai-reading'].includes(language)?'ไทย / English':'กะเหรี่ยงสะกอ';
 $('segments').replaceChildren();$('load-more').hidden=true;
 if(!query.trim()){$('result-summary').textContent='พร้อมค้นคำจากพจนานุกรม';const empty=el('div','empty');const sample=el('span','','ထံ');sample.lang='ksw';empty.append(sample,el('h3','','คำใหม่ เริ่มต้นได้ที่นี่'),el('p','','พิมพ์คำ หรือเลือกคำแนะนำด้านล่าง'));$('results').replaceChildren(empty);return;}
 const result=search(index,query,language,{audioOnly:$('audio-only').checked,limit});
 $('result-summary').textContent=result.total?`${result.exact?'พบคำตรงกัน '+result.exact+' รายการ':'คำที่เกี่ยวข้อง — ไม่ใช่คำแปลตรงตัว'} · ทั้งหมด ${result.total} รายการ`:'ไม่พบคำนี้ในชุดข้อมูลปัจจุบัน';
 if(language==='thai-reading')$('result-summary').textContent=result.total?`${result.exact?'พบคำอ่านตรงกัน '+result.exact+' รายการ':'พบคำอ่านบางส่วน'} · ทั้งหมด ${result.total} รายการ · คำอ่านโดยประมาณอาจตรงหลายคำ`:'ไม่พบคำอ่านนี้ในชุดข้อมูลปัจจุบัน';
 $('results').replaceChildren(...result.matches.map(m=>entryCard(m.entry,language==='thai-reading'?(m.exact?'คำอ่านตรงกัน · โดยประมาณ':'คำอ่านตรงบางส่วน · ไม่ใช่คำแปลตรงตัว'):(m.exact?'คำตรงกัน':'คำที่เกี่ยวข้อง · ไม่ใช่คำแปลตรงตัว'))));
 $('load-more').hidden=result.total<=result.matches.length;
 if(!result.total){const empty=el('div','empty');empty.append(el('h3','','ลองคำสั้นลง หรือเปลี่ยนภาษา'),el('p','',language==='thai-reading'?'ยังไม่มีคำอ่านรูปแบบนี้ ลองการสะกดอีกแบบ หรือค้นด้วยความหมายไทย/อังกฤษ':language==='th'?'คำไทยครอบคลุมเพียงบางรายการ ลองค้นภาษาอังกฤษของคำเดียวกัน':'ระบบจะไม่เดาคำแปลเมื่อไม่มีข้อมูล'));$('results').append(empty);}
 if(language==='ksw'&&!result.exact&&query.trim()){
  const parts=segmentKaren(index,query);const box=el('div','segment-box');box.append(el('p','','แยกคำเพื่อช่วยอ่าน (อาจแบ่งผิด) · ไม่ใช่คำแปลทั้งประโยค'));
  for(const part of parts){if(part.known){const b=el('button','',part.text);b.onclick=()=>{$('query').value=part.text;limit=40;render();};box.append(b);}else box.append(el('span','unknown',part.text+' · ไม่รู้จัก'));} $('segments').append(box);
 }
}
function renderSaved(){if(!data)return;const entries=data.entries.filter(e=>saved.includes(e.id));$('saved-list').replaceChildren(...entries.map(e=>entryCard(e)));if(!entries.length)$('saved-list').append(el('p','intro','ยังไม่มีคำที่บันทึก กด ☆ ข้างคำที่อยากทบทวน'));$('export-saved').disabled=!entries.length;}
function view(name){currentView=name;document.querySelectorAll('.view').forEach(n=>n.hidden=n.id!==`view-${name}`);document.querySelectorAll('.nav-item').forEach(n=>{n.classList.toggle('active',n.dataset.view===name);if(n.dataset.view===name)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');});if(name==='saved')renderSaved();}
function updateLanguage(){$('reading-help').hidden=$('language').value!=='thai-reading';if(recognition)recognition.abort();$('query').lang=$('language').value==='ksw'?'ksw':['th','thai-reading'].includes($('language').value)?'th':'en';$('query').placeholder={th:'พิมพ์คำที่อยากรู้ เช่น น้ำ ขอบคุณ…',en:'Type a word, e.g. water, thank you…',ksw:'พิมพ์หรือวางอักษรกะเหรี่ยง เช่น ထံ',roman:'พิมพ์คำอ่านโรมันตามต้นฉบับ เช่น hṭee','thai-reading':'พิมพ์คำอ่านภาษาไทย เช่น ที ตาบลึ ตะบลือ…'}[$('language').value];const supported=Boolean(window.SpeechRecognition||window.webkitSpeechRecognition);$('mic').disabled=!supported||!['th','en'].includes($('language').value);$('speech-status').textContent=$('language').value==='thai-reading'?'พิมพ์คำอ่านภาษาไทยเพื่อค้นเสียงกะเหรี่ยงในพจนานุกรม':!supported?'เบราว์เซอร์นี้ไม่รองรับรับเสียง กรุณาพิมพ์ข้อความ':!['th','en'].includes($('language').value)?'รับเสียงได้เฉพาะไทยและอังกฤษ กรุณาพิมพ์ภาษากะเหรี่ยง':'การใช้ไมค์อาจส่งเสียงไปยังบริการรู้จำเสียงของเบราว์เซอร์';limit=40;render();}
$('query').oninput=()=>{limit=40;render();};$('query').onkeydown=e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();render();}};
$('search').onclick=()=>render();$('language').onchange=updateLanguage;$('audio-only').onchange=()=>{limit=40;render();};
$('clear').onclick=()=>{$('query').value='';render();$('query').focus();};
$('swap').onclick=()=>{const old=$('language').value;if(old==='ksw'){$('language').value='en';$('query').value='';}else{const result=index?search(index,$('query').value,old):null;$('language').value='ksw';$('query').value=result?.matches.find(m=>m.exact)?.entry.word||'';}updateLanguage();};
$('load-more').onclick=()=>{limit+=40;render();};
for(const button of document.querySelectorAll('[data-query]'))button.onclick=()=>{$('language').value=button.dataset.language||'th';$('query').value=button.dataset.query;$('audio-only').checked=false;updateLanguage();};
for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>view(button.dataset.view);
$('export-saved').onclick=()=>{const entries=data.entries.filter(e=>saved.includes(e.id));const blob=new Blob([JSON.stringify({license:'CC BY-SA 4.0',attribution:'Wiktionary contributors via Kaikki; Thai drafts and approximate reading aids by Karen Bridge',entries:entries.map(entry=>({...entry,thaiReading:thaiReading(entry)}))},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=el('a');a.href=url;a.download='karen-bridge-saved.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('mic').onclick=()=>{
 if(recognition){recognition.stop();return;}
 const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Speech)return;
 const r=new Speech();recognition=r;r.lang=$('language').value==='th'?'th-TH':'en-US';r.interimResults=false;r.maxAlternatives=1;
 r.onstart=()=>{$('mic').textContent='■ หยุดรับเสียง';$('speech-status').textContent='กำลังฟัง… พูดคำไทยหรืออังกฤษ';};
 r.onresult=e=>{$('query').value=e.results[0][0].transcript.slice(0,500);limit=40;render();$('speech-status').textContent='รับเสียงแล้ว โปรดตรวจข้อความก่อนใช้ผลลัพธ์';};
 r.onerror=e=>{$('speech-status').textContent=({'not-allowed':'ไม่ได้รับอนุญาตใช้ไมค์ กรุณาตั้งค่าสิทธิ์เบราว์เซอร์หรือพิมพ์แทน','no-speech':'ไม่ได้ยินเสียง ลองใหม่หรือพิมพ์แทน','network':'บริการรับเสียงเชื่อมต่อไม่ได้ กรุณาพิมพ์แทน','language-not-supported':'บริการไม่รองรับภาษานี้ กรุณาพิมพ์แทน','aborted':'หยุดรับเสียงแล้ว'})[e.error]||'รับเสียงไม่สำเร็จ กรุณาพิมพ์แทน';};
 r.onend=()=>{recognition=null;$('mic').textContent='♩ พูดเพื่อค้นหา';};
 try{r.start();}catch{recognition=null;toast('เริ่มรับเสียงไม่ได้ กรุณาพิมพ์แทน');}
};
window.addEventListener('pagehide',()=>{recognition?.abort();playing?.pause();});
updateCount();updateLanguage();view('translate');
try{const response=await fetch('./data/dictionary.json');if(!response.ok)throw new Error('dictionary unavailable');data=await response.json();index=buildIndex(data.entries);$('word-stat').textContent=data.meta.words.toLocaleString('en');$('thai-stat').textContent=data.meta.thaiEntries.toLocaleString('en');$('audio-stat').textContent=data.meta.audioFiles;render();}catch{$('result-summary').textContent='โหลดพจนานุกรมไม่ได้ กรุณารีโหลดหน้าเว็บ หรือตรวจการเชื่อมต่อ';$('search').disabled=true;}

initImageTranslation({onDictionaryLookup(text){$('language').value='ksw';$('query').value=text.slice(0,500);$('audio-only').checked=false;view('translate');updateLanguage();if(text.length>500)toast('นำข้อความ 500 ตัวอักษรแรกมาค้นพจนานุกรม');}});
