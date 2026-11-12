"""Reproducible Wiktionary -> compact, attributed dictionary; no network calls."""
import json, re, hashlib
from pathlib import Path
from urllib.parse import quote
root = Path(__file__).resolve().parent.parent
raw = (root/'data/source.jsonl').read_bytes()
thai = json.loads((root/'data/thai-glosses.json').read_text())
metadata = json.loads((root/'data/audio-metadata.json').read_text())
audio = {}
for page in metadata['query']['pages'].values():
    info = page.get('imageinfo', [{}])[0]
    m = info.get('extmetadata', {})
    if m.get('LicenseShortName', {}).get('value') == 'CC BY-SA 4.0':
        audio[page['title'][5:]] = {'url':info['url'].split('?')[0], 'source':info['descriptionurl'], 'author':'咽頭べさ', 'license':'CC BY-SA 4.0', 'licenseUrl':m['LicenseUrl']['value']}
def key(s):
    return re.sub(r'^(?:to |a |an |the )', '', s.strip().rstrip('.'))
entries=[]
for i,line in enumerate(raw.decode().splitlines()):
    r=json.loads(line)
    if r.get('lang_code') != 'ksw': continue
    senses=[]
    for s in r.get('senses',[]):
        gloss=s.get('glosses',[])
        senses.append({'en':gloss, 'th':list(dict.fromkeys(thai[key(g)] for g in gloss if key(g) in thai)), 'tags':s.get('tags',[])})
    forms=[f['form'] for f in r.get('forms',[]) if 'romanization' in f.get('tags',[]) or (not f.get('tags') and not re.search('[\u1000-\u109f]',f['form']))]
    entries.append({'id':hashlib.sha256((r['word']+'|'+r['pos']+'|'+'|'.join(s.get('id','') for s in r.get('senses',[]))).encode()).hexdigest()[:20],'word':r['word'],'pos':r['pos'],'roman':list(dict.fromkeys(forms)), 'ipa':[{'text':s['ipa'],'note':s.get('note','')} for s in r.get('sounds',[]) if s.get('ipa')], 'audio':[audio[s['audio']] for s in r.get('sounds',[]) if s.get('audio') in audio], 'senses':senses,'source':'https://en.wiktionary.org/wiki/'+quote(r['word'],safe='')+"#S'gaw_Karen"})
result={'meta':{'language':'ksw','retrieved':'2026-11-12','source':'https://kaikki.org/dictionary/S%27gaw%20Karen/index.html','sourceSha256':hashlib.sha256(raw).hexdigest(),'license':'CC BY-SA 4.0','entries':len(entries),'words':len(set(e['word'] for e in entries)),'thaiEntries':sum(any(s['th'] for s in e['senses']) for e in entries),'audioFiles':len(set(a['url'] for e in entries for a in e['audio']))},'entries':entries}
(root/'data/dictionary.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
print(json.dumps(result['meta'],ensure_ascii=False,indent=2))
