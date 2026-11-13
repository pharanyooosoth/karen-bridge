# DRUM data import — v1.7 (2026-11-13)

The user supplied `transwordlist1.pdf` and `medicalterms2_2008.pdf` and explicitly confirmed permission to publish their derived vocabulary databases on 2026-11-13. DRUM retains its rights; these records are not Wiktionary CC BY-SA or project MIT content. No PDF or font binaries are hosted in the repository.

## Sources and provenance

- https://www.drumpublications.org/download_k.php
- Word List: https://www.drumpublications.org/download/transwordlist1.pdf
- Medical Terms, second edition (2008): https://www.drumpublications.org/download/medicalterms2_2008.pdf
- Transliteration guide, pp1–5: https://www.drumpublications.org/download/transliterate.pdf
- Character identities: https://www.drumpublications.org/memdic/unicode.php

The Word List has 26 pages and 958 vocabulary/phrase rows (alphabet headings excluded). Medical Terms has 32 PDF pages, including front matter and a final notes page; its 720 term rows occur on PDF pages 5–31 (printed pages 1–27). Every source page's extracted text is retained for audit. Each record carries the original English, legacy Karen, Unicode conversion, PDF page, URL, and stable ID. Medical records also retain the raw Burmese column; it is deliberately not displayed as Unicode Karen. SHA-256 hashes identify the user-provided source files.

## Reproduce

Use Python with `pdfplumber` and `pypdf`:

```
python scripts/imports/drum.py /path/transwordlist1.pdf /path/medicalterms2_2008.pdf
```

The general file uses three-column PDF tables. Medical has no horizontal cell borders: extraction uses fixed column coordinates and aligned English/Karen first-line positions. Different line spacing distinguishes wrapped cells. X-Rays on PDF page 31 has a distinct font offset handled explicitly. Footer page numbers are excluded. Tests protect wrapped entries such as acute renal failure, Cardio Pulmonary Resuscitation, Sexually Transmitted Diseases, and Urinary Tract Infection; continuations never become unrelated records.

The importer uses a restricted, independently written character map based on DRUM character identities and visual inspection, not downloaded converter code. It preserves Karen font ligatures, pre-base medials, punctuation, template blanks, and Latin B in hepatitis B. The converted Unicode is not certified by a native speaker. Representative full pages and six-page medical contact sheets were visually compared with extraction. This is sampling, not a complete linguistic review of every row.

Two detected source anomalies are retained with `needsReview: true` and excluded from search, exact responses, and API retrieval:

- PDF p5: source prints “9% Normal Saline”; concentration not silently changed or recommended.
- PDF p6: source combines alcoholic hepatitis and hepatitis A.

This does not imply all other records are clinically correct. Source spelling and terminology are historical; the app is a vocabulary aid, not clinical decision support.

## Pronunciation and Thai additions

`drum-reading.js` implements DRUM-specific rules, separate from Wiktionary and KTWG. It first attempts a whole-word match between a medical Karen spelling and Word List spelling. Original romanization and source page links are shown when matched. Thai rendering is a project approximation.

Where no supported roman reading exists, a strict Unicode syllable parser tries a Thai reading using the DRUM guide. Unsupported glyphs, mixed Latin text, placeholders, or unsupported syllable structures cause the complete reading to be withheld; partial output is not presented as a full reading. Karen tones are not mapped to Thai tones. The output is explicitly labelled experimental, not source-provided Thai or verified pronunciation. Complex consonants and dialects remain approximate.

`data/drum-additions.json` supplies a limited set of Thai meaning/search aliases, independently labelled as project drafts. Original English and Karen are unchanged. The medical section searches only medical records; general search uses Word List along with the pre-existing sources. Saved items preserve source rights.

## API integration and checks

Both files are shipped to frontend and backend. Exact full phrases use deterministic source lookup without an OpenAI call. New sentences retrieve relevant KTWG/DRUM entries (maximum 8 combined) and include actual records, source labels, and page links in API context. Existing password and consent controls for paid calls remain. Medical source records are vocabulary evidence, not treatment advice. Neither an API account's ChatGPT history nor a web link alone is used as the database.

52 automated tests pass, including row pairing, counts, quarantine exclusion, source-specific pronunciation, Thai/Karen/reading search, and captured mock API requests. Browser testing checked abdomen, Thai เบาหวาน, and exact diabetes lookup with both general and medical source links. Live paid OpenAI quality was not evaluated; the provider tests use mocks. Native-speaker and clinical review remain necessary.
