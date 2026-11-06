import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const A = 'scn-scent-layering.brief.main';
const EVIDENCE = path.resolve(process.cwd(), 'evidence', 'product', 'workspace-integration', 'ws-001');
const SINCE = `?campaignId=${A}&scenarioVersion=1.1.0`;

async function open(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForLoadState('load');
  await page.waitForTimeout(250);
}

async function counts(page: Page): Promise<{ sessions: number; exports: number; social: number }> {
  return page.evaluate(async (dbName) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const count = (store: string) => new Promise<number>((resolve, reject) => {
      if (!db.objectStoreNames.contains(store)) return resolve(0);
      const tx = db.transaction(store, 'readonly');
      const request = tx.objectStore(store).count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const result = { sessions: await count('sessions'), exports: await count('productExports'), social: await count('socialWorkflows') };
    db.close();
    return result;
  }, 'lavish-poc-content-v1');
}

async function shot(page: Page, name: string) {
  mkdirSync(EVIDENCE, { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(EVIDENCE, name), fullPage: false });
}

test.describe('WS-001 · six-workspace navigation, case context and legacy journey mapping', () => {
  test('keeps exactly the six original menus in order, with no Soon placeholders or second journey entry', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, '/');

    const nav = page.locator('nav[aria-label="Primary"]');
    const labels = await nav.locator('[data-testid^="shell-nav-"]').evaluateAll(
      (nodes) => nodes.map((node) => node.querySelector('[class*="navLabel"]')?.textContent?.trim() ?? ''),
    );
    const ids = await nav.locator('[data-testid^="shell-nav-"]').evaluateAll(
      (nodes) => nodes.map((node) => node.getAttribute('data-testid')),
    );
    expect(ids).toEqual([
      'shell-nav-overview', 'shell-nav-radar', 'shell-nav-opportunities',
      'shell-nav-atelier', 'shell-nav-library', 'shell-nav-deliverables',
    ]);
    expect(labels).toEqual([
      'Overview', 'Intelligence Radar', 'Opportunities', 'Creative Atelier', 'Creative Library', 'Deliverables',
    ]);
    await expect(page.getByText('Soon', { exact: true })).toHaveCount(0);
    await expect(page.getByTestId('shell-nav-overview')).toHaveAttribute('aria-current', 'page');
    await shot(page, '01-overview-six-menus-1440.png');
  });

  test('preserves campaign/version/language when the sidebar changes workspace', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, `/radar${SINCE}&language=ar`);

    await expect(page.getByTestId('shell-nav-radar')).toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('shell-nav-atelier')).toHaveAttribute('href', `/atelier${SINCE}&language=ar`);
    await expect(page.getByTestId('shell-nav-deliverables')).toHaveAttribute('href', `/deliverables${SINCE}&language=ar`);
    await expect(page.getByTestId('shell-nav-opportunities')).toHaveAttribute('href', `/opportunities${SINCE}`);

    await page.getByTestId('shell-nav-opportunities').click();
    await expect(page).toHaveURL((url) => url.pathname === '/opportunities'
      && url.searchParams.get('campaignId') === A
      && url.searchParams.get('scenarioVersion') === '1.1.0');
    await expect(page.getByTestId('shell-nav-opportunities')).toHaveAttribute('aria-current', 'page');

    // Back returns to Radar with the same context; no state was written.
    await page.goBack({ waitUntil: 'load' });
    await expect(page).toHaveURL(/\/radar\?/);
    const countsNow = await counts(page);
    expect(countsNow).toEqual({ sessions: 0, exports: 0, social: 0 });
  });

  test('maps all four legacy journey stages and keeps exact context', async ({ page }) => {
    const mappings: Array<[string, string, string]> = [
      ['insight', '/radar', 'campaignId'],
      ['strategy', '/opportunities', 'campaignId'],
      ['creative', '/atelier', 'campaignId'],
      ['social', '/deliverables', 'campaignId'],
    ];
    for (const [stage, target, key] of mappings) {
      await open(page, `/campaigns/${A}/journey?scenarioVersion=1.1.0&stage=${stage}&language=ar`);
      await expect(page).toHaveURL((url) => url.pathname === target
        && url.searchParams.get(key) === A
        && url.searchParams.get('scenarioVersion') === '1.1.0');
      await expect(page.getByTestId('journey-redirecting')).toHaveCount(0);
    }
    await shot(page, '02-legacy-social-to-deliverables-1440.png');
  });

  test('invalid legacy context stays honest and never silently redirects', async ({ page }) => {
    await open(page, `/campaigns/${A}/journey?scenarioVersion=1.1.0&stage=unknown`);
    await expect(page.getByTestId('journey-error')).toBeVisible();
    await expect(page.getByText('Journey stage not found')).toBeVisible();
    await expect(page).toHaveURL(/\/journey\?/);

    await open(page, `/campaigns/${A}/journey?stage=insight`);
    await expect(page.getByTestId('journey-error')).toBeVisible();
    await expect(page.getByText(/exact campaignId and scenarioVersion/)).toBeVisible();

    await open(page, '/campaigns/scn-does-not-exist.brief.main/journey?scenarioVersion=1.1.0&stage=creative');
    await expect(page.getByTestId('journey-error')).toBeVisible();
    await expect(page).toHaveURL(/\/journey\?/);
    await shot(page, '03-invalid-legacy-context-1440.png');
  });

  test('highlights Opportunities for brief and Deliverables for social detail by pathname', async ({ page }) => {
    await open(page, `/campaigns/${A}/brief`);
    await expect(page.getByTestId('shell-nav-opportunities')).toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('shell-nav-deliverables')).not.toHaveAttribute('aria-current', 'page');

    await open(page, `/campaigns/${A}/social/does-not-exist`);
    await expect(page.getByTestId('shell-nav-deliverables')).toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('shell-nav-opportunities')).not.toHaveAttribute('aria-current', 'page');

    // Browsing these read-only routes creates no session/draft/export.
    expect(await counts(page)).toEqual({ sessions: 0, exports: 0, social: 0 });
    await shot(page, '04-social-detail-deliverables-active-1440.png');
  });
});
const B = 'scn-luxury-gifting.brief.main';
const WS2 = 'evidence/product/workspace-integration/ws-002';

