# Self-hosted font provenance (TASK-006)

All runtime fonts are served from this repository (`apps/web/public/fonts/`); the page
makes no Google Fonts / CDN font requests. Files below were copied byte-for-byte from
pinned npm packages, not edited or subset further.

| Family | Package (pinned) | Font version | File (public/fonts) | Bytes | SHA-256 | License |
|---|---|---|---|---|---|---|
| Inter | `@fontsource-variable/inter@5.3.0` | v20 (variable wght) | `inter-latin-wght-normal.woff2` | 48,256 | `3100e775e8616cd2611beecfa23a4263d7037586789b43f035236a2e6fbd4c62` | OFL-1.1 (`Inter-OFL-1.1.txt`) |
| Inter | `@fontsource-variable/inter@5.3.0` | v20 (variable wght) | `inter-latin-ext-wght-normal.woff2` | 85,068 | `34b9c504cab7a73e37b746343a449132e56cf7b5481af2cb81dc74dcff25c956` | OFL-1.1 (`Inter-OFL-1.1.txt`) |
| Noto Sans Arabic | `@fontsource-variable/noto-sans-arabic@5.3.0` | v33 (variable wght) | `noto-sans-arabic-arabic-wght-normal.woff2` | 165,960 | `ce85091f020920b65762b387b194ef59457ea5b25b760f2dcc35240a94bb8669` | OFL-1.1 (`NotoSansArabic-OFL-1.1.txt`) |
| Noto Sans Arabic | `@fontsource-variable/noto-sans-arabic@5.3.0` | v33 (variable wght) | `noto-sans-arabic-latin-wght-normal.woff2` | 31,416 | `fed070abc960c5f214fcb02b7b178cdab751ef7facd79a899f571bc21d38b8f8` | OFL-1.1 (`NotoSansArabic-OFL-1.1.txt`) |

- Weight axis: 100–900 (variable). `@font-face` declarations live in `apps/web/styles/globals.css` and use the
  family names `Inter` and `Noto Sans Arabic` exactly as referenced by `design/tokens.css`
  (`--font-ui`, `--font-ar`).
- Unicode subsets follow the fontsource metadata: Inter latin + latin-ext; Noto Sans Arabic
  arabic + latin (the latin subset is required for Latin product names / SKUs inside Arabic
  paragraphs).
- The license text files are the unmodified `LICENSE` files shipped by the packages
  (SIL Open Font License 1.1). Copyright lines: Inter “Copyright 2016 The Inter Project
  Authors”; Noto Sans Arabic “Copyright 2022 The Noto Project Authors”.
- Package versions are pinned in `apps/web/package.json` (`devDependencies`): the packages
  are the provenance/source record; runtime uses the committed `public/fonts/` files only.
