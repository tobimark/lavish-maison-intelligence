import { test, expect, type Page } from '@playwright/test';

const DB_NAME = 'lavish-poc-content-v1';

async function sessionRecords(page: Page): Promise<Array<{ id: string; purpose?: string; activeBriefId: string | null; revision: number; workflow: Record<string, string> }>> {
  return page.evaluate(async (dbName) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const rows = await new Promise<unknown[]>((resolve, reject) => {
      if (!db.objectStoreNames.contains('sessions')) {
        resolve([]);
        return;
      }
      const transaction = db.transaction('sessions', 'readonly');
      const request = transaction.objectStore('sessions').getAll();
      request.onsuccess = () => resolve(request.result as unknown[]);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return rows.map((row) => {
      const record = row as { id: string; purpose?: string; state?: { activeBriefId: string | null; workflow: Record<string, string> }; revision: number };
      return {
        id: record.id,
        purpose: record.purpose,
        activeBriefId: record.state?.activeBriefId ?? null,
        revision: record.revision,
        workflow: record.state?.workflow ?? {},
      };
    });
  }, DB_NAME);
}

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

test.describe('IP-004 · Intelligence Radar', () => {
  test('reads all fifteen prepared signals with real sources, topics and evidence, and filters by exact source', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
    await page.goto('/radar', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('radar-page')).toBeVisible();
    await expect(page.locator('[data-testid^="RAD-signal-"]')).toHaveCount(15);

    for (const source of ['instagram', 'tiktok', 'pinterest', 'youtube']) {
      await page.getByTestId(`RAD-source-${source}`).click();
      await page.waitForURL((url) => url.searchParams.get('source') === source);
      const cards = page.locator('[data-testid^="RAD-signal-"]');
      const count = await cards.count();
      expect(count, `${source} should have real signals`).toBeGreaterThan(0);
      expect(count, `${source} filter should reduce the full list`).toBeLessThan(15);
      const firstText = await cards.first().innerText();
      expect(firstText.toLowerCase()).toContain(source);
      await page.reload({ waitUntil: 'networkidle' });
      await expect(page.locator('[data-testid^="RAD-signal-"]')).toHaveCount(count);
    }

    await page.getByTestId('RAD-source-all').click();
    await page.waitForURL((url) => !url.searchParams.get('source'));
    await expect(page.locator('[data-testid^="RAD-signal-"]')).toHaveCount(15);
    expect(errors).toEqual([]);
  });

  test('topic and Campaign filters combine with AND, clear correctly and are URL-restorable', async ({ page }) => {
    await page.goto('/radar?campaignId=scn-luxury-gifting.brief.main', { waitUntil: 'networkidle' });
    const firstSignalText = await page.locator('[data-testid^="RAD-signal-"]').first().innerText();
    const topicOptions = (await page.getByTestId('RAD-topic').locator('option').allTextContents()).map((value) => value.trim()).filter(Boolean);
    const topic = topicOptions.find((option) => option !== 'All topics' && firstSignalText.includes(option)) ?? '';
    expect(topic.length).toBeGreaterThan(0);
    await page.getByTestId('RAD-topic').selectOption({ label: topic });
    await page.waitForURL((url) => url.searchParams.get('topic') === topic);
    const topicCount = await page.locator('[data-testid^="RAD-signal-"]').count();
    expect(topicCount).toBeGreaterThan(0);
    expect(topicCount).toBeLessThanOrEqual(5);

    await page.getByTestId('RAD-campaign').selectOption('scn-oud-storytelling.brief.main');
    await page.waitForURL((url) => url.searchParams.get('campaignId') === 'scn-oud-storytelling.brief.main');
    // Oud storytelling has no gift-topic signals: AND filters honestly produce an empty result.
    await expect(page.getByTestId('RAD-empty')).toBeVisible();
    await page.getByTestId('RAD-clear-empty').click();
    await page.waitForURL((url) => !url.searchParams.get('topic') && !url.searchParams.get('campaignId'));
    await expect(page.locator('[data-testid^="RAD-signal-"]')).toHaveCount(15);

    await page.goto(`/radar?campaignId=scn-luxury-gifting.brief.main&topic=${encodeURIComponent(topic)}`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('RAD-campaign')).toHaveValue('scn-luxury-gifting.brief.main');
    await expect(page.getByTestId('RAD-topic')).toHaveValue(topic);
    expect(await page.locator('[data-testid^="RAD-signal-"]').count()).toBe(topicCount);
    await page.getByTestId('RAD-clear').click();
    await expect(page.locator('[data-testid^="RAD-signal-"]')).toHaveCount(15);
  });

  test('opens every signal detail with all linked evidence, related trends and the exact opportunity route', async ({ page }) => {
    await page.goto('/radar?campaignId=scn-oud-storytelling.brief.main', { waitUntil: 'networkidle' });
    const cards = page.locator('[data-testid^="RAD-signal-"]');
    await expect(cards).toHaveCount(5);
    const ids: string[] = [];
    for (let index = 0; index < 5; index += 1) {
      const testId = await cards.nth(index).getAttribute('data-testid');
      ids.push(testId as string);
    }
    for (const testId of ids) {
      await page.getByTestId(testId).click();
      await expect(page.getByTestId('radar-signal-drawer')).toBeVisible();
      const evidence = page.locator('[data-testid^="RAD-evidence-"]');
      expect(await evidence.count()).toBeGreaterThan(0);
      await expect(page.locator('[data-testid="radar-signal-drawer"]')).toContainText('Simulated evidence');
      const opportunityLink = page.locator('[data-testid="radar-signal-drawer"] a[href^="/opportunities/"]').first();
      await expect(opportunityLink).toHaveAttribute('href', '/opportunities/scn-oud-storytelling.analysis.main');
      await page.getByTestId('RAD-drawer-close').click();
      await expect(page.getByTestId('radar-signal-drawer')).toBeHidden();
      await expect(page.getByTestId('RAD-campaign')).toHaveValue('scn-oud-storytelling.brief.main');
    }
    // Escape closes the drawer as well.
    await page.getByTestId(ids[0]).click();
    await expect(page.getByTestId('radar-signal-drawer')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('radar-signal-drawer')).toBeHidden();
    const countsAfterBrowsing = await counts(page);
    expect(countsAfterBrowsing).toEqual({ sessions: 0, exports: 0 });
  });

  test('Agent Activity opens read-only; only Play/Step creates an isolated activity session and never touches a working draft', async ({ page }) => {
    await page.goto('/atelier?campaignId=scn-luxury-gifting.brief.main&language=en', { waitUntil: 'networkidle' });
    await page.getByTestId('AT-edit').click();
    await expect(page.getByTestId('atelier-editor')).toBeVisible();
    await page.getByTestId('AT-field-hook').fill('Working draft hook');
    const before = await sessionRecords(page);
    const work = before.find((session) => session.purpose !== 'activity');
    expect(work).toBeTruthy();
    // Close the editor without saving; dirty guard confirms the draft is not persisted.
    await page.locator('[data-testid="atelier-editor"] button', { hasText: 'Close' }).first().click();
    await page.getByTestId('guard-discard').click();
    await expect(page.getByTestId('atelier-editor')).toBeHidden();
    const afterDiscard = await sessionRecords(page);
    expect(afterDiscard.find((session) => session.purpose !== 'activity')?.revision).toBe(work?.revision);

    await page.goto('/radar?campaignId=scn-luxury-gifting.brief.main', { waitUntil: 'networkidle' });
    await page.getByTestId('ACT-open').click();
    await expect(page.getByTestId('radar-activity-drawer')).toBeVisible();
    await expect(page.getByTestId('radar-activity-drawer')).toContainText('Preset Agent demo');
    expect((await counts(page)).sessions, 'opening the activity drawer must not create a session').toBe(afterDiscard.length);

    await page.getByTestId('ACT-step').click();
    await page.waitForTimeout(600);
    await page.getByTestId('ACT-step').click();
    await page.waitForTimeout(600);
    const withActivity = await sessionRecords(page);
    const activity = withActivity.find((session) => session.purpose === 'activity');
    expect(activity, 'explicit Step must create purpose=activity session').toBeTruthy();
    expect(activity?.id).not.toBe(work?.id);
    expect(withActivity.filter((session) => session.purpose !== 'activity')).toHaveLength(1);
    expect(withActivity.find((session) => session.purpose !== 'activity')?.revision).toBe(work?.revision);

    await page.getByTestId('ACT-play').click();
    await page.waitForTimeout(1500);
    await page.getByTestId('ACT-play').click();
    await expect(page.getByTestId('radar-activity-drawer')).not.toContainText('REVISION_CONFLICT');
    await expect(page.getByTestId('radar-activity-drawer')).toContainText('Preset events');
    await page.getByTestId('ACT-view-mine').click();
    await expect(page.getByTestId('radar-activity-drawer')).toContainText('Your actions');
    await expect(page.getByTestId('radar-activity-drawer')).toContainText('executeStage:discovery');
    await expect(page.getByTestId('radar-activity-drawer')).toContainText('executeStage:analysis');
    await page.getByTestId('ACT-close').click();
    await expect(page.getByTestId('radar-activity-drawer')).toBeHidden();
    await expect(page.getByTestId('RAD-campaign')).toHaveValue('scn-luxury-gifting.brief.main');

    const finalSessions = await sessionRecords(page);
    const workAfter = finalSessions.find((session) => session.purpose !== 'activity');
    expect(workAfter?.revision).toBe(work?.revision);
    expect(workAfter?.activeBriefId).toBe(work?.activeBriefId);
    expect(workAfter?.workflow).toEqual(work?.workflow);
  });
});