test.describe('WS-002 · first three workspaces carry the campaign business content', () => {
  test('main CTA chain Overview → Radar → Opportunities → Atelier → Deliverables keeps one case context', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'load' });
    await expect(page.getByTestId('ov-explore-journey')).toHaveAttribute('href', `/radar?campaignId=${A}&scenarioVersion=1.1.0`);

    await page.getByTestId('ov-explore-journey').click();
    await expect(page).toHaveURL((url) => url.pathname === '/radar' && url.searchParams.get('campaignId') === A);
    await expect(page.getByTestId('radar-current-case')).toBeVisible();
    await expect(page.getByTestId('journey-stage-insight')).toBeVisible();
    await expect(page.getByText('Key observations')).toBeVisible();
    await page.getByTestId('journey-view-evidence').click();
    await expect(page.getByTestId('journey-evidence-dialog')).toBeVisible();
    await page.getByTestId('journey-evidence-close').click();

    await page.getByTestId('journey-next-insight').click();
    await expect(page).toHaveURL((url) => url.pathname === '/opportunities' && url.searchParams.get('campaignId') === A);
    await expect(page.getByTestId('opportunities-current-strategy')).toBeVisible();
    await expect(page.getByTestId('journey-stage-strategy')).toBeVisible();
    await expect(page.getByTestId('journey-why-product')).toContainText('SERENITY');
    await expect(page.getByTestId('journey-stage-strategy').getByText('Audience', { exact: true }).first()).toBeVisible();

    await page.getByTestId('journey-next-strategy').click();
    await expect(page).toHaveURL((url) => url.pathname === '/atelier' && url.searchParams.get('campaignId') === A);
    await expect(page.getByTestId('atelier-current-creative')).toBeVisible();
    await expect(page.getByTestId('journey-stage-creative')).toBeVisible();
    await expect(page.getByTestId('journey-creative-identity')).toBeVisible();
    await expect(page.getByTestId('journey-creative-hero')).toBeVisible();
    const video = page.getByTestId('journey-video');
    await expect(video).toBeVisible();
    await expect(video).toHaveAttribute('controls', '');
    const media = await video.evaluate((node: HTMLVideoElement) => ({ w: node.videoWidth, h: node.videoHeight, d: node.duration }));
    expect(media.w).toBe(720);
    expect(media.h).toBe(960);
    expect(Math.abs(media.d - 10.08)).toBeLessThan(0.2);
    await expect(page.getByTestId('journey-script-shots')).toBeVisible();

    await page.getByTestId('journey-next-creative').click();
    await expect(page).toHaveURL((url) => url.pathname === '/deliverables' && url.searchParams.get('campaignId') === A);
    await expect(page.getByTestId('social-stage')).toBeVisible();
    await expect(page.getByTestId('deliverables-social-workbench')).toBeVisible();
  });

  test('1440/1366 workspace screenshots show one subject area without horizontal overflow', async ({ page }) => {
    const { mkdirSync } = await import('node:fs');
    const path = await import('node:path');
    const dir = path.resolve(process.cwd(), WS2);
    mkdirSync(dir, { recursive: true });
    const pages: Array<[string, string]> = [
      ['home', '/'],
      ['radar', `/radar?campaignId=${A}&scenarioVersion=1.1.0`],
      ['opportunities', `/opportunities?campaignId=${A}&scenarioVersion=1.1.0`],
      ['atelier', `/atelier?campaignId=${A}&scenarioVersion=1.1.0&language=en`],
    ];
    for (const viewport of [{ width: 1440, height: 900, name: '1440' }, { width: 1366, height: 768, name: '1366' }]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const [name, url] of pages) {
        await page.goto(url, { waitUntil: 'load' });
        await page.waitForTimeout(500);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), `${name}-${viewport.name}`).toBeLessThanOrEqual(1);
        await page.screenshot({ path: path.join(dir, `${name}-${viewport.name}.png`), fullPage: false });
      }
    }
  });

  test('B/C keep their own context and never borrow SERENITY creative or social content', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/atelier?campaignId=${B}&scenarioVersion=1.0.0&language=en`, { waitUntil: 'load' });
    await page.waitForTimeout(700);
    const unavailable = await page.getByTestId('atelier-creative-unavailable').count();
    const pending = await page.getByTestId('journey-pending').count();
    expect(unavailable + pending, 'B must show an honest missing/pending creative state').toBeGreaterThan(0);
    await expect(page.getByTestId('journey-video')).toHaveCount(0);
    await expect(page.getByTestId('journey-creative-identity')).toHaveCount(0);

    await page.goto(`/deliverables?campaignId=${B}&scenarioVersion=1.0.0`, { waitUntil: 'load' });
    await page.waitForTimeout(700);
    await expect(page.getByTestId('deliverables-social-unavailable')).toBeVisible();
    await expect(page.getByTestId('social-stage')).toHaveCount(0);
    await page.getByTestId('deliverables-downloads').locator('summary').first().click();
    await expect(page.getByTestId('deliverables-downloads')).toHaveAttribute('open', '');
  });
});

test.describe('WS-FIX-001 · Library same-path campaign switch keeps sidebar context', () => {
  test('A→B→Atelier/Deliverables/B→C→A, exact-version cleanup, All/Clear and read-only counts', async ({ page }) => {
    const dir = process.env.EVIDENCE_ROOT
      ? path.resolve(process.env.EVIDENCE_ROOT)
      : path.resolve(process.cwd(), 'evidence', 'product', 'workspace-integration', 'ws-fix-001', 'run-default');
    mkdirSync(dir, { recursive: true });
    const shot = async (name: string) => {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(120);
      await page.screenshot({ path: path.join(dir, name), fullPage: false });
    };
    const B = 'scn-luxury-gifting.brief.main';
    const C = 'scn-oud-storytelling.brief.main';
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/library?campaignId=${A}&scenarioVersion=1.1.0&language=en`, { waitUntil: 'load' });
    await expect(page.getByTestId('LIB-campaign')).toBeVisible();
    await page.waitForTimeout(400);
    const before = await counts(page);
    await shot('01-library-A-1440.png');

    await page.getByTestId('LIB-campaign').selectOption(B);
    await expect(page).toHaveURL((url) => url.searchParams.get('campaignId') === B
      && url.searchParams.get('scenarioVersion') === '1.0.0'
      && url.searchParams.get('language') === 'en'
      && !url.searchParams.get('versionId')
      && !url.searchParams.get('sessionId'));
    const atelierHref = await page.getByTestId('shell-nav-atelier').getAttribute('href');
    const deliverablesHref = await page.getByTestId('shell-nav-deliverables').getAttribute('href');
    expect(atelierHref).toBe(`/atelier?campaignId=${B}&scenarioVersion=1.0.0&language=en`);
    expect(deliverablesHref).toBe(`/deliverables?campaignId=${B}&scenarioVersion=1.0.0&language=en`);
    await shot('02-library-B-href-before-click-1440.png');

    await page.getByTestId('shell-nav-atelier').click();
    await expect(page).toHaveURL((url) => url.pathname === '/atelier'
      && url.searchParams.get('campaignId') === B
      && url.searchParams.get('scenarioVersion') === '1.0.0');
    await expect(page.getByTestId('atelier-page')).toContainText('A Gesture, Considered');
    await shot('03-atelier-B-1440.png');
    await page.reload({ waitUntil: 'load' });
    await expect(page.getByTestId('atelier-page')).toContainText('A Gesture, Considered');
    await expect(page).toHaveURL((url) => url.searchParams.get('campaignId') === B);
    await page.goBack({ waitUntil: 'load' });
    await expect(page.getByTestId('LIB-campaign')).toHaveValue(B);
    await expect(page.getByTestId('shell-nav-atelier')).toHaveAttribute('href', `/atelier?campaignId=${B}&scenarioVersion=1.0.0&language=en`);

    await page.getByTestId('shell-nav-deliverables').click();
    await expect(page).toHaveURL((url) => url.pathname === '/deliverables'
      && url.searchParams.get('campaignId') === B
      && url.searchParams.get('scenarioVersion') === '1.0.0');
    await expect(page.getByTestId('deliverables-social-unavailable')).toBeVisible();
    await shot('04-deliverables-B-1440.png');

    await page.getByTestId('shell-nav-library').click();
    await expect(page.getByTestId('LIB-campaign')).toHaveValue(B);
    await page.getByTestId('LIB-campaign').selectOption(C);
    await expect(page).toHaveURL((url) => url.searchParams.get('campaignId') === C
      && url.searchParams.get('scenarioVersion') === '1.0.0');
    await page.getByTestId('LIB-campaign').selectOption(A);
    await expect(page).toHaveURL((url) => url.searchParams.get('campaignId') === A
      && url.searchParams.get('scenarioVersion') === '1.1.0');
    await expect(page.getByTestId('shell-nav-atelier')).toHaveAttribute('href', `/atelier?campaignId=${A}&scenarioVersion=1.1.0&language=en`);
    await shot('05-library-A-return-1440.png');

    await page.getByTestId('LIB-language').selectOption('ar');
    await expect(page).toHaveURL((url) => url.searchParams.get('language') === 'ar');
    await expect(page.getByTestId('shell-nav-atelier')).toHaveAttribute('href', `/atelier?campaignId=${A}&scenarioVersion=1.1.0&language=ar`);
    await expect(page.getByTestId('shell-nav-deliverables')).toHaveAttribute('href', `/deliverables?campaignId=${A}&scenarioVersion=1.1.0&language=ar`);

    await page.getByTestId('LIB-campaign').selectOption('');
    await expect(page).toHaveURL((url) => !url.searchParams.get('campaignId')
      && !url.searchParams.get('scenarioVersion')
      && !url.searchParams.get('versionId')
      && !url.searchParams.get('sessionId'));
    await expect(page.getByTestId('shell-nav-atelier')).toHaveAttribute('href', '/atelier?language=ar');
    await shot('06-library-all-campaigns-1440.png');

    await page.goto(`/library?campaignId=${A}&scenarioVersion=1.1.0&language=en&kind=script&origin=preset`, { waitUntil: 'load' });
    await page.waitForTimeout(500);
    await page.getByTestId('LIB-clear').click();
    await expect(page).toHaveURL((url) => !url.searchParams.toString());
    await expect(page.getByTestId('shell-nav-atelier')).toHaveAttribute('href', '/atelier');

    await page.goto(`/library?campaignId=${A}&scenarioVersion=1.1.0&language=en&versionId=scn-scent-layering.script.en-v2`, { waitUntil: 'load' });
    await page.waitForTimeout(500);
    await page.getByTestId('LIB-campaign').selectOption(B);
    await expect(page).toHaveURL((url) => url.searchParams.get('campaignId') === B
      && url.searchParams.get('scenarioVersion') === '1.0.0'
      && !url.searchParams.get('versionId')
      && !url.searchParams.get('sessionId'));

    expect(await counts(page)).toEqual(before);
  });
});

test.describe('WS-FIX-001 · honest direct context', () => {
  test('unknown campaign and invalid version do not fall back to A; B without version resolves its own version', async ({ page }) => {
    await page.goto(`/library?campaignId=scn-does-not-exist.brief.main&scenarioVersion=1.0.0&language=en`, { waitUntil: 'load' });
    await expect(page.getByTestId('library-unknown-campaign')).toBeVisible();
    await expect(page.getByTestId('shell-nav-atelier')).not.toHaveAttribute('href', /scn-scent-layering/);
    await page.goto(`/library?campaignId=${A}&scenarioVersion=9.9.9&language=en`, { waitUntil: 'load' });
    await expect(page.getByTestId('library-version-error')).toBeVisible();
    await page.goto(`/library?campaignId=scn-luxury-gifting.brief.main&language=en`, { waitUntil: 'load' });
    await expect(page).toHaveURL((url) => url.searchParams.get('scenarioVersion') === '1.0.0');
    await expect(page.getByTestId('shell-nav-atelier')).toHaveAttribute('href', `/atelier?campaignId=scn-luxury-gifting.brief.main&scenarioVersion=1.0.0&language=en`);
  });
});
