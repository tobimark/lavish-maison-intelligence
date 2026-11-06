import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const DB_NAME = 'lavish-poc-content-v1';
const EVIDENCE = process.env.EVIDENCE_ROOT
  ? path.resolve(process.env.EVIDENCE_ROOT)
  : path.resolve(process.cwd(), 'evidence', 'product', 'workspace-integration', 'ws-003', 'deliverables');

interface ExportRecord {
  id: string;
  version: { versionId: string; sessionId: string | null };
  language: string;
  origin: string;
  confirmationAtExport: string;
  status: string;
  archiveFilename: string;
  archiveBytes: number;
  archiveSha256: string;
  noVideo: boolean;
  noRealEmail: boolean;
}

async function state(page: Page): Promise<{ sessions: number; exports: ExportRecord[]; attempts: number }> {
  return page.evaluate(async (dbName) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const getAll = <T,>(store: string) => new Promise<T[]>((resolve, reject) => {
      if (!db.objectStoreNames.contains(store)) return resolve([]);
      const transaction = db.transaction(store, 'readonly');
      const request = transaction.objectStore(store).getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
    const sessions = await getAll<{ contentDelivery?: { attempts: unknown[] } }>('sessions');
    const stored = await getAll<{ record: ExportRecord }>('productExports');
    db.close();
    return {
      sessions: sessions.length,
      exports: stored.map((value) => value.record),
      attempts: sessions.reduce((sum, session) => sum + (session.contentDelivery?.attempts?.length ?? 0), 0),
    };
  }, DB_NAME);
}

function hashFile(file: string): string {

  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

async function showDownloads(page: Page) {
  const details = page.getByTestId('deliverables-downloads');
  await expect(details).toBeVisible();
  if (!(await details.evaluate((element) => element.hasAttribute('open')))) {
    await details.locator('summary').first().click();
    await expect(details).toHaveAttribute('open', '');
  }
}

test.describe('IP-008 · Deliverables and ordinary export', () => {
  test('clean browser can export presets directly: real ZIP bytes, download record, no session/confirmation/email side effects', async ({ page }) => {
    await page.goto('/deliverables', { waitUntil: 'networkidle' });
    await showDownloads(page);
    await expect(page.getByTestId('deliverables-page')).toBeVisible();
    await expect(page.locator('[data-testid^="DEL-version-"]')).toHaveCount(6);
    await expect(page.getByTestId('DEL-download')).toBeVisible();

    // B preset, Arabic, from a fresh storage state.
    await page.getByTestId('DEL-campaign').selectOption('scn-luxury-gifting.brief.main');
    await page.waitForURL((url) => url.searchParams.get('campaignId') === 'scn-luxury-gifting.brief.main');
    await page.waitForTimeout(1000);
    await page.getByTestId('deliverables-downloads').evaluate((element) => { (element as HTMLDetailsElement).open = true; });
    await page.waitForTimeout(200);
    await expect(page.getByTestId('DEL-campaign')).toBeVisible();
    await page.getByTestId('DEL-version-scn-luxury-gifting.script.ar-v1-preset').click();
    await page.waitForTimeout(500);
    await page.getByTestId('deliverables-downloads').evaluate((element) => { (element as HTMLDetailsElement).open = true; });
    await page.waitForTimeout(200);
    await expect(page.getByTestId('deliverable-package')).toContainText('Draft / Not confirmed');

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('DEL-download').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/luxury-gifting-ar-preset-content-pack\.zip$/);
    const target = path.join(EVIDENCE, 'deliverables-B-ar-preset.zip');
    await download.saveAs(target);
    await expect(page.locator('[data-testid^="toast-"]').first()).toContainText('Download started');
    await page.waitForTimeout(800);

    const after = await state(page);
    expect(after.sessions, 'direct export must not create a session').toBe(0);
    expect(after.attempts, 'direct export must not simulate email').toBe(0);
    expect(after.exports).toHaveLength(1);
    const record = after.exports[0];
    expect(record.language).toBe('ar');
    expect(record.origin).toBe('preset');
    expect(record.confirmationAtExport).toBe('unconfirmed');
    expect(record.status).toBe('download_triggered');
    expect(record.archiveFilename).toBe(download.suggestedFilename());
    expect(record.noVideo).toBe(true);
    expect(record.noRealEmail).toBe(true);
    expect(hashFile(target), 'saved download bytes must equal the recorded archive hash').toBe(record.archiveSha256);
    expect(record.archiveBytes).toBe(readFileSync(target).byteLength);

    // Details expose the immutable snapshot; internal hashes stay in Details.
    await page.waitForTimeout(500);
    await page.getByTestId('deliverables-downloads').evaluate((element) => { (element as HTMLDetailsElement).open = true; });
    await page.waitForTimeout(200);
    const details = page.getByTestId(`DEL-detail-panel-${record.id}`);
    if (!(await details.isVisible().catch(() => false))) {
      await page.getByTestId(`DEL-details-${record.id}`).click();
    }
    await expect(details).toContainText(record.archiveSha256);
    await expect(details).toContainText('Download triggered');
    await expect(details).toContainText(record.archiveFilename);
    await page.getByTestId(`DEL-details-${record.id}`).click();
    await expect(details).toBeHidden();
    await page.getByTestId(`DEL-details-${record.id}`).click();
    await expect(details).toBeVisible();
    await page.screenshot({ path: path.join(EVIDENCE, 'deliverables-export-details-1440.png') });

    // Re-download must return the original immutable bytes, not a re-render.
    const reDownloadPromise = page.waitForEvent('download');
    await page.getByTestId(`DEL-redownload-${record.id}`).click();
    const reDownload = await reDownloadPromise;
    const reTarget = path.join(EVIDENCE, 'deliverables-B-ar-preset-redownload.zip');
    await reDownload.saveAs(reTarget);
    expect(hashFile(reTarget)).toBe(record.archiveSha256);
    expect((await state(page)).exports).toHaveLength(1);
  });

  test('B and C preset exports work cold from Deliverables without a Run, confirmation or simulated email', async ({ page }) => {
    for (const [campaignId, language, expected] of [
      ['scn-luxury-gifting.brief.main', 'ar', 'luxury-gifting-ar-preset-content-pack.zip'],
      ['scn-oud-storytelling.brief.main', 'en', 'oud-storytelling-en-preset-content-pack.zip'],
    ] as const) {
      await page.goto(`/deliverables?campaignId=${encodeURIComponent(campaignId)}&language=${language}`, { waitUntil: 'networkidle' });
    await showDownloads(page);
      const downloadPromise = page.waitForEvent('download');
      await page.getByTestId('DEL-download').click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe(expected);
      const target = path.join(EVIDENCE, `cold-${language}-${campaignId.split('.')[0]}.zip`);
      await download.saveAs(target);
      await page.waitForTimeout(500);
    }
    const after = await state(page);
    expect(after.sessions).toBe(0);
    expect(after.attempts).toBe(0);
    expect(after.exports).toHaveLength(2);
    expect(after.exports.every((record) => record.status === 'download_triggered')).toBe(true);
    expect(after.exports.every((record) => record.confirmationAtExport === 'unconfirmed')).toBe(true);
  });

  test('saved AR version exports its exact title/timing and confirmation moves with the explicit Confirm action', async ({ page }) => {
    await page.goto('/atelier?campaignId=scn-scent-layering.brief.main&language=ar', { waitUntil: 'networkidle' });
    await page.getByTestId('AT-edit').click();
    await page.getByTestId('AT-field-title').fill('عنوان حزمة التسليم');
    await page.getByTestId('AT-advanced').click();
    await page.getByTestId('AT-subtitle-text-1').fill('نص ترجمة محفوظ');
    await page.getByTestId('AT-save').click();
    await expect(page.locator('text=New version saved')).toBeVisible();
    await page.locator('[data-testid="atelier-editor"] button', { hasText: 'Close' }).first().click();
    const savedUrl = new URL(page.url());
    const versionId = savedUrl.searchParams.get('versionId') as string;
    const sessionId = savedUrl.searchParams.get('sessionId') as string;
    expect(versionId).toContain('usr.');
    expect(sessionId).toContain('usr.');

    await page.goto(`/deliverables?campaignId=scn-scent-layering.brief.main&language=ar&versionId=${encodeURIComponent(versionId)}&sessionId=${encodeURIComponent(sessionId)}`, { waitUntil: 'networkidle' });
    await showDownloads(page);
    await expect(page.getByTestId('deliverable-package')).toContainText('Draft / Not confirmed');
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('DEL-download').click();
    const download = await downloadPromise;
    const target = path.join(EVIDENCE, 'deliverables-saved-ar-draft.zip');
    await download.saveAs(target);
    await page.waitForTimeout(500);
    const draftState = await state(page);
    const savedRecord = draftState.exports.find((record) => record.version.versionId === versionId);
    expect(savedRecord?.origin).toBe('saved');
    expect(savedRecord?.confirmationAtExport).toBe('unconfirmed');
    expect(hashFile(target)).toBe(savedRecord?.archiveSha256);

    await page.goto(`/atelier?campaignId=scn-scent-layering.brief.main&language=ar&versionId=${encodeURIComponent(versionId)}&sessionId=${encodeURIComponent(sessionId)}`, { waitUntil: 'networkidle' });
    await page.getByTestId('AT-edit').click();
    await page.getByTestId('AT-confirm').click();
    await expect(page.locator('text=not a Lavish formal approval')).toBeVisible();
    await page.locator('[data-testid="atelier-editor"] button', { hasText: 'Close' }).first().click();

    await page.goto(`/deliverables?campaignId=scn-scent-layering.brief.main&language=ar&versionId=${encodeURIComponent(versionId)}&sessionId=${encodeURIComponent(sessionId)}`, { waitUntil: 'networkidle' });
    await showDownloads(page);
    await expect(page.getByTestId('deliverable-package')).toContainText('Confirmed current version');
    const confirmedDownloadPromise = page.waitForEvent('download');
    await page.getByTestId('DEL-download').click();
    const confirmedDownload = await confirmedDownloadPromise;
    const confirmedTarget = path.join(EVIDENCE, 'deliverables-saved-ar-confirmed.zip');
    await confirmedDownload.saveAs(confirmedTarget);
    await page.waitForTimeout(500);
    const confirmedState = await state(page);
    const confirmedRecord = confirmedState.exports.find((record) => record.confirmationAtExport === 'confirmed_current');
    expect(confirmedRecord).toBeTruthy();
    expect(confirmedRecord?.version.versionId).toBe(versionId);
    const oldRecord = confirmedState.exports.find((record) => record.id === savedRecord?.id);
    expect(oldRecord?.archiveSha256).toBe(savedRecord?.archiveSha256);
  });
  test('simulated email is a secondary drawer with confirmation, dirty guard, failure and retry, separated from ordinary exports', async ({ page }) => {
    await page.goto('/deliverables', { waitUntil: 'networkidle' });
    await showDownloads(page);
    await page.getByTestId('MAIL-open').click();
    await expect(page.getByTestId('deliverables-mail')).toBeVisible();
    await expect(page.getByTestId('MAIL-confirm-script')).toBeVisible();
    await page.getByTestId('MAIL-confirm-script').click();
    await expect(page.getByTestId('MAIL-save')).toBeVisible();
    await expect(page.getByTestId('MAIL-field-subject')).toBeVisible();

    // Dirty form disables success/failure.
    await page.getByTestId('MAIL-field-subject').fill('[SIMULATED · NOT SENT] Dirty subject');
    await expect(page.getByTestId('MAIL-simulate')).toBeDisabled();
    await expect(page.getByTestId('MAIL-failure')).toBeDisabled();
    await page.getByTestId('MAIL-save').click();
    await expect(page.getByTestId('deliverables-mail')).toContainText('Saved draft revision');
    await expect(page.getByTestId('MAIL-simulate')).toBeEnabled();

    // Success attempt.
    await page.getByTestId('MAIL-simulate').click();
    await expect(page.getByTestId('MAIL-confirmation')).toBeVisible();
    await page.getByTestId('MAIL-record').click();
    await expect(page.locator('[data-testid^="MAIL-attempt-"]')).toHaveCount(1);
    await expect(page.getByTestId('deliverables-mail')).toContainText('No email was actually sent');

    // Explicit failure, then a retry creates a third record while preserving history.
    await page.getByTestId('MAIL-failure').click();
    await expect(page.locator('[data-testid^="MAIL-attempt-"]')).toHaveCount(2);
    await expect(page.getByTestId('MAIL-retry')).toBeVisible();
    await page.getByTestId('MAIL-retry').click();
    await expect(page.locator('[data-testid^="MAIL-attempt-"]')).toHaveCount(3);

    const attemptExportPromise = page.waitForEvent('download');
    await page.locator('[data-testid^="MAIL-export-attempt-"]').first().click();
    const attemptDownload = await attemptExportPromise;
    expect(attemptDownload.suggestedFilename()).toMatch(/content-pack-\d+\.zip$/);
    await attemptDownload.saveAs(path.join(EVIDENCE, 'mail-simulated-attempt.zip'));
    await page.waitForTimeout(500);

    const mailState = await state(page);
    expect(mailState.attempts).toBe(3);
    // Ordinary exports remain separate: email drawer wrote no product export record.
    expect(mailState.exports.map((record) => record.id).some((id) => id.includes('mail'))).toBe(false);
    await page.screenshot({ path: path.join(EVIDENCE, 'deliverables-mail-attempts-1440.png') });
    await page.getByTestId('MAIL-close').click();
    await expect(page.getByTestId('deliverables-mail')).toBeHidden();
    // The ordinary export list is still empty/honest after mail simulation.
    const finalState = await state(page);
    expect(finalState.exports).toHaveLength(0);
  });
});
