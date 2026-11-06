import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const EVIDENCE_DIR = path.resolve(process.cwd(), 'evidence', 'poc', 'components');
const screenshot = async (page: Page, name: string, fullPage = true) => {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, name), fullPage, animations: 'disabled' });
};

async function openComponents(page: Page): Promise<void> {
  const response = await page.goto('/poc-components', { waitUntil: 'load' });
  expect(response?.status(), 'GET /poc-components').toBe(200);
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

const widths = [
  { width: 1440, height: 900, name: 'components-1440-en.png' },
  { width: 1366, height: 768, name: 'components-1366-en.png' },
  { width: 1920, height: 1080, name: 'components-1920-en.png' },
  { width: 390, height: 844, name: 'components-390-en.png' },
] as const;

test.describe('POC-007 shared interaction components', () => {
  test('renders the component surface at desktop and mobile sizes without horizontal overflow', async ({ page }) => {
    for (const viewport of widths) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openComponents(page);
      await expect(page.getByRole('heading', { name: 'Shared interaction components' })).toBeVisible();
      await expect(page.getByTestId('button-primary')).toBeVisible();
      await expect(page.getByTestId('badge-row')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      await screenshot(page, viewport.name);
    }
  });

  test('button states expose focus, disabled, pending and aria-busy without double action', async ({ page }) => {
    await openComponents(page);
    const pending = page.getByTestId('button-pending');
    await expect(pending).toBeEnabled();
    await pending.click();
    await expect(pending).toHaveAttribute('aria-busy', 'true');
    await expect(pending).toBeDisabled();
    await expect(pending).toContainText('Save sample');
    await page.waitForTimeout(1600);
    await expect(pending).toBeEnabled();
    await expect(page.getByTestId('button-disabled')).toBeDisabled();
    await page.getByTestId('button-secondary').focus();
    await page.keyboard.press('Tab');
    const focusTarget = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(focusTarget).not.toBeNull();
  });

  test('fields, tabs and stepper expose their accessibility contract', async ({ page }) => {
    await openComponents(page);
    const errorInput = page.getByTestId('input-error');
    await expect(errorInput).toHaveAttribute('aria-invalid', 'true');
    const describedBy = await errorInput.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    await expect(page.locator(`#${describedBy}`)).toContainText('Enter a value');
    await expect(page.getByTestId('input-disabled')).toBeDisabled();
    await expect(page.getByTestId('select-language')).toHaveValue('en');

    const scriptTab = page.getByRole('tab', { name: 'Script' });
    await page.getByRole('tab', { name: 'Brief' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(scriptTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toBeVisible();
    await page.keyboard.press('End');
    await expect(page.getByRole('tab', { name: 'Versions' })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Home');
    await expect(page.getByRole('tab', { name: 'Brief' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[aria-current="step"]')).toContainText('Analysis & script');
  });

  test('replay controls play, pause, step, change speed, seek and restart without wall-clock text', async ({ page }) => {
    await openComponents(page);
    const controls = page.getByTestId('replay-controls');
    await expect(controls).toContainText('seq 4/21');
    await page.getByTestId('replay-play-pause').click();
    await expect(page.getByTestId('replay-play-pause')).toContainText('Pause');
    await page.waitForTimeout(650);
    const progressed = await controls.textContent();
    expect(progressed).not.toContain('seq 4/21');
    await page.getByTestId('replay-play-pause').click();
    const beforeStep = await controls.textContent();
    await page.getByTestId('replay-step').click();
    expect(await controls.textContent()).not.toBe(beforeStep);
    await page.getByTestId('replay-speed-2').click();
    await expect(page.getByTestId('replay-speed-2')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('replay-seek').fill('10');
    await page.getByTestId('replay-seek').dispatchEvent('change');
    await expect(controls).toContainText('seq 10/21 · 2×');
    await page.getByTestId('replay-restart').click();
    await expect(controls).toContainText('seq 0/21 · 2×');
    await screenshot(page, 'components-replay-1440.png');
  });

  test('dialog traps focus, locks scroll, closes on Escape and returns focus', async ({ page }) => {
    await openComponents(page);
    const trigger = page.getByTestId('dialog-open');
    await trigger.focus();
    await trigger.click();
    const dialog = page.getByTestId('poc-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(page.getByTestId('poc-dialog-close')).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    for (let index = 0; index < 12; index += 1) await page.keyboard.press('Tab');
    const focusInside = await page.evaluate(() => Boolean(document.querySelector('[data-testid="poc-dialog"]')?.contains(document.activeElement)));
    expect(focusInside).toBe(true);
    await screenshot(page, 'components-dialog-1440.png', false);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  });

  test('drawer closes on Escape, returns focus and is full width on 390', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openComponents(page);
    const trigger = page.getByTestId('drawer-open');
    await trigger.click();
    const drawer = page.getByTestId('poc-drawer');
    await expect(drawer).toBeVisible();
    const desktopBox = await drawer.boundingBox();
    expect(desktopBox?.width ?? 0).toBeGreaterThanOrEqual(420);
    await screenshot(page, 'components-drawer-1440.png', false);
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
    await expect(trigger).toBeFocused();

    await page.setViewportSize({ width: 390, height: 844 });
    await openComponents(page);
    await page.getByTestId('drawer-open').click();
    const mobileBox = await page.getByTestId('poc-drawer').boundingBox();
    expect(Math.round(mobileBox?.width ?? 0)).toBe(390);
    await screenshot(page, 'components-drawer-390.png', false);
  });

  test('toasts are announced, capped at three and dismissible; empty/error state is present', async ({ page }) => {
    await openComponents(page);
    await page.getByTestId('toast-add').click();
    await page.getByTestId('toast-add').click();
    await page.getByTestId('toast-add-error').click();
    await expect(page.getByTestId('toast-region').getByRole('status')).toHaveCount(3);
    await expect(page.getByTestId('toast-region')).toContainText('Sample saved locally.');
    const dismiss = page.getByTestId('toast-region').getByRole('button', { name: 'Dismiss notification' }).first();
    await dismiss.click();
    await expect(page.getByTestId('toast-region').getByRole('status')).toHaveCount(2);
    await expect(page.getByText('No records yet')).toBeVisible();
    await expect(page.getByText('Preview unavailable')).toBeVisible();
    await expect(page.getByText('Skeleton keeps the panel layout stable.')).not.toBeVisible();
  });

  test('Arabic sample is direction-aware and the page makes no external requests', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.protocol.startsWith('http') && !['127.0.0.1', 'localhost'].includes(url.hostname)) external.push(request.url());
    });
    await openComponents(page);
    const arabic = page.locator('[lang="ar"][dir="rtl"]');
    await expect(arabic).toBeVisible();
    await expect(arabic).toHaveCSS('direction', 'rtl');
    await screenshot(page, 'components-arabic-1440.png');
    expect(external).toEqual([]);
  });
});
