# POC-008 prototype evidence

TEST_ONLY composition evidence. No approved A package or customer media is present; all three scenario
entries are `awaiting_content`, so these screens do not represent a completed customer demo chain.

Actual Playwright run (Chromium 156.0.8078.4, production `next start` on 127.0.0.1:3100):

```powershell
npm run test:e2e -- theme.spec.ts shell.spec.ts poc-components.spec.ts poc-prototype.spec.ts
```

Result: **34 passed** (10 POC-008 + 8 components + 16 theme/shell), exit 0.

Captured and manually opened:
- `home-1440-en.png`, `home-1366-en.png`, `home-1920-en.png`, `home-390-en.png` — real homepage,
  three awaiting scenarios and empty local-session state.
- `preview-discovery-1440-en.png` — layout preview disclosure, banner, four-step stepper, empty discovery.
- `preview-analysis-1440-en.png` — brief/script tabs, EN/AR control and Arabic placeholder.
- `preview-video-1440-en.png` — 9:16 media frame without fake footage, empty shot/asset state.
- `preview-delivery-1440-en.png` — mail preview and empty simulated-record state.
- `preview-delivery-390-en.png` — mobile composition; stepper scrolls internally.
- `preview-1440-en.png`, `preview-1366-en.png`, `preview-1920-en.png`, `preview-390-en.png` — four viewports.
- `preview-evidence-drawer-1440.png` — evidence Drawer interaction.

Not represented as completed: A content, real MP4 playback, real script/brief, delivery confirmation, or
business replay driven by an actual session. See POC-008 report NOT_RUN.
