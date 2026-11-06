# FIX-POC-004-01 recovery / real-browser evidence

New evidence only; it does not modify the original POC-004 report or main
control evidence.

## Real Chromium IndexedDB smoke

Source:
- `qa.html` + `qa.ts`: TEST_ONLY harness loaded by a temporary Vite dev server
  from the repository root; it imports the real `storage/indexeddb.ts` module.
- `smoke.mjs`: Playwright Chromium script that opens two tabs in one browser
  context and exercises refresh, two-tab CAS and raw corruption export.
- `browser-smoke.json`: actual result.

Command (server was a temporary local Vite dev server on 127.0.0.1:5179, then
killed):

```powershell
npx vite --host 127.0.0.1 --port 5179 --strictPort
node evidence/poc/storage/fix-01/smoke.mjs
```

Actual result (exit 0):
- Chromium `156.0.8078.4` (Playwright bundled browser).
- Refresh: session created, mutated to revision 1, page reloaded, storage
  restored revision 1.
- Two tabs: same revision 0, two different keys concurrently → exactly one
  success, one `REVISION_CONFLICT`, stored revision 1.
- Corrupt raw export: overwrite raw IndexedDB session workflow with
  `INVALID_STATE`; normal read fails `CORRUPT_SESSION` with the raw record
  retained, `exportSession` returns status `corrupt`, error code
  `CORRUPT_SESSION`, invalid workflow `INVALID_STATE`, and the creation receipt.

No product UI, public route, customer content, external network or dependency
was added. The harness is only for the storage boundary.

## Fake IndexedDB and API evidence

`npm run test:unit -- tests/poc/mock-api.test.ts tests/poc/storage.test.ts` →
32 passed: pagination all 21 events (limit 1/2/100), deep persisted envelope
validation, raw corrupt/unsupported export, receipt-first original response,
creation original data/meta, Memory isolation, replay user-entity leak,
strict replay action fields, package-changed run_record export.

## Hash

`browser-smoke.json` SHA-256 is recorded in the FIX report.
