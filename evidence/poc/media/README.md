# POC-002 media evidence

## Data source / scope

- Executor: DeepSeek 4.1 Flash 1017 (this session), 2026-11-04 Asia/Shanghai.
- No customer/ChatGPT scenario package or real media has been received; the
  three catalog scenarios remain `awaiting_content`.
- The only media used here is the **TEST_ONLY** synthetic technical fixture in
  [`tests/fixtures/poc/media/`](../../../tests/fixtures/poc/media/README.md),
  generated locally (ffmpeg/libx264 colour source + Pillow poster). It contains
  no brand/product imagery and is not registered in the catalog or public media.
- `technical-sample-report.json` is an actual `verify-media` report for a
  temporary TEST_ONLY package served over local HTTP (Range supported). It is not
  a customer-scenario L5 pass.

## What the technical sample proves

`technical-sample-report.json` (packageHash
`ef34545a892d51543db2a1cbf35b83afee5502a84a8cd147a3c96b5f0a0ec925`):

- HTTP GET 200 for MP4, poster and WebVTT; Content-Type and bytes/SHA-256 matched.
- Browser metadata: video **1080×1920, 15000 ms**; actual seek to 3750/7500/13500 ms
  settled at those times; playback advanced; poster decoded **1080×1920**; WebVTT
  had 3 in-range cues.
- `ffprobe: not_run` because no local `ffprobe` executable exists in this
  environment. Per POC_MEDIA_RULES, L5 is therefore **not_run**, never PASS;
  `runnable=false`, `errors=[]`.

## Negative detection (unit tests, no customer data)

`npm run test:unit -- tests/poc/media-validation.test.ts` → **14 passed**. It
covers: corrupt/truncated MP4 decode failure; PNG renamed `.mp4` MIME/signature
failure; wrong dimensions; wrong duration (100 ms tolerance); HTTP 404; external
redirect rejection; Content-Type mismatch; a no-Range response detected as
unseekable; out-of-range WebVTT cues; missing package exit 2 NOT_RUN; plus
ffprobe JSON/seek/VTT helper tests. Failure cases return exit 1 with
`file` + `jsonPointer` errors in the report.

## Real customer media: NOT_RUN

The contract command for a real package

```powershell
node scripts/poc/verify-media.mjs --dir scenarios/scent-layering/1.0.0 \
  --base-url http://127.0.0.1:3100 --report evidence/poc/media/scenario-a-report.json
```

currently prints `NOT_RUN: scenario directory not found — the complete customer
package/media has not been received; no media PASS is claimed.` and exits 2.
No `scenario-a-report.json` is written; no media is fabricated. This must not be
reported as L5 pass. The same command is the entry point once A's ten JSON files
and real MP4/poster/VTT/media rights are delivered and a Web server is running.

## Reproduce

```powershell
npm run test:unit -- tests/poc/media-validation.test.ts
# technical sample report was generated with the test fixture package and a
# temporary Range-capable local static server; see the test file for the server.
```

## Tool / fixture hashes

| artifact | bytes | sha256 |
|---|---:|---|
| `scripts/poc/verify-media.mjs` | 27,787 | `2da02bbc0091461465243858cf1fbe679e81fb6a7a71f6afb4c47994ce7aa7c2` |
| `tests/poc/media-validation.test.ts` | 18,562 | `0c9764e39439d7419b3d7200bd5f8cac0951151d8549674a81f36b0e7e06fa1b` |
| `evidence/poc/media/technical-sample-report.json` | 3,062 | `8bd1b2d6656847a53004d4890b0b56fc17cfb3a57a888e17645b1f1445e746c7` |

The real-scenario media report is intentionally absent because no complete
customer package/media exists yet.
