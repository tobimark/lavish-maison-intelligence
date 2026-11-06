import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const OUT = process.env.EVIDENCE_ROOT
  ? path.join(path.resolve(process.env.EVIDENCE_ROOT), 'interaction-audit.json')
  : path.resolve(process.cwd(), 'evidence', 'product', 'workspace-integration', 'ws-004', 'as-audit', 'interaction-audit.json');
const A_CAMPAIGN = 'scn-scent-layering.brief.main';

async function collect(page: Page): Promise<string[]> {
  return page.evaluate(() => Array.from(document.querySelectorAll('[data-control-id]'))
    .map((element) => element.getAttribute('data-control-id') ?? '')
    .filter((id) => id.startsWith('AS-')));
}

test('records AS asset-control DOM presence and marks native/FLOW-adjacent features NOT_RUN honestly', async ({ page }) => {
  test.setTimeout(120_000);
  const observed = new Set<string>();
  const states: Record<string, string[]> = {};

  await page.goto('/', { waitUntil: 'load' });
  await expect(page.getByTestId('overview-page')).toBeVisible();
  states.overview = await collect(page);
  for (const id of states.overview) observed.add(id);

  await page.goto(`/campaigns/${A_CAMPAIGN}/brief`, { waitUntil: 'load' });
  await expect(page.getByTestId('campaign-brief-page')).toBeVisible();
  states.brief = await collect(page);
  for (const id of states.brief) observed.add(id);

  await page.goto('/opportunities/scn-scent-layering.analysis.main', { waitUntil: 'load' });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  states.opportunity = await collect(page);
  for (const id of states.opportunity) observed.add(id);

  await page.goto('/atelier?campaignId=scn-scent-layering.brief.main&language=en', { waitUntil: 'load' });
  await expect(page.getByTestId('atelier-page')).toBeVisible();
  states.atelier = await collect(page);
  for (const id of states.atelier) observed.add(id);

  await page.goto('/library', { waitUntil: 'load' });
  await expect(page.getByTestId('library-page')).toBeVisible();
  states.library = await collect(page);
  for (const id of states.library) observed.add(id);

  await page.goto('/deliverables', { waitUntil: 'load' });
  await expect(page.getByTestId('deliverables-page')).toBeVisible();
  states.deliverables = await collect(page);
  for (const id of states.deliverables) observed.add(id);

  await page.goto(`/campaigns/${A_CAMPAIGN}/journey?scenarioVersion=1.1.0&stage=creative`, { waitUntil: 'load' });
  await expect(page.getByTestId('journey-stage-creative')).toBeVisible();
  states.journeyCreative = await collect(page);
  for (const id of states.journeyCreative) observed.add(id);

  // Real provided video facts from the Atelier result panel (3:4 native controls).
  await page.goto('/atelier?campaignId=scn-scent-layering.brief.main&language=en', { waitUntil: 'load' });
  const video = page.getByTestId('provided-video');
  await expect(video).toHaveCount(1);
  await page.waitForFunction(() => {
    const node = document.querySelector('[data-testid="provided-video"]') as HTMLVideoElement | null;
    return Boolean(node && node.readyState >= 1 && node.duration > 0);
  });
  const media = await video.evaluate((node: HTMLVideoElement) => ({
    controls: node.controls,
    width: node.videoWidth,
    height: node.videoHeight,
    duration: node.duration,
    paused: node.paused,
  }));
  expect(media.controls).toBe(true);
  expect(media.width).toBe(720);
  expect(media.height).toBe(960);
  expect(Math.abs(media.duration - 10.08)).toBeLessThan(0.2);

  const available = [
    'AS-BRIEF-OPEN', 'AS-BRIEF-ATELIER', 'AS-IDENTITY-OPEN', 'AS-HERO-PREVIEW',
    'AS-VIDEO-TAB', 'AS-PACK-VERSIONS', 'AS-PACK-DOWNLOAD', 'AS-VIDEO-DOWNLOAD', 'AS-IMAGE-DOWNLOAD',
  ];
  const notRun = [
    'AS-HERO-EXPLORE',
    'AS-SHOT-{shotId}',
    'AS-VIDEO-PLAY', 'AS-VIDEO-SEEK', 'AS-VIDEO-REPLAY', 'AS-VIDEO-AUDIO', 'AS-VIDEO-ERROR',
    'AS-LIB-TYPE-{type}',
    'AS-HANDOFF-EXPAND',
  ];
  const missing = available.filter((id) => !observed.has(id));
  const audit = {
    scope: 'as_ip_batch_as006_dom_audit',
    checkedAt: new Date().toISOString(),
    matrix: 'docs/INTERACTION_AUDIT_MATRIX.csv',
    states,
    observedAsControlIds: [...observed].sort(),
    available,
    missingFromDom: missing,
    notRun,
    media,
    limitations: [
      'SERENITY A 1.1.0 is published and bound; no awaiting-content NOT_RUN remains.',
      'AS-HERO-EXPLORE no longer exists after the parallel FLOW batch replaced the Overview creative CTA with the connected-case Journey CTA; the Journey CTA is covered in product-provided-assets.spec.ts.',
      'AS-SHOT/AS-VIDEO-PLAY/SEEK/REPLAY/AUDIO/ERROR/AS-LIB-TYPE/AS-HANDOFF are native controls, static storyboard, single-select filtering or secondary mail UI without per-control data-control-id; they are exercised by product-atelier/library/provided-assets or marked NOT_RUN in the matrix audit.',
      'FLOW (journey/connected flow) controls are present in the workspace but outside FAST_06 AS acceptance and were not modified.',
    ],
  };
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
  expect(missing).toEqual([]);
});
