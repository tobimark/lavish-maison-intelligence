import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const EVIDENCE = process.env.EVIDENCE_ROOT
  ? path.resolve(process.env.EVIDENCE_ROOT)
  : path.resolve(process.cwd(), 'evidence', 'product', 'workspace-integration', 'ws-003');
const CAMPAIGN = 'scn-scent-layering.brief.main';
const SOCIAL = `/campaigns/${CAMPAIGN}/journey?scenarioVersion=1.1.0&stage=social`;

async function open(page: Page, url = SOCIAL) {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForLoadState('load');
  await page.evaluate(async () => { await document.fonts.ready; });
  await expect(page.getByTestId('social-stage')).toBeVisible();
}

async function shot(page: Page, name: string) {
  mkdirSync(EVIDENCE, { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(EVIDENCE, name), fullPage: false, animations: 'disabled' });
}

async function createDraft(page: Page, caption: string) {
  if (await page.getByTestId('SOC-edit-post').isEnabled()) {
    await page.getByTestId('SOC-edit-post').click();
    await expect(page.getByTestId('SOC-draft-state')).toContainText('Draft revision');
  }
  await page.getByTestId('SOC-caption-input').fill(caption);
  await expect(page.getByTestId('SOC-dirty-note')).toBeVisible();
  await page.getByTestId('SOC-save').click();
  await expect(page.getByTestId('SOC-draft-state')).toContainText('Draft revision');
  await expect(page.getByTestId('SOC-caption-input')).toHaveValue(caption);
}

async function confirmSourceScript(page: Page) {
  await page.getByTestId('SOC-review').click();
  const panel = page.getByTestId('SOC-confirm-creative-panel');
  if (await panel.isVisible().catch(() => false)) {
    await page.getByTestId('SOC-confirm-creative').click();
    await expect(page.getByTestId('SOC-script-state')).toContainText('Confirmed in this browser');
    await page.getByTestId('SOC-review').click();
  }
}

async function reviewPost(page: Page, expectedReply: { language: string; caption: string }) {
  await confirmSourceScript(page);
  const dialog = page.getByTestId('SOC-review-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(expectedReply.language);
  await expect(dialog).toContainText(expectedReply.caption);
  await expect(dialog).toContainText('15d3756a0e93f591fc767998d84911ed425e3394554272f62120d61f0e31e10e');
  await page.getByTestId('SOC-review-confirm').click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('SOC-draft-state')).toContainText('ready to simulate');
}

