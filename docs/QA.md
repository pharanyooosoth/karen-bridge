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
