# POC-002 FIX-01 media evidence (new, independent from the original report)

This directory contains **new evidence only** for FIX-POC-002-01. The original
POC-002 evidence `evidence/poc/media/technical-sample-report.json` and its README
are intentionally left untouched.

## Technical sample (TEST_ONLY)

`technical-sample-report.json` is an actual `verify-media` run against a
temporary TEST_ONLY package served over local HTTP with Range support. It uses
the synthetic fixture media in `tests/fixtures/poc/media/`; it contains no
customer content, product imagery or brand asset, and is not in the catalog or
public media.

- packageHash: `ef34545a892d51543db2a1cbf35b83afee5502a84a8cd147a3c96b5f0a0ec925`
- `ffprobe: not_run` (no local ffprobe installed) → **L5=not_run**; no PASS claim.
- Video: 1080×1920 / 15000 ms; `canPlayReady=true`; `startAtZero=true`.
- Shot-driven seek from the bound script's unequal four shots
  `[0, 2000, 5000, 9000] ms`: targets `[2000, 5000, 9000, 14500] ms` all
  `seeked=true` with exact actual time (plus first-shot zero validation).
- Playback: before 14500 ms → after 14905 ms, **delta 405 ms**, `played=true`
  (no longer based on absolute currentTime).
- Poster: decoded 1080×1920.
- Subtitle: 3 cues, exact bound `scriptVersionId` and text matched = true.
- `media`/`baseUrl`/`ffprobe`/`probeAttempted` remain allowed diagnostic
  extensions; public envelope/packageHash unchanged; `runnable=false`.

## Structured regression matrix (tests)

`npm run test:unit -- tests/poc/media-validation.test.ts` → **19 passed**. New
FIX-01 coverage (keeping the original 14 effective cases):

| Main finding | Regression evidence |
|---|---|
| Controlled `play()` resolves without advancing | test-only env seam stubs play; exit 1, `VIDEO_PLAYBACK_FAILED`, `playback.deltaMs=0` |
| Cross-port redirect treated as same origin | second local server on another port counts **0** requests; exit 1, `EXTERNAL_REDIRECT` |
| ffprobe missing/NaN/Infinity/negative duration | pure parser test rejects with `FFPROBE_DURATION_INVALID`; ffprobe absent still L5 `not_run` |
| Subtitle not compared to script / wrong-shot seek | VTT text/time/count/order/language negative cases; unequal-shot fixture asserts actual seek targets/actuals |
| Existing 14 effective checks | corrupt/fake MP4, dimensions, duration, 404, redirect, MIME, no-Range unseekable, out-of-range VTT, missing package NOT_RUN, helpers |

## Commands / exit codes

| Command | exit |
|---|---|
| `npm run typecheck` | 0 |
| `npm run test:unit -- tests/poc/media-validation.test.ts` | 0 (19 passed) |
| technical sample `verify-media` | 0; L5=not_run (ffprobe missing), errors=[] |
| real customer package media command | 2; NOT_RUN (no package/media received; no report written) |

## Real customer media

Still NOT_RUN: no A/B/C ten-file package, MP4, poster, VTT, product imagery or
rights/content review has been received. The real media command exits 2 with a
NOT_RUN message and writes no fake report. This evidence cannot be used as a
customer L5 pass.

## Hashes

| artifact | bytes | sha256 |
|---|---:|---|
| `scripts/poc/verify-media.mjs` | 34,857 | `acfbda858d61f59dc4d7cd9e5ed2ff4eca9f5328a840d2e1092430ffab566cd2` |
| `tests/poc/media-validation.test.ts` | 24,593 | `20d3b8e0ec1499df26d26d398ad694bbaa2e09c13db3a5a4de059449b3a1fd57` |
| `evidence/poc/media/fix-01/technical-sample-report.json` | 3,779 | `e0be74d1c782fa3021e29729f81d4d3da74a40f97119e9bc21dfd847a199eb44` |
| original `evidence/poc/media/technical-sample-report.json` (unchanged) | 3,062 | `8bd1b2d6656847a53004d4890b0b56fc17cfb3a57a888e17645b1f1445e746c7` |
