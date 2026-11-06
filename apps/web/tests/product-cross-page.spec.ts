import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const DB_NAME = 'lavish-poc-content-v1';
const EVIDENCE = process.env.EVIDENCE_ROOT
  ? path.resolve(process.env.EVIDENCE_ROOT)
  : path.resolve(process.cwd(), 'evidence', 'product', 'workspace-integration', 'ws-004', 'cross-page');

interface SessionSnapshot {
  id: string;
  purpose?: string;
  revision: number;
  updatedAt: string;
  activeBriefId: string | null;
  activeScriptVersionId: string | null;
  workflow: Record<string, string>;
  userVersions: Array<{ id: string; language: string; content: { title: string } }>;
  historyLength: number;
}

interface ExportSnapshot {
  id: string;
  status: string;
  version: { versionId: string; sessionId: string | null };
  sha256: string;
  archiveSha256: string;
}

async function snapshot(page: Page): Promise<{ sessions: SessionSnapshot[]; exports: ExportSnapshot[] }> {
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
    const sessions = await getAll<{
      id: string; purpose?: string; revision: number; updatedAt: string;
      state: { activeBriefId: string | null; activeScriptVersionId: string | null; workflow: Record<string, string>; userVersions: Array<{ id: string; language: string; content: { title: string } }>; history: unknown[] };
    }>('sessions');
    const storedExports = await getAll<{ record: ExportSnapshot }>('productExports');
    db.close();
    return {
      sessions: sessions.map((session) => ({
        id: session.id,
        purpose: session.purpose,
        revision: session.revision,
        updatedAt: session.updatedAt,
        activeBriefId: session.state.activeBriefId,
        activeScriptVersionId: session.state.activeScriptVersionId,
        workflow: session.state.workflow,
        userVersions: session.state.userVersions,
        historyLength: session.state.history.length,
      })),
      exports: storedExports.map((value) => ({ id: value.record.id, status: value.record.status, version: value.record.version, sha256: value.record.archiveSha256, archiveSha256: value.record.archiveSha256 })),
    };
  }, DB_NAME);
}

