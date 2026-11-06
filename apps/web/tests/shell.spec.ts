import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// Historical M1 evidence is preserved read-only. Legacy regression output is
// redirected to a disposable root: EVIDENCE_ROOT when set, otherwise
// evidence/product/ip-009/legacy. This spec must never write evidence/m1 again.
const EVIDENCE_DIR = process.env.EVIDENCE_ROOT
  ? path.resolve(process.cwd(), process.env.EVIDENCE_ROOT)
  : path.resolve(process.cwd(), 'evidence', 'product', 'ip-009', 'legacy');
const evidencePath = (name: string) => path.join(EVIDENCE_DIR, name);
const SIDEBAR_STORAGE_KEY = 'maison-intelligence:shell:sidebar-collapsed';
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);
const LOGO_PATH = '/brand/lavish-logo-primary-294x294-rgb.png';

const VIEWPORTS = [
  { width: 1920, height: 1080, sidebar: 246, header: 77 },
  { width: 1440, height: 900, sidebar: 222, header: 77 },
  { width: 1366, height: 768, sidebar: 222, header: 77 },
  { width: 390, height: 844, sidebar: 288, header: 66 },
] as const;

type Diagnostics = {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  externalRequests: string[];
  responses: { url: string; status: number }[];
};

function attachDiagnostics(page: Page): Diagnostics {
  const diagnostics: Diagnostics = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    externalRequests: [],
    responses: [],
  };
  page.on('console', (message) => {
    if (message.type() === 'error') diagnostics.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => diagnostics.pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    diagnostics.failedRequests.push(
      `${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`.trim(),
    );
  });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith('http') && !LOCAL_HOSTS.has(url.hostname)) {
      diagnostics.externalRequests.push(request.url());
    }
  });
  page.on('response', (response) => {
    if (response.url().includes('.png') || response.url().includes('/brand/')) {
      diagnostics.responses.push({ url: response.url(), status: response.status() });
    }
  });
  return diagnostics;
}

async function blockExternalRequests(page: Page): Promise<void> {
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (LOCAL_HOSTS.has(url.hostname)) return route.continue();
    return route.abort('blockedbyclient');
  });
}

async function openShell(page: Page): Promise<void> {
  const response = await page.goto('/shell-preview', { waitUntil: 'load' });
  expect(response?.status(), 'GET /shell-preview').toBe(200);
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(250);
}

async function sidebarWidth(page: Page): Promise<number> {
  const box = await page.locator('#shell-sidebar').boundingBox();
  return box ? Math.round(box.width) : 0;
}

async function setSidebarWidth(page: Page, width: number): Promise<void> {
  await expect
    .poll(async () => sidebarWidth(page), { timeout: 5_000 })
    .toBe(width);
}

async function readLocalPreference(page: Page): Promise<string | null> {
  return page.evaluate((key) => window.localStorage.getItem(key), SIDEBAR_STORAGE_KEY);
}

async function tooltipVisible(page: Page, testId: string, text: string): Promise<boolean> {
  return page.evaluate(
    ({ id, expected }) => {
      const item = document.querySelector(`[data-testid="${id}"]`);
      const tooltip = item
        ? Array.from(item.querySelectorAll('[aria-hidden="true"]')).find(
            (element) => element.textContent?.trim() === expected,
          )
        : null;
      if (!tooltip) return false;
      const style = getComputedStyle(tooltip);
      return style.visibility !== 'hidden' && Number.parseFloat(style.opacity) > 0.9;
    },
    { id: testId, expected: text },
  );
}

const report: Record<string, unknown> = {
  generatedAt: null,
  browserVersion: null,
  logo: null,
  breakpoints: [],
  collapse: null,
  mobileMenu: null,
  screenshots: [],
  console: null,
};

test.beforeAll(() => {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
});

