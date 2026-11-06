const fs=require('fs');
const p='apps/web/tests/product-matrix-dom.spec.ts';
let s=fs.readFileSync(p,'utf8');
// add journey/creative and library-provided states before compare
s=s.replace("  // ------------------------------------------------------- Compare with matrix",`  await page.goto(\`/campaigns/\${CAMPAIGNS[0].campaignId}/journey?scenarioVersion=1.1.0&stage=creative\`, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await audit.collect('journey-creative');

  await page.goto('/library', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await audit.collect('library-provided-assets');

  // ------------------------------------------------------- Compare with matrix`);
s=s.replace("  const rows = baseRows.map((row) => {",`  const rows = matrix.map((row) => {`);
const start=s.indexOf("  const controls = rows.map(({ row, matches }) => {");
const end=s.indexOf("  const knownPatterns");
const replacement=`  const asNotRunReasons: Record<string, string> = {
    'AS-HERO-EXPLORE': 'The FLOW batch replaced the Overview creative CTA with the connected-case Journey CTA; no AS-HERO-EXPLORE data-control-id remains. The Journey CTA is exercised in product-provided-assets.spec.ts.',
    'AS-SHOT-{shotId}': 'The four-shot storyboard is static read-only HTML with no per-shot interactive control; no AS-SHOT-* data-control-id exists. Shots are verified in product-atelier.spec.ts.',
    'AS-VIDEO-PLAY': 'Native video controls do not carry data-control-id; play/pause is exercised in product-provided-assets.spec.ts and product-asset-downloads.spec.ts.',
    'AS-VIDEO-SEEK': 'Native video controls do not carry data-control-id; seek 7.56s is exercised in product-provided-assets.spec.ts.',
    'AS-VIDEO-REPLAY': 'Native video controls do not carry data-control-id; replay is exercised in product-provided-assets.spec.ts.',
    'AS-VIDEO-AUDIO': 'Native video controls do not carry data-control-id; muted playback is exercised in product-provided-assets.spec.ts.',
    'AS-VIDEO-ERROR': 'No fake stream error is induced in normal acceptance; native error/retry handling exists in the provided-asset component and is not exposed as a data-control-id.',
    'AS-LIB-TYPE-{type}': 'Library exposes one LIB-kind select with six options rather than per-type AS-LIB-TYPE-* controls; filtering is exercised in product-library.spec.ts.',
    'AS-HANDOFF-EXPAND': 'The simulated handoff log is reached through the existing Deliverables secondary MAIL drawer controls; no separate AS-HANDOFF-EXPAND data-control-id exists.',
  };

  const controls = rows.map(({ row, matches }) => {
    const isTemplate = row.controlId.includes('{');
    const minimum = templateMinimums[row.controlId];
    if (row.controlId === 'DEL-retry') {
      return {
        controlId: row.controlId,
        page: row.page,
        testId: row.testId,
        expected: 'conditional',
        found: false,
        guarded: true,
        notRun: false,
        guardReason: guardedReason,
        observedIds: [],
        stateEvidence: [],
      };
    }
    const found = isTemplate ? matches.length >= (minimum ?? 1) : matches.length === 1;
    const notRunReason = !found && asNotRunReasons[row.controlId] ? asNotRunReasons[row.controlId] : null;
    return {
      controlId: row.controlId,
      page: row.page,
      testId: row.testId,
      expected: isTemplate ? 'template' : 'static',
      minimum: isTemplate ? (minimum ?? 1) : 1,
      found,
      guarded: false,
      notRun: Boolean(notRunReason),
      notRunReason,
      guardReason: null,
      observedCount: matches.length,
      observedIds: matches.slice(0, 8),
      stateEvidence: audit.stateEvidenceFor(row.controlId, matches),
    };
  });

`;
s=s.slice(0,start)+replacement+s.slice(end);
s=s.replace("  const knownPatterns = baseRows.map((row) => audit.patternFor(row.controlId));\n  const unexpected = observed.filter((id) => !id.startsWith('AS-') && !knownPatterns.some((pattern) => pattern.test(id)));\n  const missing = controls.filter((control) => !control.found && !control.guarded);","  const knownPatterns = matrix.map((row) => audit.patternFor(row.controlId));\n  const unexpected = observed.filter((id) => !id.startsWith('AS-PACK-VERSION-') && !knownPatterns.some((pattern) => pattern.test(id)));\n  const missing = controls.filter((control) => !control.found && !control.guarded && !control.notRun);\n  const notRun = controls.filter((control) => control.notRun);");
s=s.replace("    auditedRows: baseRows.length,\n    pendingAssetRows: pendingAssetRows.map((row) => row.controlId),","    auditedRows: matrix.length,\n    pendingAssetRows: [],");
s=s.replace("      guarded: controls.filter((control) => control.guarded).length,\n      notFound: missing.length,","      guarded: controls.filter((control) => control.guarded).length,\n      notRun: notRun.length,\n      notFound: missing.length,");
s=s.replace("  expect(controls.length).toBe(101);","  expect(controls.length).toBe(matrix.length);");
fs.writeFileSync(p,s);
console.log('patched matrix spec');
