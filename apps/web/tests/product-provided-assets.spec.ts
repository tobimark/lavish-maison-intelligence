import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

// FLOW-002 moved the identity -> hero -> video progression into the Journey
// creative stage. Evidence for the moved layout lives with the connected-flow
// work, not in the old home-correction folder.
const EVIDENCE = process.env.EVIDENCE_ROOT
  ? path.resolve(process.env.EVIDENCE_ROOT)
  : path.resolve(process.cwd(), 'evidence', 'product', 'workspace-integration', 'ws-002', 'provided-assets');
const MP4 = path.resolve(process.cwd(), 'assets', 'provided', 'scent-layering', '1.0.0', 'final-preview.mp4');
const CAMPAIGN = 'scn-scent-layering.brief.main';
const JOURNEY_CREATIVE = `/campaigns/${CAMPAIGN}/journey?scenarioVersion=1.1.0&stage=creative`;

async function settle(page: Page) {
  await page.waitForLoadState('load');
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(150);
}

async function shot(page: Page, name: string, fullPage = false) {
  mkdirSync(EVIDENCE, { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(EVIDENCE, name), fullPage, animations: 'disabled' });
}

async function open(page: Page, url = '/') {
  await page.goto(url, { waitUntil: 'load' });
  await settle(page);
}

/** Measures the three equal-frame creative steps in the Journey creative stage. */
async function measureSteps(page: Page) {
  return page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-testid^="journey-step-"][data-role]'));
    return cards.map((card) => {
      const rect = card.getBoundingClientRect();
      const media = card.querySelector<HTMLElement>('[data-testid^="journey-step-media-"]');
      const mediaRect = media?.getBoundingClientRect();
      return {
        role: card.getAttribute('data-role'),
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        mediaTop: mediaRect?.top ?? null,
        mediaBottom: mediaRect?.bottom ?? null,
        mediaHeight: mediaRect?.height ?? null,
      };
    });
  });
}

async function openDownloads(page: Page) {
  const details = page.getByTestId('deliverables-downloads');
  await expect(details).toBeVisible();
  if (!(await details.evaluate((element) => element.hasAttribute('open')))) {
    await details.locator('summary').first().click();
    await expect(details).toHaveAttribute('open', '');
  }
}

function spread(values: number[]): number {
  return Math.max(...values) - Math.min(...values);
}

test('homepage leads with the connected-case purpose and a compact four-stage summary', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);

  await expect(page.getByTestId('overview-page')).toBeVisible();
  const h1 = page.locator('h1');
  await expect(h1).toHaveCount(1);
  await expect(h1).toHaveText('From social trends to your next Lavish campaign.');
  await expect(page.getByText('Explore a market insight, review the creative, and preview a simulated social post.')).toBeVisible();
  await expect(page.getByTestId('ov-explore-journey')).toHaveAttribute(
    'href',
    `/radar?campaignId=${CAMPAIGN}&scenarioVersion=1.1.0`,
  );
  await expect(page.getByTestId('home-journey-summary')).toBeVisible();
  await expect(page.getByTestId('home-creative-progression')).toHaveCount(0);
  const stageTargets: Array<[string, string]> = [
    ['insight', '/radar'], ['strategy', '/opportunities'], ['creative', '/atelier'], ['social', '/deliverables'],
  ];
  for (const [stage, target] of stageTargets) {
    await expect(page.getByTestId(`home-journey-step-${stage}`)).toHaveAttribute(
      'href',
      `${target}?campaignId=${CAMPAIGN}&scenarioVersion=1.1.0`,
    );
  }
  await expect(page.locator('nav[aria-label="Six workspaces"] [data-workspace]')).toHaveCount(6);
  await expect(page.getByTestId('ov-downloads-empty')).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await shot(page, 'home-connected-1440.png');

  await page.setViewportSize({ width: 1366, height: 768 });
  await settle(page);
  await expect(page.getByTestId('ov-explore-journey')).toBeVisible();
  await expect(page.locator('nav[aria-label="Six workspaces"] [data-workspace]')).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await shot(page, 'home-connected-1366.png');
});

