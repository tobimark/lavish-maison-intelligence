import { test, expect, type Page } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

/**
 * IP-BATCH-FIX-02 · Matrix DOM audit.
 *
 * The audit opens every required UI state (six routes, drawers, editor,
 * Advanced, library preview/export, Deliverables details, mail drawer, dirty
 * guard) and records which data-control-id values actually exist in the DOM.
 * The resulting evidence/product/ip-009/matrix-dom-audit.json is the DOM
 * presence authority used by interaction-audit.json.
 */

const ROOT = process.cwd();
const MATRIX = path.join(ROOT, 'docs', 'INTERACTION_AUDIT_MATRIX.csv');
const OUT_DIR = process.env.EVIDENCE_ROOT
  ? path.resolve(process.env.EVIDENCE_ROOT)
  : path.join(ROOT, 'evidence', 'product', 'workspace-integration', 'ws-004', 'matrix');
const OUT_FILE = path.join(OUT_DIR, 'matrix-dom-audit.json');

const CAMPAIGNS = [
  { campaignId: 'scn-scent-layering.brief.main', opportunityId: 'scn-scent-layering.analysis.main' },
  { campaignId: 'scn-luxury-gifting.brief.main', opportunityId: 'scn-luxury-gifting.analysis.main' },
  { campaignId: 'scn-oud-storytelling.brief.main', opportunityId: 'scn-oud-storytelling.analysis.main' },
];

const SCRIPT_VERSION_IDS = [
  'scn-scent-layering.script.en-v1',
  'scn-scent-layering.script.ar-v1',
  'scn-luxury-gifting.script.en-v1',
  'scn-luxury-gifting.script.ar-v1',
  'scn-oud-storytelling.script.en-v1',
  'scn-oud-storytelling.script.ar-v1',
];

interface MatrixRow {
  rowNumber: number;
  controlId: string;
  page: string;
  testId: string;
}

interface ObservedControl {
  state: string;
  visible: boolean;
}

function readMatrix(): MatrixRow[] {
  const lines = readFileSync(MATRIX, 'utf8').trim().split(/\r?\n/);
  return lines.slice(1).map((line, index) => {
    const cells = line.split(',');
    return { rowNumber: index + 2, controlId: cells[0].trim(), page: cells[1].trim(), testId: cells[7]?.trim() ?? '' };
  });
}

class DomAudit {
  readonly examples = new Map<string, ObservedControl>();
  private readonly states: string[] = [];

  constructor(private readonly page: Page) {}

  private static escape(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  patternFor(controlId: string): RegExp {
    if (!controlId.includes('{')) {
      return new RegExp(`^${DomAudit.escape(controlId)}$`);
    }
    const parts = controlId.split(/\{[^}]+\}/g).map((part) => DomAudit.escape(part));
    return new RegExp(`^${parts.join('.+')}$`);
  }

  async collect(state: string): Promise<void> {
    this.states.push(state);
    const found = await this.page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-control-id]')).map((element) => ({
        id: element.getAttribute('data-control-id') ?? '',
        visible: element.getBoundingClientRect().width > 0 || element.getBoundingClientRect().height > 0,
      })),
    );
    for (const entry of found) {
      if (!entry.id) continue;
      if (!this.examples.has(entry.id)) this.examples.set(entry.id, { state, visible: entry.visible });
    }
  }

  observedIds(): string[] {
    return [...this.examples.keys()];
  }

  stateEvidenceFor(controlId: string, observedIds: string[]): string[] {
    const states = new Set<string>();
    for (const id of observedIds) {
      const example = this.examples.get(id);
      if (example) states.add(example.state);
    }
    if (states.size === 0) return [];
    return [controlId, ...states].slice(0, 8);
  }

  allStates(): string[] {
    return [...new Set(this.states)];
  }
}

test.describe.configure({ mode: 'serial' });

