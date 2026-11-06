import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const EVIDENCE = path.resolve(process.cwd(), 'evidence/product/connected-flow/main-review-2026-11-06');
const CAMPAIGN = 'scn-scent-layering.brief.main';
const VERSION = '1.1.0';
const STAGES = ['insight', 'strategy', 'creative', 'social'] as const;

function journeyUrl(stage?: (typeof STAGES)[number]): string {
  const base = `/campaigns/${CAMPAIGN}/journey?scenarioVersion=${VERSION}`;
  return stage ? `${base}&stage=${stage}` : base;
}

async function settle(page: Page) {
  await page.waitForLoadState('load');
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(150);
}

async function open(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'load' });
  await settle(page);
}

async function shot(page: Page, name: string, fullPage = false) {
  mkdirSync(EVIDENCE, { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(EVIDENCE, name), fullPage, animations: 'disabled' });
}

/** Same storage-truth pattern as product-navigation.spec.ts: browsing must not write. */
async function businessCounts(page: Page): Promise<{ sessions: number; exports: number; social: number }> {
  return page.evaluate(async (dbName) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const count = (store: string) => new Promise<number>((resolve, reject) => {
      if (!db.objectStoreNames.contains(store)) {
        resolve(0);
        return;
      }
      const transaction = db.transaction(store, 'readonly');
      const request = transaction.objectStore(store).count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const sessions = await count('sessions');
    const exports = await count('productExports');
    const social = await count('socialWorkflows');
    db.close();
    return { sessions, exports, social };
  }, 'lavish-poc-content-v1');
}

test.describe('FLOW-002 · connected campaign journey', () => {
  test('home offers one primary case entry, and the CTA opens the insight stage', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, '/');

    await expect(page.getByTestId('overview-page')).toBeVisible();
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText('From social trends to your next Lavish campaign.');
    await expect(page.getByText('Explore a market insight, review the creative, and preview a simulated social post.')).toBeVisible();
    await expect(page.getByTestId('ov-explore-journey')).toHaveAttribute('href', journeyUrl());
    await expect(page.getByTestId('home-journey-summary')).toBeVisible();
    await expect(page.getByTestId('home-creative-progression')).toHaveCount(0);
    for (const stage of STAGES) {
      await expect(page.getByTestId(`home-journey-step-${stage}`)).toHaveAttribute('href', `${journeyUrl()}&stage=${stage}`);
    }
    await expect(page.locator('nav[aria-label="Six workspaces"] [data-workspace]')).toHaveCount(6);

    await page.getByTestId('ov-explore-journey').click();
    await expect(page).toHaveURL((url) => url.pathname === `/campaigns/${CAMPAIGN}/journey` && url.searchParams.get('scenarioVersion') === VERSION);
    await expect(page.getByTestId('journey-page')).toBeVisible();
    await expect(page.getByTestId('journey-stage-insight')).toBeVisible();
    await expect(page.getByTestId('journey-tab-insight')).toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('journey-campaign-name')).toContainText('SERENITY');
    await expect(page.getByTestId('journey-context')).toContainText('Demo · Mock');
    await expect(page.getByTestId('journey-product-image')).toBeVisible();

    const counts = await businessCounts(page);
    expect(counts.sessions, 'opening the journey must not create a working session').toBe(0);
    expect(counts.exports, 'browsing must not write export records').toBe(0);
    expect(counts.social, 'browsing must not create social drafts or attempts').toBe(0);
  });

  test('each stage is a real deep link with its own content and no prior-stage lock', async ({ page }) => {
    const markers: Record<(typeof STAGES)[number], string> = {
      insight: 'journey-observations',
      strategy: 'journey-why-product',
      creative: 'journey-video',
      social: 'journey-stage-social',
    };
    for (const stage of STAGES) {
      await open(page, journeyUrl(stage));
      await expect(page.getByTestId(`journey-stage-${stage}`)).toBeVisible();
      await expect(page.getByTestId(markers[stage])).toBeVisible();
      await expect(page.getByTestId(`journey-tab-${stage}`)).toHaveAttribute('aria-current', 'page');
      for (const other of STAGES) {
        if (other === stage) continue;
        await expect(page.getByTestId(`journey-tab-${other}`)).not.toHaveAttribute('aria-current', 'page');
      }
      await expect(page.getByTestId('journey-context')).toBeVisible();
      await expect(page.getByTestId('journey-campaign-name')).toContainText('SERENITY');
      await expect(page.getByTestId('journey-tabs')).toBeVisible();
    }
  });

  test('refresh keeps the same campaign, exact version and reading position', async ({ page }) => {
    await open(page, journeyUrl('creative'));
    await expect(page.getByTestId('journey-tab-creative')).toHaveAttribute('aria-current', 'page');

    await page.reload({ waitUntil: 'load' });
    await settle(page);

    await expect(page.getByTestId('journey-stage-creative')).toBeVisible();
    await expect(page.getByTestId('journey-tab-creative')).toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('journey-campaign-name')).toContainText('SERENITY');
    await expect(page).toHaveURL((url) => new URL(url).searchParams.get('stage') === 'creative'
      && new URL(url).searchParams.get('scenarioVersion') === VERSION);
  });

  test('stage tabs navigate with real links and keep the active state truthful', async ({ page }) => {
    await open(page, journeyUrl('insight'));
    await page.getByTestId('journey-tab-strategy').click();
    await expect(page).toHaveURL((url) => url.searchParams.get('stage') === 'strategy');
    await expect(page.getByTestId('journey-stage-strategy')).toBeVisible();
    await expect(page.getByTestId('journey-tab-strategy')).toHaveAttribute('aria-current', 'page');

    await page.getByTestId('journey-tab-creative').click();
    await expect(page).toHaveURL((url) => url.searchParams.get('stage') === 'creative');
    await expect(page.getByTestId('journey-stage-creative')).toBeVisible();
    await expect(page.getByTestId('journey-tab-creative')).toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('journey-tab-strategy')).not.toHaveAttribute('aria-current', 'page');

    await page.getByTestId('journey-tab-social').click();
    await expect(page).toHaveURL((url) => url.searchParams.get('stage') === 'social');
    await expect(page.getByTestId('journey-stage-social')).toBeVisible();
    await expect(page.getByTestId('journey-tab-social')).toHaveAttribute('aria-current', 'page');

    // Back/forward keeps the URL-driven reading position.
    await page.goBack();
    await expect(page.getByTestId('journey-stage-creative')).toBeVisible();
    await expect(page.getByTestId('journey-tab-creative')).toHaveAttribute('aria-current', 'page');
    await page.goForward();
    await expect(page.getByTestId('journey-stage-social')).toBeVisible();
    await expect(page.getByTestId('journey-tab-social')).toHaveAttribute('aria-current', 'page');
  });

  test('creative stage shows the SERENITY identity, hero and the real 10.08s provided video', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, journeyUrl('creative'));

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
    await expect(video).toHaveAttribute('src', /final-preview\.mp4$/);
    await expect(video).toHaveAttribute('poster', /hero-serenity\.png$/);
    // The provided MP4 is independent of the 15-second script; no VTT is attached.
    await expect(page.locator('[data-testid="journey-video"] track')).toHaveCount(0);
    await expect(page.getByTestId('journey-video-disclosure')).toContainText('Provided 10.08-second independent preview');
    await expect(page.getByTestId('journey-video-disclosure')).toContainText('15-second four-shot concept script (not produced)');
    await shot(page, 'journey-creative-1440.png');
  });

  test('EN/AR script switch shows the four shots and subtitle text from the real versions', async ({ page }) => {
    await open(page, journeyUrl('creative'));

    await expect(page.getByTestId('journey-script-content')).toHaveAttribute('data-language', 'en');
    await expect(page.getByTestId('journey-script-shot-1')).toContainText('A moment of light.');
    await expect(page.getByTestId('journey-script-shot-2')).toContainText('A floral impression.');
    await expect(page.getByTestId('journey-script-shot-3')).toContainText('A softer, musk-inspired mood.');
    await expect(page.getByTestId('journey-script-shot-4')).toContainText('SERENITY · Lavish Perfumes');
    await expect(page.getByTestId('journey-script-subtitles')).toContainText('A softer, musk-inspired mood.');

    await page.getByTestId('journey-script-ar').click();
    await expect(page.getByTestId('journey-script-content')).toHaveAttribute('data-language', 'ar');
    await expect(page.getByTestId('journey-script-content')).toHaveAttribute('lang', 'ar');
    await expect(page.getByTestId('journey-script-shot-1')).toContainText('لحظة من الضوء.');
    await expect(page.getByTestId('journey-script-ar')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('journey-script-en')).toHaveAttribute('aria-pressed', 'false');

    await page.getByTestId('journey-script-en').click();
    await expect(page.getByTestId('journey-script-content')).toHaveAttribute('data-language', 'en');
    await expect(page.getByTestId('journey-script-shot-1')).toContainText('A moment of light.');
    await expect(page.getByTestId('journey-script-en')).toHaveAttribute('aria-pressed', 'true');
  });

  test('next-step CTAs continue through all four stages and the brief link stays on the same campaign', async ({ page }) => {
    await open(page, journeyUrl('insight'));

    await page.getByTestId('journey-next-insight').click();
    await expect(page).toHaveURL((url) => url.searchParams.get('stage') === 'strategy');
    await expect(page.getByTestId('journey-stage-strategy')).toBeVisible();
    await expect(page.getByTestId('journey-open-brief')).toHaveAttribute('href', `/campaigns/${CAMPAIGN}/brief`);

    await page.getByTestId('journey-next-strategy').click();
    await expect(page).toHaveURL((url) => url.searchParams.get('stage') === 'creative');
    await expect(page.getByTestId('journey-stage-creative')).toBeVisible();

    await page.getByTestId('journey-next-creative').click();
    await expect(page).toHaveURL((url) => url.searchParams.get('stage') === 'social');
    await expect(page.getByTestId('journey-stage-social')).toBeVisible();
  });

  test('unknown campaign/version and invalid stages stay honest and recoverable, never a silent switch', async ({ page }) => {
    await open(page, '/campaigns/does-not-exist/journey?scenarioVersion=1.1.0');
    await expect(page.getByTestId('journey-error')).toBeVisible();
    await expect(page.getByTestId('journey-error')).toContainText('could not be found');
    await expect(page.getByTestId('journey-stage-insight')).toHaveCount(0);

    await open(page, `/campaigns/${CAMPAIGN}/journey`);
    await expect(page.getByTestId('journey-error')).toBeVisible();
    await expect(page.getByTestId('journey-error')).toContainText('Choose a campaign version');
    await expect(page.getByTestId('journey-stage-insight')).toHaveCount(0);

    await open(page, `${journeyUrl()}&stage=manufacture`);
    await expect(page.getByTestId('journey-invalid-stage')).toBeVisible();
    await expect(page.getByTestId('journey-context')).toBeVisible();
    await expect(page.getByTestId('journey-campaign-name')).toContainText('SERENITY');
    await expect(page.getByTestId('journey-tab-insight')).not.toHaveAttribute('aria-current', 'page');
    await page.getByTestId('journey-invalid-insight').click();
    await expect(page.getByTestId('journey-stage-insight')).toBeVisible();
    await expect(page.getByTestId('journey-tab-insight')).toHaveAttribute('aria-current', 'page');
  });

  test('browsing every stage creates no sessions, exports or social records', async ({ page }) => {
    await open(page, journeyUrl('insight'));
    for (const stage of ['strategy', 'creative', 'social', 'insight'] as const) {
      await page.getByTestId(`journey-tab-${stage}`).click();
      await expect(page.getByTestId(`journey-stage-${stage}`)).toBeVisible();
    }
    const counts = await businessCounts(page);
    expect(counts).toEqual({ sessions: 0, exports: 0, social: 0 });
  });

  test('1440 and 1366 keep a single reading area without horizontal overflow', async ({ page }) => {
    for (const viewport of [
      { width: 1440, height: 900, name: '1440' },
      { width: 1366, height: 768, name: '1366' },
    ] as const) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const stage of ['insight', 'strategy', 'creative'] as const) {
        await open(page, journeyUrl(stage));
        await expect(page.getByTestId(`journey-stage-${stage}`)).toBeVisible();
        await expect(page.getByTestId('journey-tabs')).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `${stage} at ${viewport.name}`).toBeLessThanOrEqual(1);
        await shot(page, `journey-${stage}-${viewport.name}.png`);
      }
    }
  });
});