test('journey creative stage keeps identity -> campaign visual -> provided video in equal frames', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, JOURNEY_CREATIVE);

  await expect(page.getByTestId('journey-stage-creative')).toBeVisible();
  const roles = await page.locator('[data-testid^="journey-step-"][data-role]').evaluateAll(
    (nodes) => nodes.map((node) => node.getAttribute('data-role')),
  );
  expect(roles).toEqual(['product_identity', 'hero', 'final_preview']);

  const boxes = await measureSteps(page);
  expect(boxes.map((box) => box.left)).toEqual([...boxes.map((box) => box.left)].sort((a, b) => a - b));
  expect(spread(boxes.map((box) => box.width))).toBeLessThanOrEqual(1);
  expect(spread(boxes.map((box) => box.top))).toBeLessThanOrEqual(2);
  expect(spread(boxes.map((box) => box.bottom))).toBeLessThanOrEqual(2);
  expect(spread(boxes.map((box) => box.mediaTop ?? 0))).toBeLessThanOrEqual(2);
  expect(spread(boxes.map((box) => box.mediaBottom ?? 0))).toBeLessThanOrEqual(2);
  for (const box of boxes) {
    expect(box.mediaHeight).toBeGreaterThanOrEqual(238);
    expect(box.mediaHeight).toBeLessThanOrEqual(242);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);

  const identity = page.getByTestId('journey-creative-identity');
  const hero = page.getByTestId('journey-creative-hero');
  await expect(identity).toBeVisible();
  await expect(hero).toBeVisible();
  expect(await identity.evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight, getComputedStyle(img).objectFit]))
    .toEqual([2000, 2000, 'contain']);
  expect(await hero.evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight, getComputedStyle(img).objectFit]))
    .toEqual([2560, 1440, 'contain']);
  const video = page.getByTestId('journey-video');
  await expect(video).toBeVisible();
  expect(await video.evaluate((node: HTMLVideoElement) => ({ controls: node.controls, paused: node.paused, fit: getComputedStyle(node).objectFit })))
    .toEqual({ controls: true, paused: true, fit: 'contain' });
  await shot(page, 'journey-creative-equal-frames-1440.png');

  await page.setViewportSize({ width: 1366, height: 768 });
  await settle(page);
  const boxes1366 = await measureSteps(page);
  expect(spread(boxes1366.map((box) => box.width))).toBeLessThanOrEqual(1);
  expect(spread(boxes1366.map((box) => box.top))).toBeLessThanOrEqual(2);
  expect(spread(boxes1366.map((box) => box.bottom))).toBeLessThanOrEqual(2);
  for (const box of boxes1366) {
    expect(box.mediaHeight).toBeGreaterThanOrEqual(238);
    expect(box.mediaHeight).toBeLessThanOrEqual(242);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await shot(page, 'journey-creative-equal-frames-1366.png');
});

test('the provided video plays, pauses, seeks and replays inside the creative stage', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, JOURNEY_CREATIVE);

  const video = page.getByTestId('journey-video');
  await expect(video).toBeVisible();
  await page.waitForFunction(() => {
    const node = document.querySelector('[data-testid="journey-video"]') as HTMLVideoElement | null;
    return Boolean(node && node.readyState >= 1 && node.duration > 0);
  });
  const media = await video.evaluate((node: HTMLVideoElement) => ({
    width: node.videoWidth,
    height: node.videoHeight,
    duration: node.duration,
    controls: node.controls,
    paused: node.paused,
    fit: getComputedStyle(node).objectFit,
  }));
  expect(media).toMatchObject({ width: 720, height: 960, controls: true, paused: true, fit: 'contain' });
  expect(Math.abs(media.duration - 10.08)).toBeLessThan(0.2);
  expect(Math.abs(media.width / media.height - 3 / 4)).toBeLessThan(0.01);
  await expect(page.locator('[data-testid="journey-video"] track')).toHaveCount(0);

  await video.evaluate((node: HTMLVideoElement) => { node.muted = true; });
  await video.evaluate(async (node: HTMLVideoElement) => { await node.play(); });
  await page.waitForFunction(() => (document.querySelector('[data-testid="journey-video"]') as HTMLVideoElement).currentTime > 0.15);
  await video.evaluate((node: HTMLVideoElement) => node.pause());
  expect(await video.evaluate((node: HTMLVideoElement) => node.paused)).toBe(true);
  await video.evaluate((node: HTMLVideoElement) => { node.currentTime = 7.56; });
  await page.waitForFunction(() => Math.abs((document.querySelector('[data-testid="journey-video"]') as HTMLVideoElement).currentTime - 7.56) < 0.25);
  await video.evaluate(async (node: HTMLVideoElement) => { node.currentTime = 0; await node.play(); });
  await page.waitForFunction(() => (document.querySelector('[data-testid="journey-video"]') as HTMLVideoElement).currentTime > 0.1);
  await video.evaluate((node: HTMLVideoElement) => node.pause());
  await shot(page, 'journey-creative-video-1440.png');
});

