import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

// Historical POC-008 evidence is preserved read-only. Legacy regression output
// is redirected to a disposable root: EVIDENCE_ROOT when set, otherwise
// evidence/product/ip-009/legacy. This spec must never write evidence/poc again.
const EVIDENCE_DIR = process.env.EVIDENCE_ROOT
  ? path.resolve(process.cwd(), process.env.EVIDENCE_ROOT)
  : path.resolve(process.cwd(), 'evidence', 'product', 'ip-009', 'legacy');
const screenshot = async (page: Page, name: string, fullPage = true) => {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, name), fullPage, animations: 'disabled' });
};

async function open(page: Page, url = '/'): Promise<void> {
  const response = await page.goto(url, { waitUntil: 'load' });
  expect(response?.status(), `GET ${url}`).toBe(200);
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

async function noOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe('POC-008 homepage and four-step framework', () => {
  test('homepage shows the three prepared opportunities, creative work and an honest empty download state', async ({ page }) => {
    await open(page);
    await expect(page.getByTestId('overview-page').getByRole('heading', { level: 1, name: 'From social trends to your next Lavish campaign.' })).toBeVisible();
    await expect(page.locator('[data-testid^="ov-opportunity-card-"]')).toHaveCount(3);
    await expect(page.locator('[data-testid^="ov-campaign-card-"]')).toHaveCount(3);
    await expect(page.getByTestId('ov-explore-journey')).toHaveAttribute('href', `/campaigns/scn-scent-layering.brief.main/journey?scenarioVersion=1.1.0`);
    await expect(page.locator('[data-workspace="atelier"]').first()).toHaveAttribute('href', '/atelier');
    await expect(page.getByText(/Six workspaces/i).first()).toBeVisible();
    await expect(page.getByTestId('ov-downloads-empty')).toContainText('Your downloads will appear here');
    await expect(page.getByText('SERENITY — A Story in Layers').first()).toBeVisible();
    await expect(page.getByText('A Gesture, Considered').first()).toBeVisible();
    await expect(page.getByText('Let the Scent Lead').first()).toBeVisible();
    await noOverflow(page);
    await screenshot(page, 'home-1440-en.png');
  });
  test('preview composition holds at 1440, 1366, 1920 and 390 without overflow', async ({ page }) => {
    for (const viewport of [
      { width: 1440, height: 900, name: 'preview-1440-en.png' },
      { width: 1366, height: 768, name: 'preview-1366-en.png' },
      { width: 1920, height: 1080, name: 'preview-1920-en.png' },
      { width: 390, height: 844, name: 'preview-390-en.png' },
    ] as const) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await open(page, '/poc/preview?scenarioId=scn-scent-layering&step=analysis&view=workflow');
      await expect(page.getByTestId('preview-banner')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Analysis & script' })).toBeVisible();
      await noOverflow(page);
      await screenshot(page, viewport.name);
    }
  });

  test('analysis and video layouts are present and explicitly empty', async ({ page }) => {
    await open(page, '/poc/preview?scenarioId=scn-scent-layering&step=analysis&view=workflow');
    await expect(page.getByRole('tab', { name: 'Brief' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Script' })).toBeVisible();
    await expect(page.getByText('لا يوجد محتوى معتمد بعد.')).toBeVisible();
    await screenshot(page, 'preview-analysis-1440-en.png');
    await page.getByRole('button', { name: /Script to video/ }).click();
    await expect(page.getByTestId('video-frame')).toContainText('No matching video');
    await expect(page.getByText('Awaiting content · Shot list')).toBeVisible();
    await screenshot(page, 'preview-video-1440-en.png');
  });

  test('homepage composition holds at 1366, 1920 and 390 without overflow', async ({ page }) => {
    for (const viewport of [
      { width: 1366, height: 768, name: 'home-1366-en.png' },
      { width: 1920, height: 1080, name: 'home-1920-en.png' },
      { width: 390, height: 844, name: 'home-390-en.png' },
    ] as const) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await open(page);
      await expect(page.locator('[data-testid^="ov-opportunity-card-"]')).toHaveCount(3);
      await noOverflow(page);
      await screenshot(page, viewport.name);
    }
  });
  test('layout preview is explicitly not a started scenario and exposes all four stages', async ({ page }) => {
    await open(page, '/poc/preview?scenarioId=scn-scent-layering&step=discovery&view=workflow');
    await expect(page).toHaveURL(/\/poc\/preview\?/);
    await expect(page.getByTestId('preview-banner')).toContainText('Layout preview only');
    await expect(page.getByTestId('preview-banner')).toContainText('No scenario has been started');
    await expect(page.getByTestId('mode-replay')).toBeDisabled();
    await expect(page.getByTestId('workflow-run')).toHaveCount(0);
    await expect(page.getByText('Start unavailable — awaiting content')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Discovery' })).toBeVisible();
    await expect(page.getByText('Awaiting content · Signals and trends')).toBeVisible();
    await noOverflow(page);
    await screenshot(page, 'preview-discovery-1440-en.png');
  });

  test('stepper navigation changes stage query and keeps disabled replay honest', async ({ page }) => {
    await open(page, '/poc/preview?scenarioId=scn-scent-layering&step=discovery&view=workflow');
    await page.getByRole('button', { name: /Analysis & script/ }).click();
    await expect(page).toHaveURL(/step=analysis/);
    await expect(page.getByRole('heading', { name: 'Analysis & script' })).toBeVisible();
    await expect(page.getByText('Awaiting content · Brief')).toBeVisible();
    await page.getByRole('button', { name: /Script to video/ }).click();
    await expect(page).toHaveURL(/step=video/);
    await expect(page.getByTestId('video-frame')).toContainText('No matching video');
    await page.getByRole('button', { name: /Automated delivery/ }).click();
    await expect(page).toHaveURL(/step=delivery/);
    await expect(page.getByText('Email preview awaits approved content')).toBeVisible();
    await noOverflow(page);
    await screenshot(page, 'preview-delivery-1440-en.png');
  });

  test('preview evidence drawer opens, traps focus, closes on Escape and returns focus', async ({ page }) => {
    await open(page, '/poc/preview?scenarioId=scn-scent-layering&step=discovery&view=workflow');
    const trigger = page.getByRole('button', { name: 'Preview evidence drawer' });
    await trigger.click();
    const drawer = page.getByTestId('preview-evidence-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText('No evidence available');
    await expect(page.getByTestId('preview-evidence-drawer-close')).toBeFocused();
    for (let index = 0; index < 8; index += 1) await page.keyboard.press('Tab');
    expect(await page.evaluate(() => Boolean(document.querySelector('[data-testid="preview-evidence-drawer"]')?.contains(document.activeElement)))).toBe(true);
    await screenshot(page, 'preview-evidence-drawer-1440.png', false);
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('unknown session is an explicit error, not a fake empty workflow', async ({ page }) => {
    await open(page, '/poc/does-not-exist?step=discovery&view=workflow');
    await expect(page.getByText('Demo session unavailable')).toBeVisible();
    await expect(page.getByText(/SESSION_NOT_FOUND/)).toBeVisible();
    await expect(page.getByTestId('workflow-frame')).toHaveCount(0);
  });

  test('preview is usable at 390 without document overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, '/poc/preview?scenarioId=scn-scent-layering&step=delivery&view=workflow');
    await expect(page.getByTestId('preview-banner')).toBeVisible();
    await noOverflow(page);
    await screenshot(page, 'preview-delivery-390-en.png');
  });

  test('homepage and preview make no external requests and preserve the Mock marker', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.protocol.startsWith('http') && !['127.0.0.1', 'localhost'].includes(url.hostname)) external.push(request.url());
    });
    await open(page);
    await expect(page.getByTestId('shell-demo-badge')).toContainText('Demo · Mock data');
    await expect(page.getByText('Six workspaces').first()).toBeVisible();
    await open(page, '/poc/preview?scenarioId=scn-scent-layering&step=discovery&view=workflow');
    await expect(page.getByText('Mock / Demo').first()).toBeVisible();
    expect(external).toEqual([]);
  });});
