import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const EVIDENCE = path.resolve(process.cwd(), 'evidence', 'poc', 'fix-nv-batch-01');
async function dismissToasts(page: Page) {
  const dismiss = page.getByRole('button', { name: 'Dismiss notification' });
  let remaining = await dismiss.count();
  while (remaining > 0) {
    await dismiss.first().click();
    await page.waitForTimeout(40);
    remaining = await dismiss.count();
  }
}
async function shot(page: Page, name: string, fullPage = true, cleanToasts = true) {
  mkdirSync(EVIDENCE, { recursive: true });
  if (cleanToasts) await dismissToasts(page);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(EVIDENCE, name), fullPage, animations: 'disabled' });
}
async function settle(page: Page) {
  await page.waitForLoadState('load');
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(150);
}
async function openHome(page: Page) {
  await page.goto('/', { waitUntil: 'load' });
  await settle(page);
}

test('A content-only demo: start, discovery, script edit/save/confirm, storyboard, delivery ZIP, replay, reset', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openHome(page);
  await expect(page.getByTestId('home-scenario-row')).toHaveCount(3);
  await expect(page.getByText('Content demo').first()).toBeVisible();
  await expect(page.getByText('Video deferred').first()).toBeVisible();
  await expect(page.getByTestId('home-start-enabled')).toHaveCount(3);
  await shot(page, 'home-1440.png');

  await page.getByTestId('home-start-enabled').first().click();
  await expect(page).toHaveURL(/\/poc\/usr\./);
  await expect(page.getByTestId('content-workflow')).toBeVisible();
  await expect(page.getByTestId('content-only-banner')).toContainText('Video production is intentionally deferred');

  // Discovery.
  await page.getByTestId('run-discovery').click();
  await expect(page.getByTestId('signal-card')).toHaveCount(5);
  await expect(page.getByText('Synthetic signals')).toBeVisible();
  await dismissToasts(page);
  await page.getByTestId('signal-card').first().click();
  await expect(page.getByTestId('content-evidence-drawer')).toContainText(/not a real platform post/i);
  await shot(page, 'evidence-drawer-1440.png');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('content-evidence-drawer')).toHaveCount(0);
  await page.getByTestId('events-toggle').click();
  await expect(page.getByTestId('event-list')).toBeVisible();
  await shot(page, 'discovery-1440.png');
  await page.getByRole('button', { name: /Analysis & script/ }).click();
  await page.getByTestId('run-analysis').click();

  // Analysis editor: edit and save EN.
  await expect(page.getByTestId('save-script')).toBeVisible();
  await page.getByLabel('Script title').fill('Your Scent, Your Expression — edited EN');
  await page.getByTestId('save-script').click();
  await expect(page.getByText(/Saved EN script v/)).toBeVisible();
  await expect(page.getByTestId('save-script')).toBeEnabled();
  await expect(page.getByTestId('content-workflow')).toHaveAttribute('data-dirty', 'false');
  await page.getByRole('button', { name: /Preset AR v1/ }).click();
  await expect(page.getByRole('button', { name: /Preset AR v1/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Script title').fill('لكل رائحة حكاية — edited AR');
  await expect(page.getByTestId('content-workflow')).toHaveAttribute('data-dirty', 'true');
  await page.getByTestId('save-script').click();
  await expect(page.getByText(/Saved AR script v/)).toBeVisible();
  await expect(page.getByTestId('save-script')).toBeEnabled();
  await expect(page.getByLabel('Script title')).toHaveValue(/edited AR/);
  await shot(page, 'analysis-ar-1440.png');

  // Refresh keeps the saved AR draft/version.
  await page.reload({ waitUntil: 'load' });
  await settle(page);
  await expect(page.getByTestId('content-workflow')).toBeVisible();
  await page.getByRole('button', { name: /Analysis & script/ }).click();
  await expect(page.getByLabel('Script title')).toHaveValue(/edited AR/);

  // Confirm the current saved version.
  await page.getByTestId('confirm-script').click();
  await expect(page.getByText('Script confirmed. Video remains deferred; content delivery is now available.')).toBeVisible();
  await shot(page, 'analysis-confirmed-1440.png');

  // Storyboard with real product images, no video player.
  await page.getByRole('button', { name: /Storyboard/ }).click();
  await expect(page.getByText('Video production deferred').first()).toBeVisible();
  await expect(page.getByTestId('shot-card')).toHaveCount(4);
  await expect(page.getByTestId('shot-card').locator('img')).toHaveCount(4);
  await expect(page.locator('video')).toHaveCount(0);
  await expect(page.getByText('No MP4 / poster')).toBeVisible();
  await shot(page, 'storyboard-1440.png');
  await page.getByTestId('go-content-delivery').click();

  // Content delivery: save draft, record explicit failure, then success.
  await expect(page.getByTestId('save-content-draft')).toBeVisible();
  await expect(page.getByTestId('delivery-subject')).toHaveValue(/SIMULATED · CONTENT ONLY/);
  await page.getByTestId('delivery-subject').fill('[SIMULATED · CONTENT ONLY] E2E content review');
  await page.getByTestId('save-content-draft').click();
  await expect(page.getByTestId('content-attachments')).toBeVisible();
  await expect(page.getByTestId('content-attachments').locator('li')).toHaveCount(4);
  await expect(page.getByTestId('content-attachments')).not.toContainText('mp4');
  await dismissToasts(page);
  await page.getByTestId('fail-content-delivery').click();
  await expect(page.getByTestId('content-delivery-confirm')).toBeVisible();
  await shot(page, 'delivery-confirm-1440.png', true, false);
  await page.getByTestId('confirm-content-simulate').click();
  await expect(page.getByText(/Simulated failure recorded/)).toBeVisible();
  await expect(page.getByTestId('attempt-table')).toContainText('Simulated failure');
  await page.getByTestId('confirm-content-delivery').click();
  await expect(page.getByTestId('content-delivery-confirm')).toBeVisible();
  await page.getByTestId('confirm-content-simulate').click();
  await expect(page.getByText(/Simulated content delivery recorded/)).toBeVisible();
  await expect(page.getByTestId('attempt-table').locator('tbody tr')).toHaveCount(2);
  await shot(page, 'delivery-1440.png');

  const exportPromise = page.waitForEvent('download');
  await page.getByTestId('export-attempt').last().click();
  const archive = await exportPromise;
  const zipPath = path.join(EVIDENCE, 'e2e-content-pack.zip');
  await archive.saveAs(zipPath);
  const zipText = readFileSync(zipPath).toString('latin1');
  expect(zipText).toContain('README.txt');
  expect(zipText).toContain('SIMULATED-DELIVERY.json');
  expect(zipText).toContain('.vtt');
  expect(zipText).toContain('script.json');
  expect(zipText.includes('.mp4')).toBe(false);
  expect(readFileSync(zipPath).subarray(0, 2).toString('latin1')).toBe('PK');
  expect(archive.suggestedFilename()).toMatch(/content-pack-\d+\.zip$/);

  // Replay stays on the intelligence/script prefix; save a screenshot and refresh stays paused.
  await page.getByTestId('content-mode-replay').click();
  await expect(page.getByTestId('replay-entities')).toBeVisible();
  await expect(page.getByText('Replay ended at the analysis prefix. Video and delivery events are not replayed.')).not.toBeVisible();
  await page.getByTestId('replay-play-pause').click();
  await page.waitForTimeout(300);
  await page.getByTestId('replay-play-pause').click();
  await page.getByTestId('replay-speed-2').click();
  await expect(page.getByTestId('replay-controls')).toContainText('2×');
  await expect(page.getByTestId('replay-seek')).not.toHaveValue('0');
  await shot(page, 'replay-1440.png');
  await page.reload({ waitUntil: 'load' });
  await settle(page);
  await expect(page.getByTestId('content-mode-replay')).toBeVisible();

  // 1366 composition on the delivery page.
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByTestId('content-mode-workflow').click();
  await page.getByRole('button', { name: /Content delivery/ }).click();
  await expect(page.getByTestId('mail-preview')).toBeVisible();
  const overflow1366 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow1366).toBeLessThanOrEqual(1);
  await shot(page, 'delivery-1366.png');

  // Home reset affects only this session.
  await openHome(page);
  await expect(page.getByTestId('home-session-row')).toHaveCount(1);
  await page.getByTestId('home-session-reset').click();
  await expect(page.getByTestId('home-reset-dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Reset session' }).click();
  await expect(page.getByText('This local demo session was reset.')).toBeVisible();
  await expect(page.getByTestId('home-session-row')).toHaveCount(1);
  await expect(page.getByTestId('home-session-row')).toContainText('revision');
  const homeExportPromise = page.waitForEvent('download');
  await page.getByTestId('home-session-export').click();
  const homeExport = await homeExportPromise;
  const recordPath = path.join(EVIDENCE, 'e2e-home-run-record.json');
  await homeExport.saveAs(recordPath);
  const record = JSON.parse(readFileSync(recordPath, 'utf8'));
  expect(record.kind).toBe('run_record');
  expect(record.mode).toBe('mock');
  expect(JSON.stringify(record)).toContain('content_only');
  expect(JSON.stringify(record)).not.toContain('.mp4');
});