async function simulatePublish(page: Page, expectedReply: { language: string; caption: string }, duplicateClick = false) {
  await page.getByTestId('SOC-simulate').click();
  const dialog = page.getByTestId('SOC-publish-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(expectedReply.language);
  await expect(dialog).toContainText(expectedReply.caption);
  await expect(dialog).toContainText('No content is sent to Instagram');
  if (duplicateClick) {
    await page.evaluate(() => {
      const button = document.querySelector<HTMLButtonElement>('[data-testid="SOC-publish-confirm"]');
      button?.click();
      button?.click();
    });
  } else {
    await page.getByTestId('SOC-publish-confirm').click();
  }
  await expect(page.getByTestId('SOC-view-post')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('SOC-history')).toContainText(expectedReply.caption);
}

test.describe('FLOW-003 · Instagram simulated social post', () => {
  test.setTimeout(120_000);

  test('EN draft save, refresh recovery, accurate review, simulated publish, detail and history', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);

    // Read-only preset preview first: no draft, no write.
    await expect(page.getByTestId('SOC-draft-state')).toContainText('Preset preview');
    await expect(page.getByTestId('SOC-review')).toBeDisabled();
    await expect(page.getByTestId('SOC-simulate')).toBeDisabled();
    await expect(page.getByTestId('social-post-preview')).toBeVisible();
    const previewVideo = page.getByTestId('social-video');
    await expect(previewVideo).toBeVisible();

    const caption = 'E2E verified EN caption — review exact snapshot.';
    await createDraft(page, caption);
    await page.reload({ waitUntil: 'load' });
    await expect(page.getByTestId('social-stage')).toBeVisible();
    await expect(page.getByTestId('SOC-caption-input')).toHaveValue(caption);

    await reviewPost(page, { language: 'English', caption });
    await simulatePublish(page, { language: 'English', caption });

    const viewHref = await page.getByTestId('SOC-view-post').getAttribute('href');
    expect(viewHref).toMatch(new RegExp(`/campaigns/${CAMPAIGN.replace(/\./g, '\\.')}/social/social-attempt\\.`));
    await page.goto(viewHref!, { waitUntil: 'load' });
    await expect(page.getByTestId('SOC-attempt-detail')).toBeVisible();
    await expect(page.getByTestId('social-snapshot-language')).toContainText('English');
    await expect(page.getByTestId('social-snapshot-caption')).toContainText(caption);
    await expect(page.getByTestId('social-snapshot-video')).toContainText('720×960');
    await expect(page.getByTestId('SOC-detail-status')).toContainText('Simulated');
    await shot(page, 'social-post-detail-en-1440.png');
  });

  test('EN and AR keep independent saved drafts, exact confirmation copy and RTL snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);

    const en = 'EN independent draft caption for the connected flow.';
    const ar = 'مسودة عربية مستقلة لحملة سيرينيتي — نص تجريبي للمراجعة.';
    await createDraft(page, en);

    await page.getByTestId('SOC-language-ar').click();
    await expect(page.getByTestId('SOC-language-ar')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('SOC-caption-input')).toHaveAttribute('dir', 'rtl');
    await page.getByTestId('SOC-edit-post').click();
    await expect(page.getByTestId('SOC-draft-state')).toContainText('Draft revision');
    await page.getByTestId('SOC-caption-input').fill(ar);
    await page.getByTestId('SOC-hashtags-input').fill('#LavishPerfumes #SERENITY #عطور');
    await page.getByTestId('SOC-save').click();
    await expect(page.getByTestId('SOC-notice')).toContainText('Saved revision');
    await page.waitForTimeout(300);
    await expect(page.getByTestId('SOC-caption-input')).toHaveValue(ar);

    await page.reload({ waitUntil: 'load' });
    await expect(page.getByTestId('social-stage')).toBeVisible();
    // Language selection defaults back to EN on reload; saved per-language drafts survive.
    await expect(page.getByTestId('SOC-caption-input')).toHaveValue(en);
    await page.getByTestId('SOC-language-ar').click();
    await expect(page.getByTestId('SOC-language-ar')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('SOC-caption-input')).toHaveValue(ar);
    await expect(page.getByTestId('SOC-caption-input')).toHaveAttribute('dir', 'rtl');

    await reviewPost(page, { language: 'Arabic', caption: ar });
    await simulatePublish(page, { language: 'Arabic', caption: ar });
    await shot(page, 'social-published-ar-1440.png');

    await page.getByTestId('SOC-view-post').click();
    await expect(page.getByTestId('SOC-attempt-detail')).toBeVisible();
    await expect(page.getByTestId('social-snapshot-language')).toContainText('Arabic');
    await expect(page.getByTestId('social-snapshot-caption')).toContainText(ar);
    expect(await page.getByTestId('social-snapshot-caption').getAttribute('dir')).toBe('rtl');
    await shot(page, 'social-post-detail-ar-1440.png');

    await open(page);
    await page.getByTestId('SOC-language-en').click();
    await expect(page.getByTestId('SOC-caption-input')).toHaveValue(en);
  });

  test('unsaved edits cannot be reviewed or published, and leaving is protected by the guard', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    const caption = 'Saved caption before a protected unsaved edit.';
    await createDraft(page, caption);
    await reviewPost(page, { language: 'English', caption });
    await expect(page.getByTestId('SOC-simulate')).toBeEnabled();

    await page.getByTestId('SOC-caption-input').fill('UPDATED BUT NOT SAVED caption');
    await expect(page.getByTestId('SOC-dirty-note')).toBeVisible();
    await expect(page.getByTestId('SOC-save')).toBeEnabled();
    await expect(page.getByTestId('SOC-simulate')).toBeDisabled();
    await expect(page.getByTestId('SOC-review')).toBeDisabled();

    await page.getByTestId('shell-nav-opportunities').click();
    const guard = page.getByTestId('guard-dialog');
    await expect(guard).toBeVisible();
    await expect(page).toHaveURL(/\/deliverables/);
    await page.getByTestId('guard-cancel').click();
    await expect(guard).toHaveCount(0);
    await expect(page.getByTestId('SOC-caption-input')).toHaveValue('UPDATED BUT NOT SAVED caption');
    await page.getByTestId('SOC-discard').click();
    await expect(page.getByTestId('SOC-caption-input')).toHaveValue(caption);
  });

  test('double click records at most one simulated attempt; later edits create a new revision and the old post snapshot stays unchanged', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    const original = 'Snapshot caption that must remain on the published post.';
    await createDraft(page, original);
    await reviewPost(page, { language: 'English', caption: original });
    await simulatePublish(page, { language: 'English', caption: original }, true);
    await expect(page.locator('article[data-testid^="SOC-attempt-"]')).toHaveCount(1);
    const oldHref = await page.getByTestId('SOC-view-post').getAttribute('href');

    const updated = 'New revision caption after the simulated post.';
    await page.getByTestId('SOC-caption-input').fill(updated);
    await page.getByTestId('SOC-save').click();
    await expect(page.getByTestId('SOC-draft-state')).toContainText('Draft revision');
    await expect(page.locator('article[data-testid^="SOC-attempt-"]')).toHaveCount(1);

    await page.goto(oldHref!, { waitUntil: 'load' });
    await expect(page.getByTestId('SOC-attempt-detail')).toBeVisible();
    await expect(page.getByTestId('social-snapshot-caption')).toContainText(original);
    await expect(page.getByTestId('social-snapshot-caption')).not.toContainText(updated);
  });

  test('1366 and AR RTL social stage have no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await open(page);
    await page.getByTestId('SOC-language-ar').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    await expect(page.getByTestId('social-post-preview')).toBeVisible();
    await shot(page, 'social-stage-ar-1366.png');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'load' });
    await expect(page.getByTestId('social-stage')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    await shot(page, 'social-stage-ar-390.png');
  });
});
