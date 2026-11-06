# POC-002 FIX-02 subtitle parsing evidence (new, independent)

This directory is **new evidence only** for FIX-POC-002-02. It does not modify
the original POC-002 evidence, the FIX-01 evidence, or the main-control recheck
artifacts under `evidence/poc/reviews/POC-002/`.

## Main-control recheck case (now failing as required)

`subtitle-recheck-result.json` + `subtitle-recheck-report.json` reproduce the
exact case from the main-control probe:

```vtt
WEBVTT

00:00:00.000 --> 00:00:01.000
Expected

00:01.000 --> 00:02.000
Unexpected extra cue
```

with a bound script that has only the `Expected` cue (0–1000 ms). The fixed
parser consumes both cue blocks (HH:MM:SS.mmm and MM:SS.mmm), counts **2 cues**,
and returns:

- CLI **exit 1**
- `SUBTITLE_CUE_COUNT_MISMATCH`, `assets.json` `/data/assets/0/uri`
- subtitle `cues=2`, `scriptVersionId=scn-scent-layering.script.en`,
  **`textMatched=false`**, `parseErrors=[]`
- L5 `fail` for this test-only input (not a customer package)

The prior behavior (exit 0, `textMatched=true`, extra cue silently dropped) is
gone.

## Good technical sample (fixed parser)

`technical-sample-report.json` is a fresh run against the TEST_ONLY technical
package/media (same synthetic fixture family as FIX-01). It still records:

- 1080×1920 / 15000 ms; canPlay, unequal shot-start seeks
  `[2000,5000,9000,14500]` all exact; playback delta > 0.
- Subtitle: 3 cues, bound to `scriptversion.test-en`, `textMatched=true`,
  `parseErrors=[]`.
- `ffprobe: not_run` (no local ffprobe) → **L5=not_run**, never PASS.

## Regression coverage

`npm run test:unit -- tests/poc/media-validation.test.ts` → **25 passed**. In
addition to the original 19 cases (playback delta, cross-port 0 requests,
ffprobe invalid duration, script-driven subtitle/shots, corrupt/fake/dim/duration/
404/redirect/MIME/unseekable/range), FIX-02 adds:

| case | expected |
|---|---|
| extra MM:SS cue vs 1 script cue | counted as 2 → `SUBTITLE_CUE_COUNT_MISMATCH`, `textMatched=false`, exit 1 |
| mixed valid + invalid timing cue | `SUBTITLE_TIME_INVALID`, exit 1; bad cue not dropped |
| illegal time components (`00:99:...`) | `SUBTITLE_TIME_INVALID` |
| legal NOTE/STYLE/REGION blocks | recognized as non-cue, 3 cues match, exit 0 |
| unknown non-cue block | `SUBTITLE_BLOCK_UNRECOGNIZED`, exit 1 |
| exact main-control two-cue/one-cue shape | exit 1, 2 cues, `textMatched=false` |

Parser behavior: every content block must be a legal WEBVTT header, NOTE/STYLE/
REGION block, or a parsed cue; malformed timing/cue structure is an explicit
error. Supported timestamp subset is HH:MM:SS.mmm and MM:SS.mmm; unsupported or
invalid timestamps are rejected, not skipped.

## Real customer media

Still **NOT_RUN**: no A/B/C package/media received. The real media command exits
2 with a NOT_RUN message and writes no fake report. ffprobe remains absent →
L5 not_run.

## Hashes

| artifact | bytes | sha256 |
|---|---:|---|
| `scripts/poc/verify-media.mjs` | 36,910 | `d875840f9e968c23d5790517c0fe267621e52c103f2d3892d8c120cd91b13869` |
| `tests/poc/media-validation.test.ts` | 28,180 | `3d59fd86cbdabb593d995a5128eee83d30ab08e28964338cd66a99bc36393bd7` |
| `evidence/poc/media/fix-02/subtitle-recheck-result.json` | 2,271 | `32df1b0259605e6463055a12b3d9ab7637f5091a5541e811811f0a7c1ee294bc` |
| `evidence/poc/media/fix-02/subtitle-recheck-report.json` | 1,726 | `a8c4273a240167a34bee4d2c84baf23e517afbe7e41cc67407358bf2c336b96f` |
| `evidence/poc/media/fix-02/technical-sample-report.json` | 3,806 | `6cf992fec5130baa6fbd45dfb6a4d135d80f57b3ca15a396318fc4fcd829d594` |
| `tests/fixtures/poc/media/README.md` | 3,624 | `21c95b0c0953afd43ad3741ff84d4165708a908c98109d1c2a8ec84e9bd6077c` |
| original POC-002 report (unchanged) | 3,062 | `8bd1b2d6656847a53004d4890b0b56fc17cfb3a57a888e17645b1f1445e746c7` |
| FIX-01 technical report (unchanged) | 3,779 | `e0be74d1c782fa3021e29729f81d4d3da74a40f97119e9bc21dfd847a199eb44` |
