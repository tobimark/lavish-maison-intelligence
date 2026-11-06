# POC-005 replay evidence

TEST_ONLY technical fixture only; no customer scenario or media is claimed.

- `validator-report.json`: actual `poc:validate --dir <temporary TEST_ONLY fixture> --replay` report.
  The fixture has no files under `apps/web/public/scenario-media`, so L4 correctly fails with
  `MEDIA_MISSING`; L3 is the POC-005 checkpoint projection result and passes all five expected
  checkpoints. L1/L2 pass, L5 is NOT_RUN without a media report. `runnable` is false.
- Source fixture: `tests/fixtures/poc/build-fixture.ts` (`TEST_ONLY` synthetic technical fixture).
- The validator bridge is `apps/web/demo/poc/replay/node-loader.mjs`; it transpiles the same
  authoritative `domain/replay.ts` reducer in memory for the Node CLI. No product runtime uses it.

Command used to regenerate the report (the temp directory name varies):

```powershell
node --import ./apps/web/demo/poc/replay/register.mjs --input-type=module -e "<create temporary fixture dir from createFixture(), then run scripts/poc/validate-scenario.mjs --dir <dir> --replay --report evidence/poc/replay/validator-report.json>"
```

Unit coverage in `tests/poc/replay.test.ts` also invokes the CLI with a temp fixture and checks
`L3=pass` and `checkpointProjection={status:'pass',checked:5}`.