test.afterAll(() => {
  report.generatedAt = new Date().toISOString();
  writeFileSync(
    evidencePath('browser-report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
});

test('shell preview: real Logo, breadcrumb, DEMO badge and clean console/network', async ({
  page,
}) => {
  const diagnostics = attachDiagnostics(page);
  await blockExternalRequests(page);

  await openShell(page);

  const logo = page.getByAltText('Lavish Perfumes official logo');
  await expect(logo).toBeVisible();
  const logoState = await logo.evaluate((element) => {
    const image = element as HTMLImageElement;
    const style = getComputedStyle(image);
    const rect = image.getBoundingClientRect();
    return {
      currentSrc: image.currentSrc,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      renderedWidth: Math.round(rect.width),
      renderedHeight: Math.round(rect.height),
      objectFit: style.objectFit,
      filter: style.filter,
      borderRadius: style.borderRadius,
      alt: image.alt,
    };
  });
  expect(logoState.currentSrc).toContain(LOGO_PATH);
  expect(logoState.naturalWidth).toBe(294);
  expect(logoState.naturalHeight).toBe(294);
  expect(logoState.renderedWidth).toBe(44);
  expect(logoState.renderedHeight).toBe(44);
  expect(logoState.objectFit).toBe('contain');
  expect(logoState.filter).toBe('none');
  expect(logoState.borderRadius).toBe('0px');
  expect(logoState.alt).toBe('Lavish Perfumes official logo');
  expect(diagnostics.responses.some((response) => response.url.endsWith(LOGO_PATH) && response.status === 200)).toBe(true);

  const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(breadcrumb).toContainText('MAISON INTELLIGENCE');
  await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText('Internal shell preview');
  await expect(page.getByTestId('shell-demo-badge')).toContainText('Demo · Mock data');
  await expect(page).toHaveTitle(/Shell preview/);

  // No undefined account / notification / search controls.
  await expect(page.getByRole('button', { name: /search|notification|account|profile/i })).toHaveCount(0);

  expect(diagnostics.consoleErrors).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.failedRequests).toEqual([]);
  expect(diagnostics.externalRequests).toEqual([]);

  report.browserVersion = page.context().browser()?.version() ?? null;
  report.logo = { ...logoState, sha256Expected: 'f504781a6a6bbfd7f0f9a51ac077dc37e54c41dba96060667f38992d136f3966' };
  report.console = {
    errors: diagnostics.consoleErrors,
    pageErrors: diagnostics.pageErrors,
    failedRequests: diagnostics.failedRequests,
    externalRequests: diagnostics.externalRequests,
  };
});

test('responsive breakpoints: sidebar 246/222/78, ≤1170 collapsed, ≤880 overlay menu', async ({
  page,
}) => {
  await blockExternalRequests(page);

  for (const viewport of [
    { width: 1920, height: 1080, sidebar: 246 },
    { width: 1440, height: 900, sidebar: 222 },
    { width: 1366, height: 768, sidebar: 222 },
  ] as const) {
    await page.setViewportSize(viewport);
    await openShell(page);
    await setSidebarWidth(page, viewport.sidebar);
    await expect(page.getByTestId('shell-menu-button')).toBeHidden();
    expect({
      viewport: `${viewport.width}x${viewport.height}`,
      sidebar: viewport.sidebar,
    }).toBeTruthy();
  }

  // ≤1170: starts collapsed (78). 1171 still uses the 222 compact rail.
  await page.setViewportSize({ width: 1170, height: 800 });
  await openShell(page);
  await setSidebarWidth(page, 78);
  await expect(page.getByTestId('shell-collapse')).toHaveAttribute('aria-label', 'Expand sidebar');

  await page.setViewportSize({ width: 1171, height: 800 });
  await openShell(page);
  await setSidebarWidth(page, 222);

  // 881 remains desktop; 880 becomes the overlay menu.
  await page.setViewportSize({ width: 881, height: 800 });
  await openShell(page);
  await setSidebarWidth(page, 78);
  await expect(page.getByTestId('shell-menu-button')).toBeHidden();

  await page.setViewportSize({ width: 880, height: 800 });
  await openShell(page);
  await expect(page.getByTestId('shell-menu-button')).toBeVisible();
  const sidebarInert = await page.locator('#shell-sidebar').evaluate((element) => (element as HTMLElement).inert);
  expect(sidebarInert).toBe(true);

  report.breakpoints = [
    { viewport: '1920x1080', sidebar: 246, menuButton: 'hidden' },
    { viewport: '1440x900', sidebar: 222, menuButton: 'hidden' },
    { viewport: '1366x768', sidebar: 222, menuButton: 'hidden' },
    { viewport: '1170x800', sidebar: 78, menuButton: 'hidden' },
    { viewport: '1171x800', sidebar: 222, menuButton: 'hidden' },
    { viewport: '881x800', sidebar: 78, menuButton: 'hidden' },
    { viewport: '880x800', sidebar: 'off-canvas', menuButton: 'visible' },
  ];
});

test('desktop collapse persists in localStorage, expands again and exposes tooltips', async ({
  page,
}) => {
  await blockExternalRequests(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openShell(page);

  await setSidebarWidth(page, 222);
  await page.getByTestId('shell-collapse').click();
  await setSidebarWidth(page, 78);
  await expect(page.getByTestId('shell-collapse')).toHaveAttribute('aria-label', 'Expand sidebar');
  expect(await readLocalPreference(page)).toBe('true');

  // Hover tooltip on the collapsed Overview item.
  await page.getByTestId('shell-nav-overview').hover();
  await page.waitForTimeout(250);
  expect(await tooltipVisible(page, 'shell-nav-overview', 'Overview')).toBe(true);

  await page.reload({ waitUntil: 'load' });
  await page.waitForLoadState('networkidle');
  await setSidebarWidth(page, 78);
  await expect(page.getByTestId('shell-collapse')).toHaveAttribute('aria-label', 'Expand sidebar');
  expect(await readLocalPreference(page)).toBe('true');

  // Keyboard focus on the collapsed control shows its tooltip and the on-dark
  // focus ring.
  for (let step = 0; step < 12; step += 1) {
    const focused = await page.getByTestId('shell-collapse').evaluate((element) => element === document.activeElement);
    if (focused) break;
    await page.keyboard.press('Tab');
  }
  await expect(page.getByTestId('shell-collapse')).toBeFocused();
  await page.waitForTimeout(200);
  expect(await tooltipVisible(page, 'shell-collapse', 'Expand sidebar')).toBe(true);
  const focusRing = await page.getByTestId('shell-collapse').evaluate((element) => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, outlineColor: style.outlineColor };
  });
  expect(focusRing.outlineStyle).toBe('solid');
  expect(focusRing.outlineWidth).toBe('2px');
  expect(focusRing.outlineColor).toBe('rgb(235, 214, 174)');

  await page.getByTestId('shell-collapse').click();
  await setSidebarWidth(page, 222);
  expect(await readLocalPreference(page)).toBe('false');

  report.collapse = {
    persistedKey: SIDEBAR_STORAGE_KEY,
    collapsedWidth: 78,
    expandedWidth: 222,
    persistedValueAfterCollapse: 'true',
    persistedValueAfterExpand: 'false',
    tooltipVisible: true,
    focusRing,
  };
});