test('all three approved content scenarios start from Home and expose five signals', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const titles = ['The Art of Scent Layering', 'The Thought Behind the Gift', 'A Story in Oud'];
  for (let index = 0; index < titles.length; index += 1) {
    await openHome(page);
    await expect(page.getByTestId('home-start-enabled')).toHaveCount(3);
    await page.getByTestId('home-start-enabled').nth(index).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(titles[index]);
    await expect(page.getByTestId('content-only-banner')).toContainText('Video production is intentionally deferred');
    await page.getByTestId('run-discovery').click();
    await expect(page.getByTestId('signal-card')).toHaveCount(5);
    await expect(page.getByTestId('content-workflow')).toBeVisible();
  }
});

test('unsaved script edits are protected by a discard dialog before leaving analysis', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openHome(page);
  await page.getByTestId('home-start-enabled').first().click();
  await page.getByTestId('run-discovery').click();
  await page.getByRole('button', { name: /Analysis & script/ }).click();
  await page.getByTestId('run-analysis').click();
  await page.getByLabel('Hook').fill('An unsaved hook that must not be lost silently');
  await page.getByRole('button', { name: /Storyboard/ }).click();
  await expect(page.getByTestId('content-dirty-dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByLabel('Hook')).toHaveValue('An unsaved hook that must not be lost silently');
  await page.getByRole('button', { name: /Storyboard/ }).click();
  await page.getByRole('button', { name: 'Discard and leave' }).click();
  await expect(page.getByRole('heading', { name: 'Storyboard' })).toBeVisible();
  await expect(page.getByText('Confirm the script first')).toBeVisible();
  await expect(page.locator('video')).toHaveCount(0);
});

test('discarded script edits restore the visible and submitted values', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openHome(page);
  await page.getByTestId('home-start-enabled').first().click();
  await page.getByTestId('run-discovery').click();
  await page.getByRole('button', { name: /Analysis & script/ }).click();
  await page.getByTestId('run-analysis').click();
  const originalTitle = await page.getByLabel('Script title').inputValue();
  const originalShot = await page.getByLabel('On-screen text').first().inputValue();
  const originalSubtitle = await page.getByLabel('Subtitle text').first().inputValue();
  await page.getByLabel('Script title').fill('MAIN DISCARDED TITLE MUST NOT RETURN');
  await page.getByLabel('On-screen text').first().fill('MAIN DISCARDED SHOT MUST NOT RETURN');
  await page.getByLabel('Subtitle text').first().fill('MAIN DISCARDED SUBTITLE MUST NOT RETURN');
  await page.getByTestId('discard-script-edits').click();
  await expect(page.getByLabel('Script title')).toHaveValue(originalTitle);
  await expect(page.getByLabel('On-screen text').first()).toHaveValue(originalShot);
  await expect(page.getByLabel('Subtitle text').first()).toHaveValue(originalSubtitle);
  await shot(page, 'script-discarded-1440.png');
  await page.getByTestId('save-script').click();
  await expect(page.getByText(/Saved EN script v/)).toBeVisible();
  await dismissToasts(page);
  await page.reload({ waitUntil: 'load' });
  await settle(page);
  await page.getByRole('button', { name: /Analysis & script/ }).click();
  await expect(page.getByLabel('Script title')).toHaveValue(originalTitle);
  await expect(page.getByLabel('On-screen text').first()).toHaveValue(originalShot);
  await expect(page.getByLabel('Subtitle text').first()).toHaveValue(originalSubtitle);
});