function hashFile(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

async function browseAllWorkspaces(page: Page): Promise<void> {
  const routes = [
    '/radar?source=instagram',
    '/opportunities',
    '/opportunities/scn-luxury-gifting.analysis.main',
    '/atelier?campaignId=scn-oud-storytelling.brief.main&language=ar&tab=storyboard',
    '/library?language=ar&kind=script',
    '/deliverables?campaignId=scn-luxury-gifting.brief.main&language=ar',
    '/',
    '/radar?campaignId=scn-scent-layering.brief.main&source=pinterest',
  ];
  for (const route of routes) {
    await page.goto(route, { waitUntil: 'networkidle' });
    await expect(page.locator('h1').first()).toBeVisible();
  }
}

async function openDownloads(page: Page) {
  const details = page.getByTestId('deliverables-downloads');
  await expect(details).toBeVisible();
  if (!(await details.evaluate((element) => element.hasAttribute('open')))) {
    await details.locator('summary').first().click();
  }
}

test.describe('IP-009 · cross-page consistency and read-only safety', () => {
  test('read-only sweep across all workspaces never creates sessions or exports, and explicit edits stay unchanged by later browsing', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await browseAllWorkspaces(page);
    expect(await snapshot(page)).toEqual({ sessions: [], exports: [] });

    // One explicit edit creates exactly one working session.
    await page.goto('/atelier?campaignId=scn-scent-layering.brief.main&language=en', { waitUntil: 'networkidle' });
    await page.getByTestId('AT-edit').click();
    await page.getByTestId('AT-field-hook').fill('Cross-page working draft');
    await page.getByTestId('AT-save').click();
    await expect(page.locator('text=New version saved')).toBeVisible();
    await page.locator('[data-testid="atelier-editor"] button', { hasText: 'Close' }).first().click();
    const before = await snapshot(page);
    expect(before.sessions).toHaveLength(1);
    expect(before.sessions[0].purpose).toBe('editing');
    expect(before.sessions[0].userVersions.at(-1)?.content.title).toBe('SERENITY — A Story in Layers');
    expect(before.exports).toHaveLength(0);

    await browseAllWorkspaces(page);
    const after = await snapshot(page);
    expect(after.sessions).toEqual(before.sessions);
    expect(after.exports).toEqual(before.exports);
  });

  test('A Campaign flows Atelier → Library → Deliverables with the same version/session, works after reload and Back/Forward', async ({ page }) => {
    await page.goto('/atelier?campaignId=scn-luxury-gifting.brief.main&language=en', { waitUntil: 'networkidle' });
    await page.getByTestId('AT-edit').click();
    await page.getByTestId('AT-field-title').fill('Cross-page confirmed title');
    await page.getByTestId('AT-save').click();
    await expect(page.locator('text=New version saved')).toBeVisible();
    await page.locator('[data-testid="atelier-editor"] button', { hasText: 'Close' }).first().click();
    const savedUrl = new URL(page.url());
    const versionId = savedUrl.searchParams.get('versionId') as string;
    const sessionId = savedUrl.searchParams.get('sessionId') as string;

    await page.getByTestId('AT-edit').click();
    await page.getByTestId('AT-confirm').click();
    await expect(page.locator('text=not a Lavish formal approval')).toBeVisible();
    await page.locator('[data-testid="atelier-editor"] button', { hasText: 'Close' }).first().click();
    const atelierPath = page.url();

    // Library resolves the exact saved version.
    await page.goto(`/library?campaignId=scn-luxury-gifting.brief.main&language=en&origin=saved&versionId=${encodeURIComponent(versionId)}&sessionId=${encodeURIComponent(sessionId)}`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('library-preview')).toBeVisible();
    await expect(page.getByTestId('script-preview')).toContainText('Cross-page confirmed title');
    const row = page.locator('[data-testid^="LIB-row-"]').filter({ hasText: 'Cross-page confirmed title' }).first();
    const atelierHref = await row.locator('a', { hasText: 'Open in Atelier' }).getAttribute('href');
    expect(atelierHref).toContain(`versionId=${encodeURIComponent(versionId)}`);
    expect(atelierHref).toContain(`sessionId=${encodeURIComponent(sessionId)}`);

    // Deliverables exports the same confirmed version.
    await page.goto(`/deliverables?campaignId=scn-luxury-gifting.brief.main&language=en&versionId=${encodeURIComponent(versionId)}&sessionId=${encodeURIComponent(sessionId)}`, { waitUntil: 'networkidle' });
  await openDownloads(page);
    await expect(page.getByTestId('deliverable-package')).toContainText('Cross-page confirmed title');
    await expect(page.getByTestId('deliverable-package')).toContainText('Confirmed current version');
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('DEL-download').click();
    const download = await downloadPromise;
    const target = path.join(EVIDENCE, 'cross-page-A-confirmed.zip');
    await download.saveAs(target);
    await page.waitForTimeout(600);
    const state = await snapshot(page);
    const record = state.exports.at(-1);
    expect(record?.version.versionId).toBe(versionId);
    expect(record?.version.sessionId).toBe(sessionId);
    expect(record?.status).toBe('download_triggered');
    expect(hashFile(target)).toBe(record?.sha256);

    // Refresh remains on the exact object.
    await page.reload({ waitUntil: 'networkidle' });
    await openDownloads(page);
    await expect(page.getByTestId('deliverable-package')).toContainText('Cross-page confirmed title');
    const detailPanel = page.getByTestId(`DEL-detail-panel-${record?.id}`);
    if (!(await detailPanel.isVisible().catch(() => false))) {
      await page.getByTestId(`DEL-details-${record?.id}`).click();
    }
    await expect(detailPanel).toContainText(versionId);

    // Back/Forward returns to the exact Atelier preview without state drift.
    await page.goBack({ waitUntil: 'networkidle' });
    expect(page.url()).toContain('/library');
    await page.goBack({ waitUntil: 'networkidle' });
    expect(page.url()).toContain('/atelier?campaignId=scn-luxury-gifting.brief.main');
    await expect(page.getByTestId('atelier-page')).toContainText('Cross-page confirmed title');
    await page.goForward({ waitUntil: 'networkidle' });
    expect(page.url()).toContain('/library');
    await page.goForward({ waitUntil: 'networkidle' });
    expect(page.url()).toContain('/deliverables');
    const afterHistory = await snapshot(page);
    expect(afterHistory.sessions).toEqual(state.sessions);
    expect(afterHistory.exports.map((value) => value.sha256)).toEqual(state.exports.map((value) => value.sha256));
    void atelierPath;
  });

  test('B and C can be exported cold from Library and Deliverables without sessions, confirmations or email attempts', async ({ page }) => {
    await page.goto('/library?campaignId=scn-oud-storytelling.brief.main&language=en&kind=script&origin=preset', { waitUntil: 'networkidle' });
    const libraryDownload = page.waitForEvent('download');
    await page.locator('button', { hasText: 'Export content pack' }).first().click();
    const libraryFile = await libraryDownload;
    await libraryFile.saveAs(path.join(EVIDENCE, 'cold-library-C-en.zip'));

    await page.goto('/deliverables?campaignId=scn-luxury-gifting.brief.main&language=ar', { waitUntil: 'networkidle' });
  await openDownloads(page);
    const deliverableDownload = page.waitForEvent('download');
    await page.getByTestId('DEL-download').click();
    const deliverableFile = await deliverableDownload;
    await deliverableFile.saveAs(path.join(EVIDENCE, 'cold-deliverables-B-ar.zip'));
    await page.waitForTimeout(600);

    const state = await snapshot(page);
    expect(state.sessions).toHaveLength(0);
    expect(state.exports).toHaveLength(2);
    expect(state.exports.every((record) => record.status === 'download_triggered')).toBe(true);
    const libraryRecord = state.exports.find((record) => record.version.versionId === 'scn-oud-storytelling.script.en-v1');
    const deliverableRecord = state.exports.find((record) => record.version.versionId === 'scn-luxury-gifting.script.ar-v1');
    expect(libraryRecord).toBeTruthy();
    expect(deliverableRecord).toBeTruthy();
    expect(hashFile(path.join(EVIDENCE, 'cold-library-C-en.zip'))).toBe(libraryRecord?.sha256);
    expect(hashFile(path.join(EVIDENCE, 'cold-deliverables-B-ar.zip'))).toBe(deliverableRecord?.sha256);
  });

  test('Activity replay and preview-only switching never mutate the working script or its confirmation', async ({ page }) => {
    await page.goto('/atelier?campaignId=scn-scent-layering.brief.main&language=en', { waitUntil: 'networkidle' });
    await page.getByTestId('AT-edit').click();
    await page.getByTestId('AT-confirm').click();
    await expect(page.locator('text=not a Lavish formal approval')).toBeVisible();
    await page.locator('[data-testid="atelier-editor"] button', { hasText: 'Close' }).first().click();
    const before = await snapshot(page);
    const work = before.sessions.find((session) => session.purpose !== 'activity');
    expect(work?.workflow.analysis).toBe('completed');

    await page.getByTestId('AT-language-ar').click();
    await page.waitForURL((url) => url.searchParams.get('language') === 'ar');
    await page.getByTestId('AT-tab-storyboard').click();
    await expect(page.getByTestId('storyboard-preview')).toBeVisible();
    const afterPreview = await snapshot(page);
    expect(afterPreview.sessions).toEqual(before.sessions);

    await page.goto('/radar', { waitUntil: 'networkidle' });
    await page.getByTestId('ACT-open').click();
    await page.getByTestId('ACT-step').click();
    await page.waitForTimeout(600);
    await page.getByTestId('ACT-close').click();
    const afterActivity = await snapshot(page);
    const activity = afterActivity.sessions.find((session) => session.purpose === 'activity');
    expect(activity).toBeTruthy();
    const workAfter = afterActivity.sessions.find((session) => session.purpose !== 'activity');
    expect(workAfter?.revision).toBe(work?.revision);
    expect(workAfter?.activeScriptVersionId).toBe(work?.activeScriptVersionId);
    expect(workAfter?.workflow).toEqual(work?.workflow);
    expect(afterActivity.exports).toHaveLength(0);
  });
});
