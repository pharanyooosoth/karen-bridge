# Verification

## Automated tests

`npm test`: Thai, English, Karen and romanized lookup; exact phrase handling; unknown input; normalization preserving tone marks; audio-only filtering; unknown text segmentation; per-entry attribution; data counts; pagination.

`npm run build`: produces a GitHub Pages-compatible dist with relative asset URLs, including dictionary JSON and attribution. No secrets or environment configuration are required.

## Manual browser checklist

- Thai น้ำ → ထံ → water and Thai draft, source, no-audio label.
- English thank you → တၢ်ဘျုး, romanization and IPA.
- Karen ထံ → water / น้ำ.
- Unknown sentence → no invented translation.
- Audio-only filter excludes water; ส้มโอ has a Commons recording and attribution.
- Save/unsave and refresh persistence; JSON export.
- Responsive narrow viewport: no horizontal overflow, menus reachable, stacked cards.
- Voice input is feature-gated and handles denied permission/network/no speech; live microphone accuracy needs a person speaking Thai/English and the browser service.
- External audio needs a live network; unavailable media shows a useful message and source link.

Native-speaker linguistic validation is separate from software verification and remains pending.

## Image translation (v1.2)

Automated tests use a mocked OpenAI response, never real credentials: missing configuration, authentication, CORS, request limits, image signature spoofing, request schema/store:false, incomplete/refused/malformed output, provider errors/timeouts, and per-process rate limiting. These verify software behavior, not Karen OCR or translation accuracy.

Actual OpenAI calls and linguistic accuracy remain unverified until the owner configures the backend/key and tests representative Karen images with a speaker. Static GitHub Pages remains usable without that configuration.

Browser check (2026-11-12): unconfigured API correctly disables AI buttons; editing Karen text and opening its dictionary match works, including the Thai reading. Automated file selection was blocked by Chrome extension file-URL permissions, so actual file selection/preview was not verified in this session. No image or text was sent to OpenAI.

## Thai-reading reverse lookup (v1.3)

Tests cover ที → ထံ → น้ำ/water; both user-provided thank-you spellings; optional spaces and hyphens; preserving Thai tone marks; every available reading round-tripping to its source entry; homophones, exact-before-partial ranking, audio filters, and no fabricated results for unknown readings. Thai-meaning and romanization search remain separate modes.

## Reference-assisted reading (v1.4)

Mock-provider tests verify explicit language/dialect/reference forwarding, separate target/reference image roles, dictionary context and source links, reference precedence, no Sgaw dictionary substitution for Burmese, withholding unsupported readings, rejection of dotted-circle OCR guesses, and empty translation in reading-only mode. This does not establish linguistic accuracy. User-reported failures involve tiny crops from a month chart; retest with full chart as reference and verify row alignment with a speaker. No real credentials are needed by tests.

2026-11-12: all 32 automated tests and the static build pass. Browser check against a local mock confirmed the Thai Sgaw default, reading-only mode, လါ → ลา from the project dictionary with an approximation label, and withholding that Sgaw reading when Burmese is selected. No live OpenAI request was made in this check. The user identifies the chart as Sgaw Karen in Thailand; this context is now the default dialect hint, not a claim of independently verified pronunciation.
# Sentence translation (v1.5)

2026-11-13: 36 tests pass. Mock-provider tests cover all six language directions, full sentence/newline/context forwarding, invalid/same-language requests rejected before a paid call, Karen-target pronunciation tied to the translation rather than Thai source meaning, and suppressing irrelevant Karen readings for Thai-English. Tests validate software behavior, not Karen sentence accuracy. No API key or access code is available locally for a live provider test.

Browser QA: the local mock successfully rendered a sentence result and missing-reading notice. Swapping languages reused the translation as source and cleared stale results. Production provider accuracy remains unverified.

## KTWG source integration (v1.6)

44 tests pass. The name-question case from the user is covered as an exact source lookup with zero provider calls. Source rows, wrapping, cross-page number 25, Thai aliases, reverse Karen lookup, reference forwarding, 451 searchable entries and 4 quarantined conversions have regression coverage. See KTWG-IMPORT.md.

Browser check: with no configured local API/key, the sentence menu answered What is your name? directly from KTWG page 3, showing the source roman and labeled Thai approximation. The dictionary menu found the same row. Password and consent were left empty, confirming local lookup.