test('discard-and-leave and dirty version switching cannot resurrect discarded script input', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openHome(page);
  await page.getByTestId('home-start-enabled').first().click();
  await page.getByTestId('run-discovery').click();
  await page.getByRole('button', { name: /Analysis & script/ }).click();
  await page.getByTestId('run-analysis').click();
  const originalTitle = await page.getByLabel('Script title').inputValue();
  await page.getByLabel('Script title').fill('MAIN DISCARD-LEAVE TITLE MUST NOT RETURN');
  await page.getByRole('button', { name: /Storyboard/ }).click();
  await expect(page.getByTestId('content-dirty-dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Discard and leave' }).click();
  await page.getByRole('button', { name: /Analysis & script/ }).click();
  await expect(page.getByLabel('Script title')).toHaveValue(originalTitle);
  await page.getByTestId('save-script').click();
  await expect(page.getByText(/Saved EN script v/)).toBeVisible();
  await dismissToasts(page);

  await page.getByLabel('Script title').fill('MAIN DIRTY VERSION TITLE MUST NOT RETURN');
  await page.getByRole('button', { name: /Preset AR v1/ }).click();
  await expect(page.getByTestId('content-dirty-dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Discard and leave' }).click();
  await expect(page.getByRole('button', { name: /Preset AR v1/ })).toHaveAttribute('aria-pressed', 'true');
  const arTitle = await page.getByLabel('Script title').inputValue();
  expect(arTitle).not.toBe('MAIN DIRTY VERSION TITLE MUST NOT RETURN');
  await page.getByTestId('save-script').click();
  await expect(page.getByText(/Saved AR script v/)).toBeVisible();
  await dismissToasts(page);
  await page.reload({ waitUntil: 'load' });
  await settle(page);
  await page.getByRole('button', { name: /Analysis & script/ }).click();
  await expect(page.getByLabel('Script title')).toHaveValue(arTitle);
});

test('AR layout and mobile content pages have no document overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHome(page);
  await page.getByTestId('home-start-enabled').first().click();
  await page.getByTestId('run-discovery').click();
  await page.getByRole('button', { name: /Analysis & script/ }).click();
  await page.getByTestId('run-analysis').click();
  await page.getByRole('button', { name: /Preset AR v1/ }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await shot(page, 'analysis-ar-390.png');
});


