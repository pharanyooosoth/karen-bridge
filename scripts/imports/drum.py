"""Reproduce DRUM imports from the two user-supplied PDFs; no OCR/AI row pairing.
Usage: python drum.py /path/transwordlist1.pdf /path/medicalterms2_2008.pdf
Requires pdfplumber and pypdf. Source text and page coordinates remain auditable.
"""
import json,re,sys,hashlib
from pathlib import Path
import pdfplumber
from pypdf import PdfReader
from ktwg import MAP as KNU
ROOT=Path(__file__).resolve().parents[2]
MAP={**KNU,'T':'အ','A':' ','L':'ူ','Œ':'့','%':'ရ','‹':'ၡ','›':'ၡ','±':'ရ','μ':'%','§':',','˜':',','ú':'_','?':'"','_':'ြ','-':'ြ','}':'ြ','’':'ဒ','‘':'ဒ'}
# V and O are font ligatures; preserve medial-before-vowel order.
MAP.update({'V':'ျ့','O':'ှ့'})
def convert(raw):
 raw=raw.replace('’',"'").replace('‘',"'")
 raw=re.sub(r'[-_}j]([ucwxypqrbzo*\'])',r'\1j',raw)
 # B in hepatitis B is printed in Times Roman, not the Karen font.
 raw=raw.replace('(B)','(\x01)')
 unknown=set(raw)-set(MAP)-set('()\x01')
 if unknown:return '', 'unmapped legacy characters: '+repr(sorted(unknown))
 out=''.join('B' if c=='\x01' else MAP.get(c,c) for c in raw)
 problem='repeated or conflicting vowel/medial signs' if re.search(r'([ျြွှိီုူံ])\1|ိီ|ီိ',out) else ''
 return re.sub(r'\s+',' ',out).strip(),problem

def medical_rows(pdf):
 result=[]
 for pn,p in enumerate(pdf.pages[4:],5):
  cols=[]
  for left,right in [(80,175),(175,370),(370,530)]:
   words=[w for w in p.extract_words(x_tolerance=1,y_tolerance=2) if left<=w['x0']<right and 130<w['top']<750]
   lines=[]
   for w in sorted(words,key=lambda w:(round(w['top']),w['x0'])):
    if lines and abs(lines[-1]['y']-w['top'])<2:lines[-1]['words'].append(w)
    else:lines.append({'y':w['top'],'words':[w]})
   for line in lines:line['text']=' '.join(w['text'] for w in sorted(line.pop('words'),key=lambda w:w['x0']))
   cols.append(lines)
  # English and Karen first-line baselines differ by 1.45pt. Wrapped lines
  # have distinct leading (13.6 vs 17.4pt), so must not become new records.
  # The X-Rays row uses a different vertical offset, checked on PDF p31.
  starts=[l for l in cols[0] if any(abs(l['y']-k['y']-1.45)<1.3 for k in cols[1]) or (pn==31 and l['text']=='X-Rays')]
  if pn<=31:assert starts and abs(starts[0]['y']-cols[0][0]['y'])<1,(pn,'unpaired top row')
  for j,s in enumerate(starts):
   end=starts[j+1]['y']-2 if j+1<len(starts) else 750
   row=[' '.join(l['text'] for l in col if s['y']-2<=l['y']<end) for col in cols]
   assert all(row),(pn,row)
   result.append((pn,round(s['y'],2),row))
 return result

def main(paths):
 datasets=[]
 additions=json.loads((ROOT/'data/drum-additions.json').read_text())
 for kind,path in zip(['general','medical'],paths):
  file=Path(path);reader=PdfReader(file);pdf=pdfplumber.open(file)
  url='https://www.drumpublications.org/download/'+file.name
  if kind=='general':
   rows=[(pn,None,row) for pn,p in enumerate(pdf.pages,1) for table in p.extract_tables() for row in table if len(row)==3 and (row[1] or '').strip() and (row[2] or '').strip()]
  else:rows=medical_rows(pdf)
  entries=[]
  for pn,y,row in rows:
   clean=lambda x:re.sub(r'\s+',' ',x or '').strip()
   en=clean(row[0]);raw=clean(row[2 if kind=='general' else 1]);word,problem=convert(raw)
   if kind=='medical' and en.startswith('9%NS'):problem='Source prints 9% Normal Saline; concentration requires specialist review, not silently corrected.'
   if kind=='medical' and en.startswith('alcoholic hepititis'):problem='Source combines alcoholic hepatitis and hepatitis A; requires specialist review.'
   e={'id':f'drum-{kind}-p{pn}-{len(entries)+1:04d}','word':word,'legacy':raw,'english':en,'thai':additions.get(en.lower(),[]),'roman':[clean(row[1])] if kind=='general' else [],'page':pn,'sourcePages':[pn],'printedPage':pn-4 if kind=='medical' else None,'section':'DRUM medical glossary' if kind=='medical' else 'DRUM transliterated word list','source':url+'#page='+str(pn),'sourceLabel':'DRUM Medical 2008' if kind=='medical' else 'DRUM Word List','domain':kind,'needsReview':bool(problem),'reviewReason':problem,'conversion':'KNU legacy to Unicode; not native-speaker validated'}
   if kind=='medical':e.update(burmeseLegacy=clean(row[2]),rowY=y)
   if e['thai']:e['thaiStatus']='Project-added Thai search aliases, not present in the source PDF; draft'
   entries.append(e)
  data={'meta':{'title':'DRUM '+('Transliterated Sgaw Karen Word List' if kind=='general' else 'Medical Terms (2nd edition, 2008)'),'source':url,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'pageCount':len(reader.pages),'entryCount':len(entries),'usableCount':sum(not e['needsReview'] for e in entries),'imported':'2026-11-13','rights':'DRUM Publication Group. User confirmed permission to publish this derived database on 2026-11-13. Original rights retained; not CC BY-SA or MIT.','mappingSource':'https://www.drumpublications.org/memdic/unicode.php'},'entries':entries,'pages':[{'page':i+1,'text':p.extract_text()} for i,p in enumerate(reader.pages)]}
  (ROOT/f'data/drum-{kind}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
  print(kind,data['meta']['entryCount'],data['meta']['usableCount']);print([(e['english'],e['reviewReason']) for e in entries if e['needsReview']])
if __name__=='__main__':main(sys.argv[1:])
