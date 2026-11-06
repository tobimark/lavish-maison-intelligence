import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';

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

async function saveVersionInAtelier(page: Page, campaignId: string, title: string): Promise<void> {
  await page.goto(`/atelier?campaignId=${campaignId}&language=en`, { waitUntil: 'networkidle' });
  await page.getByTestId('AT-edit').click();
  await expect(page.getByTestId('atelier-editor')).toBeVisible();
  await page.getByTestId('AT-field-title').fill(title);
  await page.getByTestId('AT-save').click();
  await expect(page.locator('text=New version saved')).toBeVisible();
  await page.locator('[data-testid="atelier-editor"] button', { hasText: 'Close' }).first().click();
  await expect(page.getByTestId('atelier-editor')).toBeHidden();
}

test.describe('IP-007 · Creative Library', () => {
  test('direct Library access lists all prepared scripts and storyboards plus real provided SERENITY assets', async ({ page }) => {
    await page.goto('/library', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('library-page')).toBeVisible();
    await expect(page.locator('[data-testid^="LIB-row-"]')).toHaveCount(12);
    await expect(page.getByTestId('LIB-kind').locator('option')).toHaveCount(6);
    expect(await page.getByTestId('LIB-kind').innerText()).toContain('Provided videos');
    await expect(page.getByTestId('LIB-provided-section')).toBeVisible();
    await expect(page.getByTestId('LIB-provided-hero_image')).toBeVisible();
    await expect(page.getByTestId('LIB-provided-product_original_image')).toBeVisible();
    await expect(page.getByTestId('LIB-provided-final_preview_video')).toBeVisible();
    const firstRow = page.locator('[data-testid^="LIB-row-"]').first();
    await expect(firstRow).toContainText('A moment of light.');
    await expect(firstRow).toContainText('SERENITY');
    expect(await counts(page)).toEqual({ sessions: 0, exports: 0 });
  });

  test('provided SERENITY type filters, previews and exact Atelier links are real', async ({ page }) => {
    await page.goto('/library', { waitUntil: 'networkidle' });
    await page.getByTestId('LIB-kind').selectOption('final_preview_video');
    await page.waitForURL((url) => url.searchParams.get('kind') === 'final_preview_video');
    await expect(page.locator('[data-testid^="LIB-row-"]')).toHaveCount(0);
    await expect(page.getByTestId('LIB-provided-final_preview_video')).toBeVisible();
    await expect(page.getByTestId('LIB-provided-hero_image')).toHaveCount(0);

    await page.getByTestId('LIB-provided-preview-final_preview_video').click();
    const drawer = page.getByTestId('LIB-provided-preview');
    await expect(drawer).toBeVisible();
    const video = drawer.getByTestId('LIB-provided-video');
    await page.waitForFunction(() => {
      const node = document.querySelector('[data-testid="LIB-provided-video"]') as HTMLVideoElement | null;
      return Boolean(node && node.readyState >= 1 && node.duration > 0);
    });
    expect(await video.evaluate((node: HTMLVideoElement) => ({ controls: node.controls, width: node.videoWidth, height: node.videoHeight, duration: node.duration })))
      .toMatchObject({ controls: true, width: 720, height: 960 });
    await page.getByTestId('LIB-provided-close').click();
    await expect(drawer).toHaveCount(0);

    await page.goto('/library?kind=product_original_image', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('LIB-provided-product_original_image')).toBeVisible();
    await page.getByTestId('LIB-provided-preview-product_original_image').click();
    const image = page.getByTestId('LIB-provided-image');
    await expect(image).toBeVisible();
    expect(await image.evaluate((node: HTMLImageElement) => [node.naturalWidth, node.naturalHeight])).toEqual([2000, 2000]);
    await page.getByTestId('LIB-provided-close').click();

    await page.goto('/library?kind=hero_image', { waitUntil: 'networkidle' });
    const link = page.getByTestId('LIB-provided-atelier-hero_image');
    await expect(link).toHaveAttribute('href', /campaignId=scn-scent-layering\.brief\.main/);
    expect(await counts(page)).toEqual({ sessions: 0, exports: 0 });
  });

  test('Campaign / Language / Type / Origin filters combine, reflect the URL, survive reload and clear from an honest empty state', async ({ page }) => {
    await page.goto('/library', { waitUntil: 'networkidle' });
    await page.getByTestId('LIB-campaign').selectOption('scn-luxury-gifting.brief.main');
    await page.waitForURL((url) => url.searchParams.get('campaignId') === 'scn-luxury-gifting.brief.main');
    await expect(page.locator('[data-testid^="LIB-row-"]')).toHaveCount(4);

    await page.getByTestId('LIB-language').selectOption('ar');
    await page.waitForURL((url) => url.searchParams.get('language') === 'ar');
    await expect(page.locator('[data-testid^="LIB-row-"]')).toHaveCount(2);
    const meta = await page.locator('[data-testid^="LIB-meta-"]').first().innerText();
    expect(meta).toContain('AR');

    await page.getByTestId('LIB-kind').selectOption('storyboard');
    await page.waitForURL((url) => url.searchParams.get('kind') === 'storyboard');
    await expect(page.locator('[data-testid^="LIB-row-"]')).toHaveCount(1);

    await page.getByTestId('LIB-origin').selectOption('saved');
    await page.waitForURL((url) => url.searchParams.get('origin') === 'saved');
    await expect(page.getByTestId('LIB-empty')).toBeVisible();
    await expect(page.getByTestId('LIB-empty')).toContainText('No creative work matches');
    await page.getByTestId('LIB-clear-empty').click();
    await page.waitForURL((url) => !url.searchParams.get('campaignId'));
    await expect(page.locator('[data-testid^="LIB-row-"]')).toHaveCount(12);

    await page.goto('/library?campaignId=scn-scent-layering.brief.main&language=en&kind=script&origin=preset', { waitUntil: 'networkidle' });
    await expect(page.locator('[data-testid^="LIB-row-"]')).toHaveCount(1);
    await expect(page.getByTestId('LIB-campaign')).toHaveValue('scn-scent-layering.brief.main');
    await expect(page.getByTestId('LIB-language')).toHaveValue('en');
    await expect(page.getByTestId('LIB-kind')).toHaveValue('script');
    await expect(page.getByTestId('LIB-origin')).toHaveValue('preset');
  });

  test('every creative row previews readable, exact content and links to the exact Atelier version', async ({ page }) => {
    await page.goto('/library', { waitUntil: 'networkidle' });
    const rows = page.locator('[data-testid^="LIB-row-"]');
    const total = await rows.count();
    for (let index = 0; index < total; index += 1) {
      const row = rows.nth(index);
      const previewButton = row.locator('button', { hasText: 'Preview' });
      await previewButton.click();
      await expect(page.getByTestId('library-preview')).toBeVisible();
      const drawerText = await page.getByTestId('library-preview').innerText();
      expect(drawerText.length).toBeGreaterThan(40);
      const hasStoryboard = (await page.getByTestId('storyboard-preview').count()) > 0;
      if (hasStoryboard) {
        await expect(page.getByTestId('storyboard-preview')).toBeVisible();
      } else {
        await expect(page.getByTestId('script-preview')).toBeVisible();
      }
      await page.getByTestId('LIB-close').click();
      await expect(page.getByTestId('library-preview')).toBeHidden();

      const atelierHref = await row.locator('a', { hasText: 'Open in Atelier' }).getAttribute('href');
      expect(atelierHref).toMatch(/^\/atelier\?campaignId=.+&language=(en|ar)&versionId=.+&tab=(copy|storyboard)$/);
    }
    // A shared deep link opens the exact creative asset.
    await page.goto('/library?campaignId=scn-oud-storytelling.brief.main&language=ar&kind=script&versionId=scn-oud-storytelling.script.ar-v1', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('library-preview')).toBeVisible();
    await expect(page.getByTestId('script-preview')).toContainText('بعض الحكايات');
  });

  test('exporting from Library produces a real ZIP for the displayed version, records the export and does not create a session or email', async ({ page }) => {
    await page.goto('/library?campaignId=scn-luxury-gifting.brief.main&language=ar&kind=script&origin=preset', { waitUntil: 'networkidle' });
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button', { hasText: 'Export content pack' }).first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/luxury-gifting-ar-preset-content-pack\.zip$/);
    await download.saveAs(path.join('evidence', 'product', 'ip-007', 'library-ar-preset-export.zip'));
    await expect(page.locator('[data-testid^="toast-"]').first()).toContainText('Download started');
    const afterExport = await counts(page);
    expect(afterExport.sessions, 'ordinary export must not create a working session').toBe(0);
    expect(afterExport.exports).toBe(1);
    await page.reload({ waitUntil: 'networkidle' });
    expect(await page.locator('[data-testid^="LIB-row-"]').first().innerText()).toContain('1 export');
  });

  test('a saved version created in Atelier appears immediately in Library with exact owner session and can be reopened', async ({ page }) => {
    await saveVersionInAtelier(page, 'scn-oud-storytelling.brief.main', 'A saved Library title');

    await page.goto('/library?campaignId=scn-oud-storytelling.brief.main&language=en&origin=saved', { waitUntil: 'networkidle' });
    await expect(page.locator('[data-testid^="LIB-row-"]')).toHaveCount(2);
    await expect(page.locator('[data-testid^="LIB-row-"]').first()).toContainText('A saved Library title');
    const scriptRow = page.locator('[data-testid^="LIB-row-"]', { hasText: 'A saved Library title' }).filter({ hasText: 'Script' }).first();
    const href = await scriptRow.locator('a', { hasText: 'Open in Atelier' }).getAttribute('href');
    expect(href).toContain('sessionId=usr.');
    expect(href).toContain('versionId=usr.');
    await page.goto(href as string, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('atelier-page')).toBeVisible();
    await expect(page.locator('h1').first()).toContainText('Let the Scent Lead');
    await page.getByTestId('AT-tab-copy').click();
    await expect(page.getByTestId('script-preview')).toContainText('A saved Library title');
    const state = await counts(page);
    expect(state.sessions).toBe(1);
    expect(state.exports).toBe(0);
  });
});
