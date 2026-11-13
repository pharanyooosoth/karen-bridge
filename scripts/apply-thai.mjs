import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export const sources=['dictionary','ktwg-course','drum-general','drum-medical'];
export const meaningKey=text=>String(text).normalize('NFC').toLowerCase().replace(/[’‘]/gu,"'").trim().replace(/\s+/gu,' ');
export function applyMeanings(data,name,catalog){
 const report={english:0,translated:0,added:0,noEnglish:0,missing:[]};
 for(const entry of data.entries){
  const rows=name==='dictionary'?entry.senses:[entry];
  for(const row of rows){
   const field=name==='dictionary'?'th':'thai';
   const english=name==='dictionary'?row.en.join('; '):row.english;
   const key=meaningKey(english);
   if(!key){report.noEnglish++;continue;}
   report.english++;
   if(!row[field]?.length){
    const thai=catalog.overrides?.[name]?.[key]||catalog.meanings[key];
    if(thai?.length){row[field]=[...thai];row.thaiProvenance={status:'draft',basis:'english-gloss',english,date:catalog.meta.date};report.added++;}
   }
   if(row[field]?.length)report.translated++;else report.missing.push({id:entry.id,english});
  }
 }
 data.meta.thaiEntries=data.entries.filter(e=>name==='dictionary'?e.senses.some(s=>s.th?.length):e.thai?.length).length;
 data.meta.thaiCoverage={englishDefinitions:report.english,thaiDefinitions:report.translated,withoutEnglish:report.noEnglish,status:'draft',basis:'English meanings translated by the project; original sources retained',updated:catalog.meta.date};
 return report;
}
export async function applyAll(root=new URL('../',import.meta.url)){
 const catalog=JSON.parse(await readFile(new URL('data/thai-meanings.json',root),'utf8'));
 const pending=[];
 for(const name of sources){
  const file=new URL(`data/${name}.json`,root);const original=await readFile(file,'utf8');const data=JSON.parse(original);
  const report=applyMeanings(data,name,catalog);
  if(report.missing.length)throw Error(`${name}: untranslated English definitions: ${JSON.stringify(report.missing)}`);
  pending.push({file,original,text:JSON.stringify(data,null,name==='dictionary'?0:2)+'\n'});
  console.log(`${name}: Thai ${report.translated}/${report.english}; added ${report.added}; without English ${report.noEnglish}`);
 }
 for(const {file,original,text} of pending)if(text!==original)await writeFile(file,text);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await applyAll();
