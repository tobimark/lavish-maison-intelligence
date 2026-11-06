import { expect, test, type Page } from '@playwright/test';

const A = 'scn-scent-layering.brief.main';
const VERSION = '1.1.0';

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

test.describe('legacy connected journey → six-workspace compatibility', () => {
  test('all four legacy stages replace to the owning workspace with exact context', async ({ page }) => {
    const mappings: Array<[string, string]> = [
      ['insight', '/radar'],
      ['strategy', '/opportunities'],
      ['creative', '/atelier'],
      ['social', '/deliverables'],
    ];
    for (const [stage, path] of mappings) {
      await open(page, `/campaigns/${A}/journey?scenarioVersion=${VERSION}&stage=${stage}&language=ar`);
      await expect(page).toHaveURL((url) => url.pathname === path
        && url.searchParams.get('campaignId') === A
        && url.searchParams.get('scenarioVersion') === VERSION);
      await expect(page.getByTestId('journey-redirecting')).toHaveCount(0);
    }
  });

  test('the target workspace carries the same business content and a next CTA', async ({ page }) => {
    await open(page, `/campaigns/${A}/journey?scenarioVersion=${VERSION}&stage=insight`);
    await expect(page.getByTestId('radar-current-case')).toBeVisible();
    await expect(page.getByTestId('journey-stage-insight')).toBeVisible();
    await expect(page.getByTestId('journey-next-insight')).toHaveAttribute('href', `/opportunities?campaignId=${A}&scenarioVersion=${VERSION}`);

    await open(page, `/campaigns/${A}/journey?scenarioVersion=${VERSION}&stage=strategy`);
    await expect(page.getByTestId('journey-stage-strategy')).toBeVisible();
    await expect(page.getByTestId('journey-next-strategy')).toHaveAttribute('href', `/atelier?campaignId=${A}&scenarioVersion=${VERSION}`);

    await open(page, `/campaigns/${A}/journey?scenarioVersion=${VERSION}&stage=creative&language=en`);
    await expect(page.getByTestId('journey-stage-creative')).toBeVisible();
    await expect(page.getByTestId('journey-video')).toBeVisible();
    await expect(page.getByTestId('journey-next-creative')).toHaveAttribute('href', `/deliverables?campaignId=${A}&scenarioVersion=${VERSION}&language=en`);

    await open(page, `/campaigns/${A}/journey?scenarioVersion=${VERSION}&stage=social`);
    await expect(page.getByTestId('social-stage')).toBeVisible();
    await expect(page.getByTestId('deliverables-social-workbench')).toBeVisible();
  });

  test('refresh on the target workspace keeps the same campaign/version and no second journey UI', async ({ page }) => {
    await open(page, `/campaigns/${A}/journey?scenarioVersion=${VERSION}&stage=creative`);
    await expect(page).toHaveURL((url) => url.pathname === '/atelier');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(500);
    await expect(page).toHaveURL((url) => url.pathname === '/atelier'
      && url.searchParams.get('campaignId') === A
      && url.searchParams.get('scenarioVersion') === VERSION);
    await expect(page.getByTestId('journey-stage-creative')).toBeVisible();
    await expect(page.getByTestId('journey-tabs')).toHaveCount(0);
  });

  test('browsing legacy links creates no session, draft, export or attempt', async ({ page }) => {
    for (const stage of ['insight', 'strategy', 'creative', 'social']) {
      await open(page, `/campaigns/${A}/journey?scenarioVersion=${VERSION}&stage=${stage}`);
    }
    expect(await counts(page)).toEqual({ sessions: 0, exports: 0, social: 0 });
  });
});
