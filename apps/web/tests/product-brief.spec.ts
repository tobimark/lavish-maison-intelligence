import { test, expect, type Page } from '@playwright/test';

const A_CAMPAIGN = 'scn-scent-layering.brief.main';
const B_CAMPAIGN = 'scn-luxury-gifting.brief.main';

async function noSessions(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const request = indexedDB.open('lavish-poc-content-v1');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (!db.objectStoreNames.contains('sessions')) { db.close(); return 0; }
    const count = await new Promise<number>((resolve, reject) => {
      const transaction = db.transaction('sessions', 'readonly');
      const countRequest = transaction.objectStore('sessions').count();
      countRequest.onsuccess = () => resolve(countRequest.result);
      countRequest.onerror = () => reject(countRequest.error);
    });
    db.close();
    return count;
  });
}

test.describe('AS-004 · SERENITY campaign brief', () => {
  test('A brief shows the SERENITY 1.1.0 brief, identity and hero without old OUD/PERLA fields', async ({ page }) => {
    await page.goto(`/campaigns/${A_CAMPAIGN}/brief`, { waitUntil: 'load' });
    await expect(page.getByTestId('campaign-brief-page')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('SERENITY — A Story in Layers');
    await expect(page.getByText('PRODUCT FOCUS')).toBeVisible();
    await expect(page.getByTestId('campaign-brief-page')).toContainText('SERENITY');
    await expect(page.getByTestId('campaign-brief-page')).toContainText('SKU 6290360533636 / 100014');
    await expect(page.getByTestId('campaign-brief-page')).not.toContainText('PERLA');
    await expect(page.getByTestId('campaign-brief-page')).not.toContainText('LAVISH OUD');
    await expect(page.getByTestId('provided-identity')).toBeVisible();
    await expect(page.getByTestId('provided-hero')).toBeVisible();
    const identity = await page.getByTestId('provided-identity').evaluate((image: HTMLImageElement) => [image.naturalWidth, image.naturalHeight]);
    expect(identity).toEqual([2000, 2000]);
    await expect(page.getByTestId('campaign-brief-page')).toContainText('Provided demo assets · Not generated live in this POC.');
    await expect(page.getByTestId('brief-open-atelier')).toHaveAttribute('href', new RegExp(`campaignId=${A_CAMPAIGN.replace(/\./g, '\\.')}`));
    await expect(page.getByTestId('brief-open-opportunity')).toHaveAttribute('href', '/opportunities/scn-scent-layering.analysis.main');
    expect(await noSessions(page)).toBe(0);
  });

  test('B and C briefs remain readable with no fabricated SERENITY assets or video entry', async ({ page }) => {
    for (const campaign of [B_CAMPAIGN, 'scn-oud-storytelling.brief.main']) {
      await page.goto(`/campaigns/${campaign}/brief`, { waitUntil: 'load' });
      await expect(page.getByTestId('campaign-brief-page')).toBeVisible();
      await expect(page.getByTestId('provided-campaign-assets-brief')).toHaveCount(0);
      await expect(page.getByTestId('provided-video')).toHaveCount(0);
      await expect(page.getByTestId('campaign-brief-page')).toContainText('Campaign brief');
    }
    expect(await noSessions(page)).toBe(0);
  });

  test('unknown campaign brief is an honest Not found instead of falling back to A', async ({ page }) => {
    await page.goto('/campaigns/scn-does-not-exist.brief/brief', { waitUntil: 'load' });
    await expect(page.getByText('Campaign brief unavailable')).toBeVisible();
    await expect(page.getByTestId('campaign-brief-page')).toHaveCount(0);
  });
});
