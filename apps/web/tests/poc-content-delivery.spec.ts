import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const EVIDENCE = path.resolve(process.cwd(), 'evidence', 'poc', 'fix-nv-batch-01');
async function settle(page: Page) {
  await page.waitForLoadState('load');
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(150);
}
async function dismissToasts(page: Page) {
  const dismiss = page.getByRole('button', { name: 'Dismiss notification' });
  let remaining = await dismiss.count();
  while (remaining > 0) {
    await dismiss.first().click();
    await page.waitForTimeout(40);
    remaining = await dismiss.count();
  }
}
async function shot(page: Page, name: string) {
  mkdirSync(EVIDENCE, { recursive: true });
  await dismissToasts(page);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(EVIDENCE, name), fullPage: true, animations: 'disabled' });
}
async function openConfirmedSession(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'load' });
  await settle(page);
  await page.getByTestId('home-start-enabled').first().click();
  await expect(page).toHaveURL(/\/poc\/usr\./);
  await page.getByTestId('run-discovery').click();
  await expect(page.getByTestId('signal-card')).toHaveCount(5);
  await page.getByRole('button', { name: /Analysis & script/ }).click();
  await page.getByTestId('run-analysis').click();
  await expect(page.getByTestId('confirm-script')).toBeEnabled();
  await page.getByTestId('confirm-script').click();
  await expect(page.getByText(/Script confirmed/).first()).toBeVisible();
  await dismissToasts(page);
}

