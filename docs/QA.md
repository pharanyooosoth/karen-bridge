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
