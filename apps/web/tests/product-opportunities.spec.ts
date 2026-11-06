import { test, expect, type Page } from '@playwright/test';

const DB_NAME = 'lavish-poc-content-v1';

async function counts(page: Page): Promise<{ sessions: number; exports: number }> {
  return page.evaluate(async (dbName) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const count = (store: string) => new Promise<number>((resolve, reject) => {
      if (!db.objectStoreNames.contains(store)) return resolve(0);
      const transaction = db.transaction(store, 'readonly');
      const request = transaction.objectStore(store).count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const sessions = await count('sessions');
    const exports = await count('productExports');
    db.close();
    return { sessions, exports };
  }, DB_NAME);
}

const OPPORTUNITIES = [
  { analysisId: 'scn-scent-layering.analysis.main', briefId: 'scn-scent-layering.brief.main', title: 'SERENITY — A Story in Layers' },
  { analysisId: 'scn-luxury-gifting.analysis.main', briefId: 'scn-luxury-gifting.brief.main', title: 'A Gesture, Considered' },
  { analysisId: 'scn-oud-storytelling.analysis.main', briefId: 'scn-oud-storytelling.brief.main', title: 'Let the Scent Lead' },
];

test.describe('IP-005 · Opportunities and explainable strategy detail', () => {
  test('lists exactly three prepared opportunities and links each to its exact strategy detail', async ({ page }) => {
    await page.goto('/opportunities', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('opportunities-page')).toBeVisible();
    for (const opportunity of OPPORTUNITIES) {
      const row = page.getByTestId(`opp-row-${opportunity.analysisId}`);
      await expect(row).toBeVisible();
      await expect(page.getByTestId(`OPP-card-${opportunity.analysisId}`)).toHaveAttribute('href', `/opportunities/${opportunity.analysisId}?campaignId=scn-scent-layering.brief.main&scenarioVersion=1.1.0`);
      await expect(row).toContainText('Recommended action');
      await expect(row).not.toContainText('score');
    }
    await expect(page.locator('[data-testid^="opp-row-"]')).toHaveCount(3);
    expect(await counts(page)).toEqual({ sessions: 0, exports: 0 });
  });

  test('each detail page explains the opportunity, rationale, evidence, assumptions and the complete brief', async ({ page }) => {
    for (const opportunity of OPPORTUNITIES) {
      await page.goto(`/opportunities/${opportunity.analysisId}`, { waitUntil: 'networkidle' });
      await expect(page.getByTestId('opportunity-detail-page')).toBeVisible();
      await expect(page.locator('h1').first()).toContainText(opportunity.title);
      await expect(page.getByTestId('OPP-campaign')).toHaveAttribute('href', `/atelier?campaignId=${opportunity.briefId}`);
      await expect(page.getByText('Why this fits Lavish')).toBeVisible();
      await expect(page.getByText('Campaign brief', { exact: true })).toBeVisible();
      await expect(page.getByText('Verified product facts')).toBeVisible();

      const evidenceCards = page.locator('[data-testid^="OPP-evidence-"]');
      expect(await evidenceCards.count()).toBeGreaterThanOrEqual(4);
      const assumptions = page.getByTestId('OPP-assumptions');
      await expect(assumptions).not.toHaveAttribute('open', '');
      await assumptions.locator('summary').click();
      await expect(assumptions).toHaveAttribute('open', '');
      await expect(assumptions).toContainText('Assumptions');
      await expect(assumptions).toContainText('Uncertainties');

      const signalLink = page.locator('a[href^="/radar?signalId="]').first();
      const href = await signalLink.getAttribute('href');
      expect(href).toMatch(/^\/radar\?signalId=scn-/);
      await signalLink.click();
      await page.waitForURL((url) => url.pathname === '/radar' && Boolean(url.searchParams.get('signalId')));
      await expect(page.getByTestId('radar-signal-drawer')).toBeVisible();
      await page.getByTestId('RAD-drawer-close').click();
      await page.goto(`/opportunities/${opportunity.analysisId}`, { waitUntil: 'networkidle' });
    }
    expect(await counts(page)).toEqual({ sessions: 0, exports: 0 });
  });

  test('an unknown opportunity id shows a truthful Not found and a way back, never silently falling back to A', async ({ page }) => {
    await page.goto('/opportunities/scn-does-not-exist.analysis.main', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('opportunity-not-found')).toBeVisible();
    await expect(page.getByTestId('opportunity-not-found')).toContainText('Opportunity not found');
    await expect(page.getByTestId('opportunity-not-found')).not.toContainText('Your Scent, Your Expression');
    await page.getByTestId('OPP-back').click();
    await page.waitForURL((url) => url.pathname === '/opportunities');
    await expect(page.getByTestId('opportunities-page')).toBeVisible();
    expect(await counts(page)).toEqual({ sessions: 0, exports: 0 });
  });

  test('Open campaign keeps the exact Campaign context and opens the prepared Atelier result without a Run prerequisite', async ({ page }) => {
    await page.goto('/opportunities/scn-luxury-gifting.analysis.main', { waitUntil: 'networkidle' });
    await page.getByTestId('OPP-campaign').click();
    await page.waitForURL((url) => url.pathname === '/atelier' && url.searchParams.get('campaignId') === 'scn-luxury-gifting.brief.main');
    await expect(page.getByTestId('atelier-page')).toBeVisible();
    await expect(page.locator('h1').first()).toContainText('A Gesture, Considered');
    await expect(page.getByTestId('AT-tab-brief')).toBeVisible();
    await expect(page.getByTestId('AT-edit')).toBeVisible();
    expect(await counts(page)).toEqual({ sessions: 0, exports: 0 });
  });
});
