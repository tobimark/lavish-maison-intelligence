# POC-007 component evidence

TEST_ONLY technical preview, no customer content or API calls.

Actual Playwright run (Chromium 156.0.8078.4, production `next start` on 127.0.0.1:3100):

```powershell
npm run test:e2e -- theme.spec.ts shell.spec.ts poc-components.spec.ts
```

Result: **24 passed** (8 POC-007 + 16 pre-existing theme/shell), exit 0.

Captured and manually opened:
- `components-1440-en.png` — desktop, full component surface.
- `components-1366-en.png` — common laptop width.
- `components-1920-en.png` — wide desktop.
- `components-390-en.png` — mobile; stepper scrolls internally, no document overflow.
- `components-arabic-1440.png` — Arabic sample shown with `lang=ar dir=rtl` and `bdi` ID handling.
- `components-dialog-1440.png` — dialog open, focused close control (focus ring), inert background.
- `components-drawer-1440.png` — 480px drawer and loading skeleton.
- `components-drawer-390.png` — full-width mobile drawer.
- `components-replay-1440.png` — replay controls after seek/speed interaction.

No claim of main-control visual acceptance or M1 sign-off. TASK-007 shell is reused as submitted.
