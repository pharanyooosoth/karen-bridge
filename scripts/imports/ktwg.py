"""Import the user-supplied KTWG v2 PDF. Requires pdfplumber and pypdf.
Run: python ktwg.py /path/to/course.pdf
Never infer row alignment from a language model. Wrapped rows are listed explicitly.
"""
import sys,json,hashlib,re
from pathlib import Path
import pdfplumber
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[2]
URL='https://ktwg.org/wp-content/uploads/karen-language-course/KTWG%20Karen%20Language%20Course%20v2.pdf'
# Character identities checked against DRUM's KNU converter. Written independently;
# this is a restricted mapping for the characters present in this document.
MAP=dict(zip("uc*Cipqnx'eyzbr,&v0o[ t",'ကခဂဃငစဆညထဒနပဖဘမယရလဝသဟ အ'))
MAP.update({'w':'တ','E':'န','{':'ဧ','g':'ါ','H':'ံ','X':'ၢ','k':'ု','K':'ု','l':'ူ','h':'့','J':'ဲ','d':'ိ','D':'ီ','S':'ှ','F':'ၠ','j':'ြ','s':'ျ','G':'ွ','U':'ွ့','M':'န့','>':'ၢ်','m':'ာ်','.':'ၣ်',';':'း','R':'ၤ','f':'်','I':'.','<':',','=':'-','/':'"',' ':'','\n':''})
for n in range(1,10):MAP[str(n)]=chr(0x1040+n)
def convert(raw):
 # Foreign organisation names in the printed Karen column remain Latin.
 parts=re.split(r'(UNHCR\.?|ZOA)',raw)
 out=''
 for part in parts:
  if part in ['UNHCR','UNHCR.','ZOA']:out+=' '+part+' ';continue
  part=re.sub(r'j([ucwxypqrbzo*\'])',r'\1j',part)
  for c in part:
   if c not in MAP and c not in '()':raise ValueError('Unmapped legacy character '+repr(c)+' in '+raw)
   out+=MAP.get(c,c)
 return re.sub(r'\s+',' ',out).strip()
# (page, table, row): per-column adjacent line groups to join (original zero-based).
MERGES={
 (3,0,0):[[],[[12,13]],[[16,17]]],
 (5,0,0):[[],[[1,2],[3,4],[5,6]],[[1,2],[3,4]]],
 (9,0,0):[[],[[0,1]],[[0,1]]],
 (10,0,0):[[[4,5],[6,7],[8,9],[10,11],[13,14],[16,17]],[[1,2],[4,5],[6,7,8],[9,10,11],[12,13,14],[15,16],[18,19],[21,22]],[[1,2],[5,6],[7,8],[9,10],[11,12],[14,15],[17,18]]],
 (12,0,0):[[],[[3,4],[9,10],[16,17]],[[3,4],[9,10],[18,19]]],
 (13,0,0):[[[3,4]],[[0,1],[2,3],[5,6],[8,9],[10,11],[12,13]],[[0,1],[2,3],[5,6],[8,9],[11,12]]],
 (15,0,0):[[[1,2],[4,5],[7,8]],[[1,2],[3,4],[5,6,7],[9,10,11],[13,14],[16,17]],[[1,2],[4,5],[7,8],[10,11]]],
 (17,0,0):[[[4,5]],[[4,5,6],[7,8],[10,11],[13,14]],[]],
 (18,0,1):[[],[[7,8]],[]],
 (19,0,0):[[[1,2],[3,4]],[[1,2,3],[4,5,6],[8,9],[10,11]],[[1,2],[3,4],[7,8]]],
 (21,0,0):[[[2,3],[4,5]],[[2,3,4],[5,6]],[[2,3,4],[5,6]]],
 (21,0,1):[[[1,2]],[],[]],
}
def join(lines,groups):
 by_start={g[0]:g for g in groups};skip={i for g in groups for i in g[1:]}
 return [' '.join(lines[j] for j in by_start.get(i,[i])) for i in range(len(lines)) if i not in skip]
def main(path):
 source=Path(path);pdf=pdfplumber.open(source);reader=PdfReader(source);pages=[];blocks=[];section='Introduction'
 for i,page in enumerate(pdf.pages,1):
  header=page.crop((0,0,page.width,page.height*.14)).extract_text() or ''
  match=re.search(r'\d+\. ([A-Z][A-Z ?\u2019]+)',header)
  if match:section=match[1].strip()
  tables=page.extract_tables();pageblocks=[]
  for ti,t in enumerate(tables):
   for ri,row in enumerate(t):
    if len(row)!=3:continue
    columns=[(c or '').splitlines() for c in row]
    if i==6:columns[2]=columns[2][1:] # English-only heading "Phrases."
    key=(i,ti,ri)
    if key in MERGES:columns=[join(ls,groups) for ls,groups in zip(columns,MERGES[key])]
    if key==(21,0,1):columns[0][1]="ZOA 0JR 'X;" # Mixed-font extraction order; checked against printed row.
    block={'page':i,'section':section,'columns':columns,'sourcePages':[i]};blocks.append(block);pageblocks.append(block)
  pages.append({'page':i,'section':section,'source':URL+'#page='+str(i),'text':reader.pages[i-1].extract_text(),'tableBlocks':pageblocks})
 # The Karen cell for 25 spills from p25 onto p26, while English/roman do not.
 a=next(b for b in blocks if b['page']==25);b=next(b for b in blocks if b['page']==26)
 a['columns'][0].append(b['columns'][0].pop(0));a['sourcePages']=[25,26]
 entries=[]
 for block in blocks:
  cols=block['columns'];assert len(set(map(len,cols)))==1,(block['page'],list(map(len,cols)))
  for k,roman,en in zip(*cols):
   word=convert(k)
   entries.append({'id':f'ktwg-p{block["page"]}-{len(entries)+1:03d}','word':word,'legacy':k,'roman':[roman],'english':en,'thai':[],'page':block['page'],'sourcePages':block['sourcePages'],'section':block['section'],'source':URL+'#page='+str(block['page']),'conversion':'KNU legacy mapping; not native-speaker validated'})
 additions=json.loads((ROOT/'data/ktwg-additions.json').read_text())
 for e in entries:
  e['needsReview']=bool(re.search(r'([ျြွှိီုူံ])\1|ိီ|ီိ',e['word']))
  extra=additions.get(e['english'],{})
  e.update(extra)
  if e['thai']:e['thaiStatus']='Project-added Thai meaning, not present in the KTWG source'
 data={'meta':{'title':'KTWG Karen Language Course v2','author':'Karen Teacher Working Group','source':URL,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'pageCount':len(pages),'entryCount':len(entries),'imported':'2026-11-13','rights':'User-supplied course; KTWG attribution retained. Not part of the Wiktionary CC BY-SA dataset.','mappingSource':'https://drumpublications.org/memdic/unicode.php'},'entries':entries,'pages':pages}
 (ROOT/'data/ktwg-course.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'pages':len(pages),'entries':len(entries),'nameEntry':entries[13]},ensure_ascii=False,indent=2))
if __name__=='__main__':main(sys.argv[1])