test('content-only delivery: explicit failure and retry, history, real ZIP, reload persistence and script invalidation', async ({ page }) => {
  await openConfirmedSession(page);
  await page.getByRole('button', { name: /Content delivery/ }).click();
  await expect(page.getByTestId('mail-preview')).toBeVisible();
  await expect(page.getByTestId('confirm-content-delivery')).toBeDisabled();
  await expect(page.getByTestId('no-attempts')).toBeVisible();
  await expect(page.getByText('No email sent', { exact: false }).first()).toBeVisible();
  await expect(page.getByTestId('delivery-subject')).toHaveValue(/SIMULATED · CONTENT ONLY/);

  await page.getByTestId('delivery-subject').fill('[SIMULATED · CONTENT ONLY] Browser delivery test');
  await page.getByTestId('delivery-body').fill('SIMULATED CONTENT-ONLY EMAIL — NO EMAIL WAS SENT.\nAttachments are local script-pack files only.');
  await page.getByTestId('save-content-draft').click();
  await expect(page.getByTestId('content-attachments')).toBeVisible();
  await expect(page.getByTestId('content-attachments').locator('li')).toHaveCount(4);
  await expect(page.getByTestId('content-attachments')).toContainText('.vtt');
  await expect(page.getByTestId('content-attachments')).toContainText('script.json');
  await expect(page.getByTestId('content-attachments')).not.toContainText('mp4');
  await expect(page.getByTestId('content-attachments')).not.toContainText('poster');
  await expect(page.getByTestId('confirm-content-delivery')).toBeEnabled();

  // Saved draft is the confirmation snapshot: unsaved subject/recipient edits
  // must block both success and failure, and a non-.invalid address cannot be
  // used to keep confirming the previously saved valid draft.
  await page.getByTestId('delivery-subject').fill('[SIMULATED · CONTENT ONLY] MAIN UNSAVED DISPLAY SUBJECT');
  await page.getByLabel('.invalid email').first().fill('changed-recipient@lavish-demo.invalid');
  await expect(page.getByTestId('delivery-dirty-hint')).toBeVisible();
  await expect(page.getByTestId('confirm-content-delivery')).toBeDisabled();
  await expect(page.getByTestId('fail-content-delivery')).toBeDisabled();
  await shot(page, 'delivery-unsaved-1440.png');
  await page.getByTestId('confirm-content-delivery').click({ force: true });
  await expect(page.getByTestId('content-delivery-confirm')).toHaveCount(0);
  await page.getByLabel('.invalid email').first().fill('real-person@example.com');
  await page.getByTestId('save-content-draft').click();
  await expect(page.getByText(/Every recipient must use a \.invalid demo address/)).toBeVisible();
  await expect(page.getByTestId('confirm-content-delivery')).toBeDisabled();
  await page.getByTestId('discard-delivery-edits').click();
  await expect(page.getByTestId('delivery-subject')).toHaveValue('[SIMULATED · CONTENT ONLY] Browser delivery test');
  await expect(page.getByLabel('.invalid email').first()).toHaveValue('brand-review@lavish-demo.invalid');
  await expect(page.getByTestId('confirm-content-delivery')).toBeEnabled();

  await page.getByTestId('delivery-subject').fill('[SIMULATED · CONTENT ONLY] Browser delivery saved v2');
  await page.getByLabel('.invalid email').first().fill('changed-recipient@lavish-demo.invalid');
  await page.getByTestId('save-content-draft').click();
  await expect(page.getByTestId('delivery-dirty-hint')).toHaveCount(0);
  await expect(page.getByTestId('confirm-content-delivery')).toBeEnabled();
  await dismissToasts(page);
  await page.getByTestId('fail-content-delivery').click();
  await expect(page.getByTestId('content-delivery-confirm')).toBeVisible();
  await expect(page.getByTestId('content-delivery-confirm')).toContainText('Browser delivery saved v2');
  await expect(page.getByTestId('content-delivery-confirm')).toContainText('changed-recipient@lavish-demo.invalid');
  await expect(page.getByTestId('content-delivery-confirm')).not.toContainText('MAIN UNSAVED DISPLAY SUBJECT');
  await expect(page.getByTestId('content-delivery-confirm')).toContainText('No MP4 or poster is included');
  await expect(page.getByTestId('content-delivery-confirm')).toContainText('SIMULATED-DELIVERY.json');
  await shot(page, 'delivery-confirm-saved-1440.png');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByTestId('content-delivery-confirm')).toHaveCount(0);
  await expect(page.getByTestId('attempt-table')).toHaveCount(0);
  await expect(page.getByTestId('no-attempts')).toBeVisible();

  await page.getByTestId('fail-content-delivery').click();
  await page.getByTestId('confirm-content-simulate').click();
  await expect(page.getByText(/Simulated failure recorded/)).toBeVisible();
  await expect(page.getByTestId('attempt-table').locator('tbody tr')).toHaveCount(1);
  await expect(page.getByTestId('attempt-table')).toContainText('Simulated failure');

  await page.getByTestId('confirm-content-delivery').click();
  await page.getByTestId('confirm-content-simulate').click();
  await expect(page.getByText(/Simulated content delivery recorded/)).toBeVisible();
  await expect(page.getByTestId('attempt-table').locator('tbody tr')).toHaveCount(2);
  await expect(page.getByTestId('attempt-table')).toContainText('Simulated delivered');
  await shot(page, 'delivery-fixed-1440.png');

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-attempt').last().click();
  const download = await downloadPromise;
  const zipPath = path.join(EVIDENCE, 'e2e-content-delivery-pack.zip');
  await download.saveAs(zipPath);
  const bytes = readFileSync(zipPath);
  expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK');
  const text = bytes.toString('latin1');
  expect(text).toContain('SIMULATED-DELIVERY.json');
  expect(text).toContain('README.txt');
  expect(text).toContain('Browser delivery saved v2');
  expect(text).toContain('changed-recipient@lavish-demo.invalid');
  expect(text).toContain('simulated_delivered');
  expect(text.includes('.mp4')).toBe(false);

  // Reload: attempts and the saved draft are local-storage state, history stays read-only.
  await page.reload({ waitUntil: 'load' });
  await settle(page);
  await page.getByRole('button', { name: /Content delivery/ }).click();
  await expect(page.getByTestId('attempt-table').locator('tbody tr')).toHaveCount(2);
  await expect(page.getByTestId('delivery-subject')).toHaveValue(/Browser delivery saved v2/);
  await expect(page.getByTestId('attempt-table').locator('button')).toHaveCount(2);
  await expect(page.locator('video')).toHaveCount(0);

  // Changing the script invalidates the pending draft but preserves attempts.
  await page.getByRole('button', { name: /Analysis & script/ }).click();
  await page.getByLabel('Script title').fill('Preset title changed after delivery');
  await page.getByTestId('save-script').click();
  await expect(page.getByText(/Saved EN script v/)).toBeVisible();
  await dismissToasts(page);
  await page.getByTestId('confirm-script').click();
  await expect(page.getByText(/Script confirmed/).first()).toBeVisible();
  await dismissToasts(page);
  await page.getByRole('button', { name: /Content delivery/ }).click();
  await expect(page.getByTestId('attempt-table').locator('tbody tr')).toHaveCount(2);
  await expect(page.getByTestId('content-attachments')).toHaveCount(0);
  await expect(page.getByTestId('confirm-content-delivery')).toBeDisabled();
  await expect(page.getByText(/Save a draft to generate/)).toBeVisible();
  await shot(page, 'delivery-invalidated-1440.png');
});