test('records every matrix Control ID from real DOM states and writes matrix-dom-audit.json', async ({ page }) => {
  test.setTimeout(300_000);
  const matrix = readMatrix();
  const flowRows = matrix.filter((row) => row.controlId.startsWith('FLOW-') || row.controlId.startsWith('OV-journey-') || row.controlId === 'OV-explore-journey');
  const pendingAssetRows = matrix.filter((row) => row.controlId.startsWith('AS-'));
  const baseRows = matrix.filter((row) => !row.controlId.startsWith('AS-') && !flowRows.includes(row));
  expect(baseRows.length, 'the original IP matrix must keep 101 rows').toBe(101);
  expect(pendingAssetRows.length, 'the AS matrix must keep 18 rows').toBe(18);
  expect(flowRows.length, 'the FLOW matrix rows must be present for traceability').toBe(36);
  expect(baseRows.length + pendingAssetRows.length + flowRows.length, 'matrix row total').toBe(matrix.length);
  const audit = new DomAudit(page);
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  // ---------------------------------------------------------- Deliverables + export
  await page.goto('/deliverables', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await audit.collect('deliverables-default');
  await expect(page.getByTestId('deliverables-page')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('DEL-download').click();
  await downloadPromise;
  await page.waitForTimeout(1200);
  await audit.collect('deliverables-after-download-details');
  await expect(page.getByTestId('export-table')).toBeVisible();

  // ---------------------------------------------------------------- Mail drawer
  await page.getByTestId('MAIL-open').click();
  await page.waitForTimeout(700);
  await audit.collect('mail-drawer-gate');
  await page.getByTestId('MAIL-confirm-script').click();
  await page.waitForTimeout(3000);
  await audit.collect('mail-drawer-confirmed');
  await page.getByTestId('MAIL-save').click();
  await page.waitForTimeout(1400);
  await audit.collect('mail-draft-saved');
  await page.getByTestId('MAIL-simulate').click();
  await page.waitForTimeout(300);
  await audit.collect('mail-confirmation');
  await page.getByTestId('MAIL-record').click();
  await page.waitForTimeout(1600);
  await audit.collect('mail-attempt-recorded');
  await page.getByTestId('MAIL-failure').click();
  await page.waitForTimeout(1600);
  await expect(page.getByTestId('MAIL-retry')).toBeVisible();
  await audit.collect('mail-failure-and-retry');
  await page.getByTestId('MAIL-close').click();
  await page.waitForTimeout(400);

  // -------------------------------------------------------------------- Overview
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await audit.collect('overview');
  await expect(page.locator('[data-testid^="ov-recent-export-"]')).toHaveCount(1);

  // ----------------------------------------------------------------------- Radar
  await page.goto('/radar', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await audit.collect('radar-default');
  const signalIds = (await page.locator('[data-control-id^="RAD-signal-"]').evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('data-control-id') ?? ''),
  )).filter(Boolean);
  expect(signalIds.length, 'all fifteen signals must expose RAD-signal-*').toBe(15);
  for (const signalId of signalIds) {
    await page.locator(`[data-control-id="${signalId}"]`).first().click();
    await page.waitForTimeout(350);
    await audit.collect(`radar-drawer-${signalId}`);
    await page.locator('[data-control-id="RAD-drawer-close"]').first().click();
    await page.waitForTimeout(250);
  }

  await page.goto('/radar?campaignId=scn-does-not-exist.brief&topic=Editorial%20gift%20selection', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await audit.collect('radar-empty-state');

  await page.goto('/radar', { waitUntil: 'networkidle' });
  await page.getByTestId('ACT-open').click();
  await page.waitForTimeout(700);
  await audit.collect('activity-drawer-preset');
  await page.getByTestId('ACT-view-mine').click();
  await page.waitForTimeout(300);
  await audit.collect('activity-drawer-your-actions');
  await page.getByTestId('ACT-view-preset').click();
  await page.waitForTimeout(300);
  await page.getByTestId('ACT-close').click();
  await page.waitForTimeout(250);

  await page.goto(`/campaigns/${CAMPAIGNS[0].campaignId}/brief`, { waitUntil: 'load' });
  await expect(page.getByTestId('campaign-brief-page')).toBeVisible();
  await audit.collect('campaign-brief');

  // ---------------------------------------------------------------- Opportunities
  await page.goto('/opportunities', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await audit.collect('opportunities-list');
  for (const opportunity of CAMPAIGNS) {
    await page.goto(`/opportunities/${opportunity.opportunityId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await audit.collect(`opportunity-detail-${opportunity.opportunityId}`);
    await page.getByTestId('OPP-assumptions').locator('summary').click();
    await page.waitForTimeout(200);
    await audit.collect(`opportunity-assumptions-${opportunity.opportunityId}`);
  }

  // -------------------------------------------------------------------- Atelier
  for (const campaign of CAMPAIGNS) {
    await page.goto(`/atelier?campaignId=${campaign.campaignId}&language=en`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    await audit.collect(`atelier-${campaign.campaignId}`);
  }
  await page.goto(`/atelier?campaignId=${CAMPAIGNS[0].campaignId}&language=en`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.getByTestId('AT-edit').click();
  await page.waitForTimeout(1600);
  await audit.collect('atelier-editor-fields');
  await page.getByTestId('AT-advanced').click();
  await page.waitForTimeout(300);
  await audit.collect('atelier-editor-advanced');
  await page.getByTestId('AT-field-hook').fill('DOM audit dirty hook');
  await page.getByTestId('AT-editor-close').click();
  await page.waitForTimeout(500);
  await audit.collect('dirty-guard-dialog');
  await page.getByTestId('guard-discard').click();
  await page.waitForTimeout(400);
  await expect(page.getByTestId('atelier-editor')).toBeHidden();

  // -------------------------------------------------------------------- Library
  await page.goto('/library', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await audit.collect('library-default');
  await page.locator('[data-control-id^="LIB-preview-"]').first().click();
  await page.waitForTimeout(500);
  await audit.collect('library-preview-drawer');
  await page.getByTestId('LIB-close').click();
  await page.waitForTimeout(300);
  await page.goto('/library?campaignId=scn-luxury-gifting.brief.main&origin=saved', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await audit.collect('library-empty-state');

  await page.goto(`/campaigns/${CAMPAIGNS[0].campaignId}/journey?scenarioVersion=1.1.0&stage=creative`, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await audit.collect('journey-creative');

  await page.goto('/library', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await audit.collect('library-provided-assets');

  // ------------------------------------------------------- Compare with matrix
  const observed = audit.observedIds();
  const rows = [...baseRows, ...pendingAssetRows].map((row) => {
    const pattern = audit.patternFor(row.controlId);
    const matches = observed.filter((id) => pattern.test(id));
    return { row, matches };
  });

  const templateMinimums: Record<string, number> = {
    'OV-opportunity-card-{analysisId}': 3,
    'OV-campaign-card-{briefId}': 3,
    'OV-recent-export-{exportId}': 1,
    'RAD-signal-{signalId}': 15,
    'RAD-evidence-{evidenceId}': 15,
    'RAD-opportunity-{analysisId}': 3,
    'OPP-card-{analysisId}': 3,
    'OPP-evidence-{evidenceId}': 15,
    'OPP-signal-{signalId}': 15,
    'AT-version-{versionId}': 6,
    'AT-field-{field}': 6,
    'LIB-preview-{versionId}-{kind}': 12,
    'DEL-details-{exportId}': 1,
    'DEL-redownload-{exportId}': 1,
    'MAIL-field-{field}': 2,
    'MAIL-export-attempt-{attemptId}': 1,
    'AT-campaign-{campaignId}': 3,
    'AT-version-{versionId}-{sessionId|preset}': 6,
    'AT-advanced-field-{field}': 24,
    'DEL-version-{versionId}-{sessionId|preset}': 6,
  };

  const guardedReason = 'DEL-retry is only rendered after a real export preparation/storage error; no fake failure can be induced in the browser. Recovery: retry the same Download content pack action, which does not show a false success.';

  const asNotRunReasons: Record<string, string> = {
    'OV-explore': 'The FLOW batch replaced the original Overview “Explore opportunities” CTA with the connected-case Journey CTA (OV-explore-journey). The old CTA no longer exists; the new journey CTA is exercised in product-provided-assets.spec.ts.',
    'OV-creative': 'The FLOW batch replaced the original Overview “Browse creative work” CTA with the six-workspace navigation/Journey links. The old CTA no longer exists and is not claimed as present.',
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

  const knownPatterns = matrix.map((row) => audit.patternFor(row.controlId));
  const flowObserved = observed.filter((id) => id.startsWith('FLOW-') || id.startsWith('OV-journey-') || id.startsWith('OV-explore-journey'));
  const unexpected = observed.filter((id) => !id.startsWith('AS-PACK-VERSION-') && !flowObserved.includes(id) && !knownPatterns.some((pattern) => pattern.test(id)));
  const missing = controls.filter((control) => !control.found && !control.guarded && !control.notRun);
  const notRun = controls.filter((control) => control.notRun);

  const output = {
    scope: 'interactive_mock_product_matrix_dom',
    checkedAt: new Date().toISOString(),
    matrix: 'docs/INTERACTION_AUDIT_MATRIX.csv',
    matrixRowCount: matrix.length,
    auditedRows: controls.length,
    flowRows: flowRows.map((row) => row.controlId),
    flowRowsNote: '36 added FLOW/social controls are real DOM controls verified in product-connected-flow.spec.ts and product-social-publish.spec.ts; the AS-006 DOM audit above intentionally keeps its original 119-row scope so the accepted AS evidence stays comparable.',
    pendingAssetRows: [],
    baseUrl: page.url().replace(/^(https?:\/\/[^/]+).*/, '$1'),
    states: audit.allStates(),
    summary: {
      controls: controls.length,
      found: controls.filter((control) => control.found).length,
      guarded: controls.filter((control) => control.guarded).length,
      notRun: notRun.length,
      notFound: missing.length,
      unexpectedControls: unexpected.length,
      observedControlIds: observed.length,
    },
    controls,
    unexpectedControls: unexpected,
    outOfScopeFlowControls: flowObserved,
    outOfScopeNote: 'FLOW batch controls (journey/connected flow) are present in the workspace but are outside FAST_06 AS acceptance; they are listed here for traceability and were not modified.',
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  expect(missing, `missing matrix controls: ${missing.map((control) => control.controlId).join(', ')}`).toEqual([]);
  expect(unexpected, `unexpected data-control-id values: ${unexpected.join(', ')}`).toEqual([]);
  expect(pageErrors, `page errors during DOM audit: ${pageErrors.join(' | ')}`).toEqual([]);
  expect(controls.length).toBe(baseRows.length + pendingAssetRows.length);
});