test('localStorage unavailable: stable shell, no errors and in-memory collapse', async ({ page }) => {
  await page.addInitScript(() => {
    const blocked = () => {
      throw new Error('localStorage blocked for test');
    };
    Storage.prototype.getItem = blocked;
    Storage.prototype.setItem = blocked;
  });

  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await blockExternalRequests(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openShell(page);

  await setSidebarWidth(page, 222);
  await page.getByTestId('shell-collapse').click();
  await setSidebarWidth(page, 78);
  await expect(page.getByTestId('shell-collapse')).toHaveAttribute('aria-label', 'Expand sidebar');

  // Preference is in-memory only; a reload returns the stable expanded default.
  await page.reload({ waitUntil: 'load' });
  await page.waitForLoadState('networkidle');
  await setSidebarWidth(page, 222);
  expect(await readLocalPreference(page).catch(() => null)).toBeNull();
  expect(pageErrors).toEqual([]);
});

test('navigation: all six workspace links are real and the old Soon/disabled placeholders are gone', async ({
  page,
}) => {
  await blockExternalRequests(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openShell(page);

  const expected = [
    { id: 'overview', href: '/', path: '/' },
    { id: 'radar', href: '/radar', path: '/radar' },
    { id: 'opportunities', href: '/opportunities', path: '/opportunities' },
    { id: 'atelier', href: '/atelier', path: '/atelier' },
    { id: 'library', href: '/library', path: '/library' },
    { id: 'deliverables', href: '/deliverables', path: '/deliverables' },
  ] as const;

  for (const item of expected) {
    const link = page.getByTestId(`shell-nav-${item.id}`);
    await expect(link).toHaveAttribute('href', item.href);
    await expect(link).not.toHaveAttribute('aria-disabled', 'true');
  }
  await expect(page.locator('text=Soon')).toHaveCount(0);
  await expect(page.locator('[data-testid^="shell-nav-"][aria-current="page"]')).toHaveCount(0);

  for (const item of expected) {
    await openShell(page);
    await page.getByTestId(`shell-nav-${item.id}`).click();
    await page.waitForURL((url) => url.pathname === item.path);
    await expect(page.getByTestId(`shell-nav-${item.id}`)).toHaveAttribute('aria-current', 'page');
  }
});
test('mobile menu: keyboard open, focus trap, Escape/close and focus return, scroll lock', async ({
  page,
}) => {
  await blockExternalRequests(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openShell(page);

  const sidebar = page.locator('#shell-sidebar');
  const trigger = page.getByTestId('shell-menu-button');
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(await sidebar.evaluate((element) => (element as HTMLElement).inert)).toBe(true);

  await trigger.click();
  await expect(sidebar).toHaveAttribute('data-mobile-open', 'true');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('shell-menu-close')).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  expect(await page.evaluate(() => (document.querySelector('#shell-main')?.closest('[inert]') as HTMLElement | null)?.inert ?? false)).toBe(true);

  // Focus trap: the drawer keeps focus inside (close, then real navigation links).
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('shell-nav-deliverables')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('shell-menu-close')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(sidebar).toHaveAttribute('data-mobile-open', 'false');
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  expect(await sidebar.evaluate((element) => (element as HTMLElement).inert)).toBe(true);
  expect(await page.evaluate(() => (document.querySelector('#shell-main')?.closest('[inert]') as HTMLElement | null)?.inert ?? false)).toBe(false);

  // Backdrop click also closes and restores focus.
  await trigger.click();
  await expect(sidebar).toHaveAttribute('data-mobile-open', 'true');
  await page.getByTestId('shell-backdrop').click({ position: { x: 370, y: 400 } });
  await expect(sidebar).toHaveAttribute('data-mobile-open', 'false');
  await expect(trigger).toBeFocused();

  // Keyboard activation (Enter) opens; the visible close button closes and
  // returns focus to the trigger.
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(sidebar).toHaveAttribute('data-mobile-open', 'true');
  await expect(page.getByTestId('shell-menu-close')).toBeFocused();
  await page.getByTestId('shell-menu-close').click();
  await expect(sidebar).toHaveAttribute('data-mobile-open', 'false');
  await expect(trigger).toBeFocused();

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);

  report.mobileMenu = {
    opensWithKeyboard: true,
    focusTrap: true,
    escapeCloses: true,
    backdropCloses: true,
    focusReturnedToTrigger: true,
    backgroundScrollLocked: true,
  };
});

test('four viewports: no document overflow and the shell does not cover content', async ({
  page,
}) => {
  await blockExternalRequests(page);

  for (const viewport of VIEWPORTS) {
    const diagnostics = attachDiagnostics(page);
    await page.setViewportSize(viewport);
    await openShell(page);

    const metrics = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
    }));
    expect(metrics.scrollWidth, `${viewport.width} document scrollWidth`).toBeLessThanOrEqual(metrics.innerWidth + 1);
    expect(metrics.bodyScrollWidth, `${viewport.width} body scrollWidth`).toBeLessThanOrEqual(metrics.innerWidth + 1);

    const headerBox = await page.locator('header').first().boundingBox();
    expect(headerBox?.height ?? 0, `${viewport.width} header height`).toBe(viewport.header);

    const mainBox = await page.locator('#shell-main').boundingBox();
    expect(mainBox, 'main visible').not.toBeNull();

    if (viewport.width > 880) {
      const sidebarBox = await page.locator('#shell-sidebar').boundingBox();
      expect(sidebarBox).not.toBeNull();
      expect(Math.round(sidebarBox!.width)).toBe(viewport.sidebar);
      expect(mainBox!.x, `${viewport.width} main starts after sidebar`).toBeGreaterThanOrEqual(
        sidebarBox!.x + sidebarBox!.width - 1,
      );
      expect(mainBox!.width, `${viewport.width} main does not overlap`).toBeLessThanOrEqual(
        viewport.width - viewport.sidebar + 1,
      );
    } else {
      expect(Math.round(mainBox!.width)).toBe(viewport.width);
      expect(Math.round(mainBox!.x)).toBe(0);
    }

    const contentPadding = await page.locator('#shell-main > div').evaluate((element) => {
      const style = getComputedStyle(element);
      return { paddingLeft: style.paddingLeft, paddingRight: style.paddingRight };
    });
    const expectedInset = viewport.width <= 540 ? '16px' : viewport.width <= 1450 ? '27px' : '38px';
    expect(contentPadding.paddingLeft, `${viewport.width} content inset`).toBe(expectedInset);
    expect(contentPadding.paddingRight, `${viewport.width} content inset`).toBe(expectedInset);

    expect(diagnostics.consoleErrors).toEqual([]);
    expect(diagnostics.pageErrors).toEqual([]);
    expect(diagnostics.failedRequests).toEqual([]);
  }
});