test('homepage CTA opens the real Journey and the six workspaces remain reachable without sessions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);

  await page.getByTestId('ov-explore-journey').click();
  await expect(page).toHaveURL((url) => url.pathname === '/radar' && url.searchParams.get('campaignId') === CAMPAIGN);
  await expect(page.getByTestId('journey-stage-insight')).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId('overview-page')).toBeVisible();

  await page.getByTestId('ov-explore').click();
  await expect(page).toHaveURL((url) => url.pathname === '/opportunities');
  await page.goBack();
  await page.getByTestId('ov-creative').click();
  await expect(page).toHaveURL(/\/atelier/);

  const sessions = await page.evaluate(async () => {
    const request = indexedDB.open('lavish-poc-content-v1');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction('sessions', 'readonly');
    const countRequest = tx.objectStore('sessions').count();
    const count = await new Promise<number>((resolve, reject) => {
      countRequest.onsuccess = () => resolve(countRequest.result);
      countRequest.onerror = () => reject(countRequest.error);
    });
    db.close();
    return count;
  });
  expect(sessions).toBe(0);
});

test('narrow viewport stacks the three creative steps in reading order without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, JOURNEY_CREATIVE);
  await expect(page.getByTestId('journey-video')).toBeVisible();
  await expect(page.locator('[data-testid^="journey-step-"][data-role]')).toHaveCount(3);

  const roles = await page.locator('[data-testid^="journey-step-"][data-role]').evaluateAll(
    (nodes) => nodes.map((node) => node.getAttribute('data-role')),
  );
  expect(roles).toEqual(['product_identity', 'hero', 'final_preview']);
  const boxes = await measureSteps(page);
  expect(boxes[0].top).toBeLessThan(boxes[1].top);
  expect(boxes[1].top).toBeLessThan(boxes[2].top);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await expect(page.getByTestId('journey-video')).toBeVisible();
  await shot(page, 'journey-creative-390.png', true);
});

test('creative progression lives only in the Journey, not on Home, Brief or Deliverables', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  await expect(page.getByTestId('overview-page')).toBeVisible();
  await expect(page.getByTestId('home-creative-progression')).toHaveCount(0);
  await expect(page.getByTestId('home-journey-summary')).toBeVisible();

  await open(page, '/deliverables');
  await expect(page.getByTestId('deliverables-page')).toBeVisible();
  await openDownloads(page);
  await expect(page.getByTestId('provided-showcase-deliverables')).toBeVisible();
  await expect(page.locator('[data-testid="provided-showcase-deliverables"] [data-stage]')).toHaveCount(0);
  await shot(page, 'deliverables-compact-regression-1440.png');

  await page.goto(`/campaigns/${CAMPAIGN}/brief`, { waitUntil: 'load' });
  await settle(page);
  await expect(page.getByTestId('campaign-brief-page')).toBeVisible();
  await expect(page.getByTestId('home-creative-progression')).toHaveCount(0);
  await expect(page.getByTestId('provided-showcase-overview')).toHaveCount(0);
});

test('bilingual campaign pack includes the bound EN+AR content and the supplied original MP4', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/deliverables');
  await openDownloads(page);
  await expect(page.getByTestId('DEL-bilingual')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('DEL-bilingual').click();
  const download = await downloadPromise;
  const zipPath = path.join(EVIDENCE, 'bilingual-campaign-pack-with-video.zip');
  mkdirSync(EVIDENCE, { recursive: true });
  await download.saveAs(zipPath);
  const bytes = readFileSync(zipPath);
  const text = bytes.toString('latin1');
  expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK');
  expect(text).toContain('en/script.json');
  expect(text).toContain('ar/script.json');
  expect(text).toContain('EXPORT.json');
  expect(text).toContain('provided/final-preview.mp4');
  expect(text).toContain('provided/hero-serenity.png');
  expect(text).toContain('provided/product-serenity.png');
  expect(text).toContain('"noVideo": false');
  expect(text).toContain('"providedAssetSetId": "provided.scent-layering.serenity-v1"');
  await expect(page.getByText(/Bilingual pack started/)).toBeVisible();
});

test('provided video download still yields the original MP4 bytes from Deliverables', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/deliverables');
  await openDownloads(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('provided-video-download').click();
  const download = await downloadPromise;
  const downloaded = path.join(EVIDENCE, 'deliverables-provided-final-preview.mp4');
  await download.saveAs(downloaded);
  const bytes = readFileSync(downloaded);
  const source = readFileSync(MP4);
  expect(bytes.length).toBe(1315394);
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(createHash('sha256').update(source).digest('hex'));
});
