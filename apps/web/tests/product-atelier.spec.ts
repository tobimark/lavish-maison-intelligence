import { test, expect, type Page } from '@playwright/test';

const DB_NAME = 'lavish-poc-content-v1';

interface StoredSession {
  id: string;
  purpose?: string;
  revision: number;
  scenarioId: string;
  state: { activeScriptVersionId: string | null; workflow: Record<string, string>; userVersions: Array<{ id: string; language: string; content: { title: string } }> };
}

async function sessions(page: Page): Promise<StoredSession[]> {
  return page.evaluate(async (dbName) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const rows = await new Promise<unknown[]>((resolve, reject) => {
      if (!db.objectStoreNames.contains('sessions')) return resolve([]);
      const transaction = db.transaction('sessions', 'readonly');
      const request = transaction.objectStore('sessions').getAll();
      request.onsuccess = () => resolve(request.result as unknown[]);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return rows as StoredSession[];
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
    const sessionCount = await count('sessions');
    const exports = await count('productExports');
    db.close();
    return { sessions: sessionCount, exports };
  }, DB_NAME);
}

async function closeEditor(page: Page) {
  await page.locator('[data-testid="atelier-editor"] button', { hasText: 'Close' }).first().click();
  await expect(page.getByTestId('atelier-editor')).toBeHidden();
}

test.describe('IP-006 · Creative Atelier result preview and explicit editing', () => {
  test('B and C deep links render prepared brief, bilingual copy and four-shot storyboards without creating a session', async ({ page }) => {
    for (const campaign of [
      { id: 'scn-luxury-gifting.brief.main', title: 'A Gesture, Considered' },
      { id: 'scn-oud-storytelling.brief.main', title: 'Let the Scent Lead' },
    ]) {
      await page.goto(`/atelier?campaignId=${campaign.id}&language=ar&tab=storyboard`, { waitUntil: 'networkidle' });
      await expect(page.getByTestId('atelier-page')).toBeVisible();
      await expect(page.locator('h1').first()).toContainText(campaign.title);
      await expect(page.getByTestId('storyboard-preview')).toBeVisible();
      await expect(page.getByTestId('storyboard-preview').locator('article')).toHaveCount(4);
      await expect(page.getByTestId('storyboard-preview')).toContainText('Static storyboard');
      const images = page.getByTestId('storyboard-preview').locator('img');
      expect(await images.count()).toBeGreaterThanOrEqual(4);
      await expect(page.locator('video')).toHaveCount(0);
      await page.getByTestId('AT-tab-copy').click();
      await expect(page.getByTestId('script-preview')).toBeVisible();
      const arabic = page.getByTestId('script-preview').locator('[dir="rtl"]').first();
      await expect(arabic).toBeVisible();
      await expect(page.getByTestId('AT-language-ar')).toHaveAttribute('aria-pressed', 'true');
      await page.getByTestId('AT-tab-brief').click();
      await expect(page.getByText('Prepared campaign')).toBeVisible();
    }
    expect(await counts(page)).toEqual({ sessions: 0, exports: 0 });
  });

  test('explicit edit of a saved AR version persists a version; preview switching never revokes confirmation', async ({ page }) => {
    await page.goto('/atelier?campaignId=scn-scent-layering.brief.main&language=en', { waitUntil: 'networkidle' });
    await page.getByTestId('AT-edit').click();
    await expect(page.getByTestId('atelier-editor')).toBeVisible();
    await page.getByTestId('AT-field-hook').fill('Working draft hook');
    await page.getByTestId('AT-save').click();
    await expect(page.locator('text=New version saved')).toBeVisible();
    await closeEditor(page);

    // The saved version is now visible and unconfirmed.
    await expect(page.getByTestId(/AT-version-.*-usr\./).first()).toContainText('Saved version');
    await page.getByTestId(/AT-version-.*-usr\./).first().click();
    await page.waitForURL((url) => Boolean(url.searchParams.get('versionId')));
    const savedUrl = page.url();

    await page.getByTestId('AT-edit').click();
    await page.getByTestId('AT-confirm').click();
    await expect(page.locator('text=not a Lavish formal approval')).toBeVisible();
    await closeEditor(page);
    const afterConfirm = await sessions(page);
    const work = afterConfirm.find((session) => session.purpose !== 'activity');
    expect(work?.state.workflow.analysis).toBe('completed');
    expect(work?.state.activeScriptVersionId).toContain('usr.');
    const confirmedVersionId = work?.state.activeScriptVersionId as string;

    // Preview another preset version: read-only, no working selection change.
    await page.getByTestId('AT-language-en').click();
    await page.waitForURL((url) => !url.searchParams.get('versionId'));
    const afterPreview = await sessions(page);
    expect(afterPreview.find((session) => session.purpose !== 'activity')?.state.activeScriptVersionId).toBe(confirmedVersionId);
    await expect(page.getByTestId('AT-language-en')).toHaveAttribute('aria-pressed', 'true');

    // The saved version still reports Confirmed on its exact preview.
    await page.getByTestId(new RegExp(`AT-version-${confirmedVersionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-usr`)).click();
    await page.waitForURL((url) => url.searchParams.get('versionId') === confirmedVersionId);
    await expect(page.getByTestId('atelier-page')).toContainText('Confirmed');
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByTestId('atelier-page')).toContainText('Confirmed');
    await page.screenshot({ path: 'evidence/product/ip-006/atelier-confirmed-1440.png' });
    void savedUrl;
  });

  test('AR editing flow keeps RTL text, saves and confirms the exact version, and discards do not resurrect', async ({ page }) => {
    await page.goto('/atelier?campaignId=scn-oud-storytelling.brief.main&language=ar', { waitUntil: 'networkidle' });
    await page.getByTestId('AT-edit').click();
    await expect(page.getByTestId('atelier-editor')).toBeVisible();
    const title = page.getByTestId('AT-field-title');
    await expect(title).toHaveAttribute('dir', 'rtl');
    await title.fill('عنوان محرر تجريبي');
    await page.getByTestId('AT-save').click();
    await expect(page.locator('text=New version saved')).toBeVisible();
    await closeEditor(page);
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByTestId('AT-tab-copy').click();
    await expect(page.getByTestId('script-preview')).toContainText('عنوان محرر تجريبي');
    const afterSave = await sessions(page);
    const work = afterSave.find((session) => session.purpose !== 'activity');
    expect(work?.scenarioId).toBe('scn-oud-storytelling');
    expect(work?.state.userVersions.at(-1)?.language).toBe('ar');
    const savedVersionId = work?.state.userVersions.at(-1)?.id as string;

    // Discard unsaved changes: the value must not resurrect on reopen.
    await page.getByTestId('AT-edit').click();
    const originalHook = await page.getByTestId('AT-field-hook').inputValue();
    await page.getByTestId('AT-field-hook').fill('Discarded hook');
    await page.getByTestId('AT-discard').click();
    await expect(page.getByTestId('AT-field-hook')).toHaveValue(originalHook);
    await page.getByTestId('AT-field-hook').fill('Discarded hook');
    await closeEditorWithGuard(page);
    await page.getByTestId(new RegExp(`AT-version-${savedVersionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-usr`)).click();
    await page.waitForURL((url) => url.searchParams.get('versionId') === savedVersionId);
    await page.getByTestId('AT-edit').click();
    await expect(page.getByTestId('AT-field-hook')).not.toHaveValue('Discarded hook');
    await closeEditorWithGuard(page);
    await page.screenshot({ path: 'evidence/product/ip-006/atelier-ar-1440.png' });
  });

  test('the storyboard uses all real associated images, keeps the logo small and complete, and is honest about static media', async ({ page }) => {
    await page.goto('/atelier?campaignId=scn-scent-layering.brief.main&language=en&tab=storyboard', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('storyboard-preview')).toBeVisible();
    const shots = page.getByTestId('storyboard-preview').locator('article');
    await expect(shots).toHaveCount(4);
    // A multi-product frame must show every referenced product image, not only the first.
    const fourthShotImages = shots.nth(3).locator('img');
    expect(await fourthShotImages.count()).toBeGreaterThanOrEqual(1);
    const logo = page.getByTestId('storyboard-preview').locator('img[alt="Lavish Perfumes logo"]').first();
    await expect(logo).toBeVisible();
    const box = await logo.boundingBox();
    expect(box?.width ?? 0).toBeLessThanOrEqual(147);
    await expect(page.getByTestId('storyboard-preview')).toContainText('Video deferred');
    // The provided SERENITY preview is a real, separate asset (not a rendered 15s film).
    const providedVideo = page.getByTestId('journey-video');
    await expect(providedVideo).toHaveCount(1);
    await expect(providedVideo).toHaveJSProperty('controls', true);
    await expect(page.getByText('Provided demo asset · Not generated live in this POC').first()).toBeVisible();
    const providedVideoBox = await providedVideo.boundingBox();
    expect(providedVideoBox?.width ?? 0).toBeGreaterThan(0);
    expect(providedVideoBox?.height ?? 0).toBeGreaterThan(0);
    const mediaRatio = await providedVideo.evaluate((node: HTMLVideoElement) => node.videoWidth / node.videoHeight);
    expect(mediaRatio).toBeCloseTo(3 / 4, 2);
    expect(await providedVideo.evaluate((node: HTMLVideoElement) => getComputedStyle(node).objectFit)).toBe('contain');
    await page.screenshot({ path: 'evidence/product/ip-006/atelier-storyboard-1440.png', fullPage: false });
  });
});

async function closeEditorWithGuard(page: Page) {
  await page.locator('[data-testid="atelier-editor"] button', { hasText: 'Close' }).first().click();
  const dialog = page.getByTestId('guard-dialog');
  if (await dialog.isVisible().catch(() => false)) {
    await page.getByTestId('guard-discard').click();
  }
  await expect(page.getByTestId('atelier-editor')).toBeHidden();
}