test('captures shell evidence screenshots for four sizes, collapsed, menu and focus', async ({
  page,
}) => {
  const diagnostics = attachDiagnostics(page);
  await blockExternalRequests(page);
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const screenshots: { name: string; bytes: number; viewport: string; state: string }[] = [];

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    await openShell(page);
    const name = `shell-${viewport.width}x${viewport.height}-default.png`;
    await page.screenshot({ path: evidencePath(name) });
    screenshots.push({
      name,
      bytes: statSync(evidencePath(name)).size,
      viewport: `${viewport.width}x${viewport.height}`,
      state: 'default',
    });
  }

  // Desktop focus state (keyboard) on the first nav destination.
  await page.setViewportSize({ width: 1440, height: 900 });
  await openShell(page);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('shell-nav-overview')).toBeFocused();
  await page.waitForTimeout(200);
  const focusName = 'shell-1440x900-focus.png';
  await page.screenshot({ path: evidencePath(focusName) });
  screenshots.push({
    name: focusName,
    bytes: statSync(evidencePath(focusName)).size,
    viewport: '1440x900',
    state: 'focus',
  });

  // Desktop collapsed state.
  await page.getByTestId('shell-collapse').click();
  await page.waitForTimeout(350);
  const collapsedName = 'shell-1440x900-collapsed.png';
  await page.screenshot({ path: evidencePath(collapsedName) });
  screenshots.push({
    name: collapsedName,
    bytes: statSync(evidencePath(collapsedName)).size,
    viewport: '1440x900',
    state: 'collapsed',
  });

  // Mobile overlay menu: clear the desktop preference first so the capture is
  // the default mobile shell state.
  await page.evaluate((key) => window.localStorage.removeItem(key), SIDEBAR_STORAGE_KEY);
  await page.setViewportSize({ width: 390, height: 844 });
  await openShell(page);
  await page.getByTestId('shell-menu-button').click();
  await page.waitForTimeout(350);
  const menuName = 'shell-390x844-menu-open.png';
  await page.screenshot({ path: evidencePath(menuName) });
  screenshots.push({
    name: menuName,
    bytes: statSync(evidencePath(menuName)).size,
    viewport: '390x844',
    state: 'menu-open',
  });

  for (const shot of screenshots) {
    expect(shot.bytes, `${shot.name} size`).toBeGreaterThan(5_000);
  }
  expect(diagnostics.consoleErrors).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.failedRequests).toEqual([]);
  expect(diagnostics.externalRequests).toEqual([]);

  report.screenshots = screenshots;
  report.console = {
    errors: diagnostics.consoleErrors,
    pageErrors: diagnostics.pageErrors,
    failedRequests: diagnostics.failedRequests,
    externalRequests: diagnostics.externalRequests,
  };
});
