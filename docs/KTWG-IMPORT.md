# KTWG import and verification — 2026-11-13

The attached KTWG Karen Language Course v2 is 28 pages. It was previously only linked from the app; v1.6 actually indexes it. The course includes English, Karen written in legacy Karen-Normal/KNU font, and its own roman transcription. It does not include Thai pronunciation.

## Reproducible extraction

Run `python scripts/imports/ktwg.py /path/to/KTWG-course.pdf` with `pdfplumber` and `pypdf` installed. The importer extracts all 28 pages and three-column tables, joins only the explicitly listed wrapped rows, converts the restricted legacy character set, and merges separate project additions. It fails on an unknown legacy character or unequal column lengths. The input SHA-256 is recorded in the output. No AI generated the English/Karen pairings.

The question on page 3 has legacy text `e rHR 'f vJ.`, Unicode `နမံၤဒ်လဲၣ်`, roman `na mee di leh?`, and English `What’s your name?`. The source page was rendered and inspected. Contraction normalization makes the user's `What is your name?` query an exact match; negation is not discarded.

The extraction has 455 rows, including repeated dialogue phrases and headings. Of these, 451 are enabled; 4 with suspicious repeated medials/vowels stay in the dataset as `needsReview: true` and are excluded from exact answers, dictionary search and AI context. A speaker should review them against pages 15, 26 and 27. This does not mean every remaining conversion has been independently certified.

## Layout corrections

Pages 3, 5, 9, 10, 12, 13, 15, 17, 18, 19 and 21 contain wrapped columns. The importer lists adjacent line indexes explicitly to retain phrase pairs, sometimes combining multiple sentences into one complete source turn. The English-only heading on page 6 is excluded from phrase pairing but retained in page text. The Karen cell for twenty-five spills onto page 26 while its English/roman are on page 25; both pages are cited. Mixed-font ZOA ordering on page 21 was checked against the rendered page. Original tokens and raw page text remain available for audit.

## Runtime behavior

- Exact whole-query matches use the source phrase directly. They do not use fuzzy matching or join word translations into a sentence. English contraction/case/terminal punctuation and Karen spacing are normalized. Ambiguous Karen phrases with different English meanings require context instead of choosing silently.
- The client does local course lookup before asking for a password/consent. It makes no paid request for an exact match. The server validates authentication before its equivalent exact path and makes no OpenAI request for that path.
- Novel text retrieves up to 8 relevant complete course records, including page links, and sends them with the existing dictionary context to OpenAI. Retrieval is lexical; it will miss some paraphrases and Thai questions without project aliases. The full PDF is not sent on every request or magically learned by the model.
- KTWG roman readings are kept separate from Wiktionary's romanization rules. Thai meanings/readings added by the project are labeled and not attributed to KTWG as verbatim Thai source content.

## Verification

44 automated tests pass, including exact name-question variants, reverse Karen lookup, Thai aliases, no-provider-call assertion, source-context forwarding for a novel sentence, cross-page number pairing, exclusion of flagged conversions, and dictionary reachability for all 451 enabled records. API-generative tests use a mock provider. This verifies the software and source alignment cases, not native-level fluency for new sentences.
