import { test, expect, type Page } from '@playwright/test';

const DB_NAME = 'lavish-poc-content-v1';

async function businessCounts(page: Page): Promise<{ sessions: number; exports: number }> {
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
    const productExports = await count('productExports');
    db.close();
    return { sessions, exports: productExports };
  }, DB_NAME);
}

async function expectNoConsoleErrors(page: Page, errors: string[]) {
  await page.waitForTimeout(200);
  expect(errors, `console/page errors: ${errors.join(' | ')}`).toEqual([]);
}

test.describe('IP-003 · unified navigation and Overview', () => {
  test('six primary links navigate to real workspaces, highlight correctly and show no Soon placeholders', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

    const routes: Array<{ id: string; href: string; heading: string | RegExp }> = [
      { id: 'overview', href: '/', heading: 'From social trends to your next Lavish campaign.' },
      { id: 'radar', href: '/radar', heading: 'Intelligence Radar' },
      { id: 'opportunities', href: '/opportunities', heading: 'Three opportunities for Lavish' },
      { id: 'atelier', href: '/atelier', heading: /SERENITY — A Story in Layers|A Gesture, Considered|Let the Scent Lead/ },
      { id: 'library', href: '/library', heading: 'Creative Library' },
      { id: 'deliverables', href: '/deliverables', heading: 'Deliverables' },
    ];

    await page.goto('/');
    await expect(page.getByTestId('overview-page')).toBeVisible();
    for (const id of ['overview', 'radar', 'opportunities', 'atelier', 'library', 'deliverables']) {
      await expect(page.getByTestId(`shell-nav-${id}`)).toBeVisible();
    }
    await expect(page.locator('body')).not.toContainText('Soon');

    for (const route of routes) {
      await page.locator(`[data-testid="shell-nav-${route.id}"]`).click();
      await page.waitForURL((url) => new URL(url).pathname === route.href);
      await expect(page.locator('h1').first()).toContainText(route.heading);
      await expect(page.locator(`[data-testid="shell-nav-${route.id}"]`)).toHaveAttribute('aria-current', 'page');
      await expect(page.getByTestId('shell-demo-badge')).toContainText('Demo · Mock data');
      await expectNoConsoleErrors(page, errors);
    }
  });

  test('every workspace can be opened directly in a clean browser with real prepared content and no session', async ({ page }) => {
    const routes: Array<{ path: string; heading: string | RegExp; testId: string }> = [
      { path: '/', heading: 'From social trends to your next Lavish campaign.', testId: 'overview-page' },
      { path: '/radar', heading: 'Intelligence Radar', testId: 'radar-page' },
      { path: '/opportunities', heading: 'Three opportunities for Lavish', testId: 'opportunities-page' },
      { path: '/atelier', heading: /SERENITY — A Story in Layers|A Gesture, Considered|Let the Scent Lead/, testId: 'atelier-page' },
      { path: '/library', heading: 'Creative Library', testId: 'library-page' },
      { path: '/deliverables', heading: 'Deliverables', testId: 'deliverables-page' },
    ];
    for (const route of routes) {
      await page.goto(route.path, { waitUntil: 'networkidle' });
      await expect(page.getByTestId(route.testId)).toBeVisible();
      await expect(page.locator('h1').first()).toContainText(route.heading);
    }
    const counts = await businessCounts(page);
    expect(counts.sessions, 'browsing must not create working sessions').toBe(0);
    expect(counts.exports, 'browsing must not write export records').toBe(0);
  });

  test('Overview leads with one connected-case CTA, six reachable workspaces, all three opportunities and honest downloads', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('overview-page')).toBeVisible();
    await expect(page.locator('h1')).toHaveText('From social trends to your next Lavish campaign.');
    await expect(page.getByText('Explore a market insight, review the creative, and preview a simulated social post.')).toBeVisible();
    await expect(page.getByTestId('ov-explore-journey')).toHaveAttribute(
      'href',
      '/radar?campaignId=scn-scent-layering.brief.main&scenarioVersion=1.1.0',
    );
    await expect(page.locator('nav[aria-label="Six workspaces"] [data-workspace]')).toHaveCount(6);
    await expect(page.getByTestId('ov-explore')).toHaveAttribute('href', '/opportunities?campaignId=scn-scent-layering.brief.main&scenarioVersion=1.1.0');
    await expect(page.getByTestId('ov-creative')).toHaveAttribute('href', '/atelier?campaignId=scn-scent-layering.brief.main&scenarioVersion=1.1.0');
    await expect(page.getByTestId('home-journey-summary')).toBeVisible();
    const stageTargets: Array<[string, string]> = [
      ['insight', '/radar'], ['strategy', '/opportunities'], ['creative', '/atelier'], ['social', '/deliverables'],
    ];
    for (const [stage, target] of stageTargets) {
      await expect(page.getByTestId(`home-journey-step-${stage}`)).toHaveAttribute(
        'href',
        `${target}?campaignId=scn-scent-layering.brief.main&scenarioVersion=1.1.0`,
      );
    }
    await expect(page.getByTestId('home-creative-progression')).toHaveCount(0);
    await expect(page.locator('[data-testid^="ov-opportunity-card-"]')).toHaveCount(3);
    for (const campaignId of ['scn-scent-layering.brief.main', 'scn-luxury-gifting.brief.main', 'scn-oud-storytelling.brief.main']) {
      await expect(page.getByTestId(`ov-campaign-card-${campaignId}`)).toBeVisible();
      await expect(page.getByTestId(`ov-open-campaign-en-${campaignId}`)).toHaveAttribute('href', `/atelier?campaignId=${campaignId}&language=en`);
      await expect(page.getByTestId(`ov-open-campaign-ar-${campaignId}`)).toHaveAttribute('href', `/atelier?campaignId=${campaignId}&language=ar`);
    }
    await expect(page.getByTestId('ov-downloads-empty')).toContainText('Your downloads will appear here');
    const opportunityLinks = page.locator('[data-testid^="ov-view-opportunity-"]');
    await expect(opportunityLinks).toHaveCount(3);
    for (const id of ['scn-scent-layering.analysis.main', 'scn-luxury-gifting.analysis.main', 'scn-oud-storytelling.analysis.main']) {
      await expect(page.getByTestId(`ov-view-opportunity-${id}`)).toHaveAttribute('href', `/opportunities/${id}`);
    }
  });

  test('an unsaved editor draft is protected by Save / Discard / Cancel before leaving', async ({ page }) => {
    await page.goto('/atelier?campaignId=scn-luxury-gifting.brief.main&language=en', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('atelier-page')).toBeVisible();
    await page.getByTestId('AT-edit').click();
    await expect(page.getByTestId('atelier-editor')).toBeVisible();
    await page.getByTestId('AT-field-hook').fill('A draft hook that must not silently disappear');
    await page.locator('[data-testid="atelier-editor"] button', { hasText: 'Close' }).first().click();
    await expect(page.getByTestId('guard-dialog')).toBeVisible();

    await page.getByTestId('guard-cancel').click();
    await expect(page.getByTestId('atelier-editor')).toBeVisible();
    await expect(page.getByTestId('AT-field-hook')).toHaveValue('A draft hook that must not silently disappear');

    await page.locator('[data-testid="atelier-editor"] button', { hasText: 'Close' }).first().click();
    await page.getByTestId('guard-discard').click();
    await expect(page.getByTestId('atelier-editor')).toBeHidden();

    await page.getByTestId('AT-edit').click();
    await expect(page.getByTestId('AT-field-hook')).not.toHaveValue('A draft hook that must not silently disappear');
    await page.locator('[data-testid="atelier-editor"] button', { hasText: 'Close' }).first().click();
  });

  test('breadcrumbs return to real parent routes without losing the Campaign context link', async ({ page }) => {
    await page.goto('/opportunities/scn-luxury-gifting.analysis.main', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('opportunity-detail-page')).toBeVisible();
    await expect(page.getByTestId('shell-nav-opportunities')).toHaveAttribute('aria-current', 'page');
    await page.locator('nav[aria-label="Breadcrumb"] a', { hasText: 'Opportunities' }).click();
    await page.waitForURL((url) => new URL(url).pathname === '/opportunities');
    await expect(page.getByTestId('opportunities-page')).toBeVisible();
    await expect(page.getByTestId('shell-nav-opportunities')).toHaveAttribute('aria-current', 'page');
  });
});
