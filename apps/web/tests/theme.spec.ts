import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const EVIDENCE_DIR = path.resolve(process.cwd(), 'evidence', 'm1', 'theme');
const evidencePath = (name: string) => path.join(EVIDENCE_DIR, name);

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 390, height: 844 },
] as const;

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

type Diagnostics = {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  externalRequests: string[];
  fontResponses: { url: string; status: number }[];
};

type FontState = {
  loadedFamilies: { family: string; weight: string }[];
  interBodyCheck: boolean;
  interTitleCheck: boolean;
  notoArabicCheck: boolean;
  bodyFontFamily: string;
  arabicFontFamily: string;
  arabicLetterSpacing: string;
  arabicFontSize: string;
  arabicLineHeightRatio: number;
};

type OverflowResult = {
  viewport: string;
  lang: 'en' | 'ar';
  innerWidth: number;
  scrollWidth: number;
  bodyScrollWidth: number;
  offenders: { tag: string; className: string; right: number; width: number }[];
};

const report: {
  generatedAt: string | null;
  browserVersion: string | null;
  fonts: FontState | null;
  console: { errors: string[]; pageErrors: string[]; failedRequests: string[] };
  externalRequests: string[];
  fontResponses: { url: string; status: number }[];
  overflow: OverflowResult[];
  reducedMotion: Record<string, unknown>;
  typographyRendering: Record<string, unknown> | null;
  screenshots: { path: string; viewport: string; lang: string; state: string; bytes: number }[];
} = {
  generatedAt: null,
  browserVersion: null,
  fonts: null,
  console: { errors: [], pageErrors: [], failedRequests: [] },
  externalRequests: [],
  fontResponses: [],
  overflow: [],
  reducedMotion: {},
  typographyRendering: null,
  screenshots: [],
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

async function attachDiagnostics(page: Page): Promise<Diagnostics> {
  const diagnostics: Diagnostics = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    externalRequests: [],
    fontResponses: [],
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
    if (response.url().includes('.woff2')) {
      diagnostics.fontResponses.push({ url: response.url(), status: response.status() });
    }
  });

  return diagnostics;
}

/** Refuse every non-local request, proving the page does not need a CDN. */
async function blockExternalRequests(page: Page): Promise<void> {
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (LOCAL_HOSTS.has(url.hostname)) {
      return route.continue();
    }
    return route.abort('blockedbyclient');
  });
}

type ComputedTextStyle = {
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
  fontFamily: string;
  direction: string;
};

async function readTextStyle(locator: Locator): Promise<ComputedTextStyle> {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      fontFamily: style.fontFamily,
      direction: style.direction,
    };
  });
}

async function waitForFonts(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    // Explicitly await the faces used by the AR sample + latin subsets so
    // screenshots never race a late font request (AR rendering determinism).
    await Promise.all([
      document.fonts.load('400 16px Inter'),
      document.fonts.load('630 29px Inter'),
      document.fonts.load('400 16px "Noto Sans Arabic"', 'مرحبا SKU 6290360532790'),
    ]);
    await document.fonts.ready;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  });
}

async function openDesignLab(page: Page): Promise<void> {
  const response = await page.goto('/design-lab', { waitUntil: 'load' });
  expect(response?.status(), 'GET /design-lab status').toBe(200);
  await page.waitForLoadState('networkidle');
  await waitForFonts(page);
}

async function readFontState(page: Page): Promise<FontState> {
  return page.evaluate(async () => {
    await document.fonts.ready;
    const arabicSample = document.querySelector('[data-testid="arabic-sample"]') as HTMLElement;
    const arabicStyle = getComputedStyle(arabicSample);
    const fontSize = Number.parseFloat(arabicStyle.fontSize);
    const lineHeight = Number.parseFloat(arabicStyle.lineHeight);
    return {
      loadedFamilies: Array.from(document.fonts)
        .filter((face) => face.status === 'loaded')
        .map((face) => ({ family: face.family.replace(/["']/g, ''), weight: face.weight })),
      interBodyCheck: document.fonts.check('400 16px Inter'),
      interTitleCheck: document.fonts.check('630 29px Inter'),
      notoArabicCheck: document.fonts.check('400 16px "Noto Sans Arabic"', 'مرحبا'),
      bodyFontFamily: getComputedStyle(document.body).fontFamily,
      arabicFontFamily: arabicStyle.fontFamily,
      arabicLetterSpacing: arabicStyle.letterSpacing,
      arabicFontSize: arabicStyle.fontSize,
      arabicLineHeightRatio: fontSize > 0 ? Math.round((lineHeight / fontSize) * 100) / 100 : 0,
    };
  });
}

async function measureOverflow(page: Page, lang: 'en' | 'ar'): Promise<OverflowResult> {
  return page.evaluate(
    ({ currentLang }) => {
      const offenders: { tag: string; className: string; right: number; width: number }[] = [];
      document.querySelectorAll<HTMLElement>('body *').forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.right > window.innerWidth + 2) {
          offenders.push({
            tag: element.tagName.toLowerCase(),
            className: typeof element.className === 'string' ? element.className : '',
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          });
        }
      });
      return {
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        lang: currentLang,
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        offenders: offenders.slice(0, 8),
      };
    },
    { currentLang: lang },
  );
}

test('loads /design-lab with self-hosted fonts and no console or network errors', async ({
  page,
}) => {
  const diagnostics = await attachDiagnostics(page);
  await blockExternalRequests(page);

  await openDesignLab(page);

  const fonts = await readFontState(page);
  report.fonts = fonts;
  report.console.errors = diagnostics.consoleErrors;
  report.console.pageErrors = diagnostics.pageErrors;
  report.console.failedRequests = diagnostics.failedRequests;
  report.externalRequests = diagnostics.externalRequests;
  report.fontResponses = diagnostics.fontResponses;
  report.browserVersion = page.context().browser()?.version() ?? null;

  expect(fonts.loadedFamilies.some((face) => face.family === 'Inter')).toBe(true);
  expect(fonts.loadedFamilies.some((face) => face.family === 'Noto Sans Arabic')).toBe(true);
  expect(fonts.interBodyCheck, 'Inter body face loaded').toBe(true);
  expect(fonts.interTitleCheck, 'Inter title weight loaded').toBe(true);
  expect(fonts.notoArabicCheck, 'Noto Sans Arabic arabic subset loaded').toBe(true);
  expect(fonts.bodyFontFamily).toContain('Inter');
  expect(fonts.arabicFontFamily).toContain('Noto Sans Arabic');
  expect(fonts.arabicLetterSpacing).toMatch(/^(normal|0px)$/);
  expect(fonts.arabicFontSize).toBe('16px');
  expect(fonts.arabicLineHeightRatio).toBeGreaterThan(1.72);
  expect(fonts.arabicLineHeightRatio).toBeLessThan(1.88);

  expect(diagnostics.consoleErrors, 'console errors').toEqual([]);
  expect(diagnostics.pageErrors, 'uncaught page errors').toEqual([]);
  expect(diagnostics.externalRequests, 'external requests').toEqual([]);
  expect(diagnostics.failedRequests, 'failed requests').toEqual([]);

  expect(diagnostics.fontResponses.length).toBeGreaterThanOrEqual(2);
  for (const font of diagnostics.fontResponses) {
    expect(font.status, `font status for ${font.url}`).toBe(200);
    expect(font.url).toContain('/fonts/');
  }
});

test('EN / AR switch changes language, direction, copy and font', async ({ page }) => {
  await blockExternalRequests(page);
  await openDesignLab(page);

  const lab = page.getByTestId('design-lab');
  await expect(lab).toHaveAttribute('lang', 'en');
  await expect(lab).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Design foundation');
  await expect(page.getByTestId('lang-en')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('lang-ar').click();

  await expect(lab).toHaveAttribute('lang', 'ar');
  await expect(lab).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('أساس التصميم');
  await expect(page.getByTestId('lang-ar')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('lang-en')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('سيناريو توضيحي', { exact: false }).first()).toBeVisible();

  // SKU / product names keep their official Latin order inside RTL text.
  const sku = page.locator('bdi', { hasText: '6290360532790' }).first();
  await expect(sku).toHaveText('SKU 6290360532790');
  await expect(page.getByText('LAVISH OUD', { exact: true }).first()).toBeVisible();

  const arabicStyle = await page.evaluate(() => {
    const element = document.querySelector('main[lang="ar"] bdi');
    const style = element ? getComputedStyle(element) : null;
    return {
      hasBdi: Boolean(element),
      bidi: style ? style.unicodeBidi : null,
    };
  });
  expect(arabicStyle.hasBdi).toBe(true);

  await page.getByTestId('lang-en').click();
  await expect(lab).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Design foundation');
});

test('AR page typography: real Arabic content has zero tracking and 1.8 body leading; EN keeps its rules', async ({
  page,
}) => {
  await blockExternalRequests(page);
  await openDesignLab(page);

  await page.getByTestId('lang-ar').click();
  await waitForFonts(page);
  await page.waitForTimeout(150);

  const arH1 = await readTextStyle(page.getByRole('heading', { level: 1 }));
  const arSectionTitle = await readTextStyle(page.locator('#typography-title'));
  const arSample0 = await readTextStyle(page.getByTestId('type-sample-0'));
  const arSample2 = await readTextStyle(page.getByTestId('type-sample-2'));
  const arSample5 = await readTextStyle(page.getByTestId('type-sample-5'));
  const arContentBody = await readTextStyle(
    page.locator('p').filter({ hasText: 'سيناريو توضيحي: دمج' }),
  );
  const arLead = await readTextStyle(
    page.locator('p').filter({ hasText: 'صفحة داخلية لمراجعة الطباعة' }),
  );

  for (const [name, style] of Object.entries({
    arH1,
    arSectionTitle,
    arSample0,
    arSample5,
    arContentBody,
    arLead,
  })) {
    expect(style.letterSpacing, `${name} AR letter-spacing`).toMatch(/^(normal|0px)$/);
  }

  // Body copy and long descriptions: 16px / 28.8px (1.8), not the EN 25.6px.
  expect(arSample2.fontSize).toBe('16px');
  expect(arSample2.lineHeight).toBe('28.8px');
  expect(arContentBody.fontSize).toBe('16px');
  expect(arContentBody.lineHeight).toBe('28.8px');
  expect(arLead.fontSize).toBe('16px');
  expect(arLead.lineHeight).toBe('28.8px');

  // Headings keep their own heading leading, only tracking is reset.
  expect(arH1.lineHeight).toBe('35.38px');
  expect(arSectionTitle.lineHeight).toBe('24.3px');
  expect(arH1.direction).toBe('rtl');
  expect(arSample0.direction).toBe('rtl');

  // Sample metadata must describe the Arabic rules, not the English ones.
  await expect(page.getByText('29 / 1.22 / 630 / 0', { exact: false })).toBeVisible();
  await expect(page.getByText('16 / 1.8', { exact: false })).toBeVisible();
  await expect(page.getByText('-0.04em', { exact: false })).toHaveCount(0);
  await expect(page.getByText('.16em', { exact: false })).toHaveCount(0);

  // Switching back to EN restores the original tracking / 1.6 leading.
  await page.getByTestId('lang-en').click();
  await waitForFonts(page);
  await page.waitForTimeout(150);

  const enH1 = await readTextStyle(page.getByRole('heading', { level: 1 }));
  const enSample2 = await readTextStyle(page.getByTestId('type-sample-2'));
  const enSample5 = await readTextStyle(page.getByTestId('type-sample-5'));
  const enContentBody = await readTextStyle(
    page.locator('p').filter({ hasText: 'Illustrative scenario: pairing LAVISH OUD' }),
  );
  const enLead = await readTextStyle(
    page.locator('p').filter({ hasText: 'Internal visual baseline' }),
  );

  expect(enH1.letterSpacing).toBe('-1.16px');
  expect(enSample5.letterSpacing).toBe('1.92px');
  expect(enSample2.lineHeight).toBe('25.6px');
  expect(enContentBody.lineHeight).toBe('25.6px');
  expect(enLead.lineHeight).toBe('25.6px');
  expect(enH1.direction).toBe('ltr');
  await expect(page.getByText('-0.04em', { exact: false })).toBeVisible();
});

test('type scale matches tokens at desktop and mobile', async ({ page }) => {
  await blockExternalRequests(page);
  await openDesignLab(page);

  const expected = ['29px', '18px', '16px', '15px', '14px', '12px'];
  for (let index = 0; index < expected.length; index += 1) {
    const fontSize = await page
      .getByTestId(`type-sample-${index}`)
      .evaluate((element) => getComputedStyle(element).fontSize);
    expect(fontSize, `type sample ${index}`).toBe(expected[index]);
  }

  const bodySize = await page.evaluate(() => getComputedStyle(document.body).fontSize);
  expect(bodySize).toBe('16px');

  // Record the actual local-Inter vs Segoe UI / Arial rendering difference for
  // the reference comparison (the reference HTML never loaded Inter).
  const rendering = await page.evaluate(() => {
    const heading = document.querySelector('h1') as HTMLElement;
    const sample = heading.textContent ?? '';
    const measure = (fontFamily: string) => {
      const span = document.createElement('span');
      span.setAttribute(
        'style',
        [
          'position:absolute',
          'visibility:hidden',
          'white-space:nowrap',
          'font-size:29px',
          'font-weight:630',
          'line-height:1.22',
          'letter-spacing:-0.04em',
          `font-family:${fontFamily}`,
        ].join(';'),
      );
      span.textContent = sample;
      document.body.appendChild(span);
      const width = span.getBoundingClientRect().width;
      span.remove();
      return Math.round(width * 100) / 100;
    };
    return {
      sample,
      widthInter: measure("'Inter', sans-serif"),
      widthSegoe: measure("'Segoe UI', sans-serif"),
      widthArial: measure('Arial, sans-serif'),
      interLoaded: document.fonts.check('630 29px Inter'),
    };
  });
  report.typographyRendering = rendering;
  expect(rendering.interLoaded).toBe(true);
  expect(rendering.widthInter).toBeGreaterThan(0);
  expect(rendering.widthSegoe).toBeGreaterThan(0);
  expect(Math.abs(rendering.widthInter - rendering.widthSegoe)).toBeGreaterThan(0.5);

  await page.setViewportSize({ width: 390, height: 844 });
  await openDesignLab(page);
  const mobileTitle = await page
    .getByRole('heading', { level: 1 })
    .evaluate((element) => getComputedStyle(element).fontSize);
  expect(mobileTitle).toBe('25px');
});

test('keyboard focus is visible and the sample controls work', async ({ page }) => {
  await blockExternalRequests(page);
  await openDesignLab(page);

  await page.keyboard.press('Tab');
  await expect(page.getByTestId('lang-en')).toBeFocused();

  const focusRing = await page.getByTestId('lang-en').evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      outlineOffset: style.outlineOffset,
    };
  });
  expect(focusRing.outlineStyle).toBe('solid');
  expect(focusRing.outlineWidth).toBe('2px');
  expect(focusRing.outlineColor).toBe('rgb(129, 99, 51)');

  await page.keyboard.press('Tab');
  await expect(page.getByTestId('lang-ar')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('design-lab')).toHaveAttribute('dir', 'rtl');

  await page.keyboard.press('Tab');
  await expect(page.getByTestId('reveal-note')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('note-box')).toBeVisible();
  await expect(page.getByTestId('reveal-note')).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('note-box')).toBeHidden();

  await expect(page.getByTestId('focus-input')).toBeVisible();
  await page.getByTestId('focus-input').fill('Keyboard focus sample');
  await expect(page.getByTestId('focus-input')).toHaveValue('Keyboard focus sample');
});

test('no horizontal document overflow at 1920/1440/1366/390 in EN and AR', async ({ page }) => {
  await blockExternalRequests(page);

  for (const viewport of VIEWPORTS) {
    for (const lang of ['en', 'ar'] as const) {
      await page.setViewportSize(viewport);
      await openDesignLab(page);
      if (lang === 'ar') {
        await page.getByTestId('lang-ar').click();
        await waitForFonts(page);
      }
      const result = await measureOverflow(page, lang);
      report.overflow.push(result);

      expect(result.scrollWidth, `${result.viewport} ${lang} document scrollWidth`).toBeLessThanOrEqual(
        result.innerWidth + 1,
      );
      expect(result.bodyScrollWidth, `${result.viewport} ${lang} body scrollWidth`).toBeLessThanOrEqual(
        result.innerWidth + 1,
      );
      expect(result.offenders, `${result.viewport} ${lang} overflowing elements`).toEqual([]);
    }
  }
});

const durationMs = (value: string): number => {
  const trimmed = value.trim();
  if (trimmed.endsWith('ms')) return Number.parseFloat(trimmed);
  if (trimmed.endsWith('s')) return Number.parseFloat(trimmed) * 1000;
  return Number.parseFloat(trimmed);
};

test('reduced motion disables transitions and keeps the sample operable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await blockExternalRequests(page);
  await openDesignLab(page);

  const reduced = await page.evaluate(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    const dot = document.querySelector('[data-testid="motion-dot"]') as HTMLElement | null;
    const dotStyle = dot ? getComputedStyle(dot) : null;
    return {
      durationToken: rootStyle.getPropertyValue('--duration-base').trim(),
      baseToken: rootStyle.getPropertyValue('--duration-fast').trim(),
      transitionDuration: dotStyle ? dotStyle.transitionDuration : '',
      scrollBehavior: rootStyle.scrollBehavior,
      helpText: document.querySelector('[data-testid="motion-help"]')?.textContent ?? '',
    };
  });
  report.reducedMotion.reduce = reduced;

  expect(durationMs(reduced.durationToken), 'reduced duration token').toBe(0);
  expect(durationMs(reduced.baseToken), 'reduced fast token').toBe(0);
  expect(Number.parseFloat(reduced.transitionDuration)).toBeLessThan(0.05);
  expect(reduced.scrollBehavior).toBe('auto');
  expect(reduced.helpText).toContain('reduce');

  await page.getByTestId('motion-play').click();
  await page.waitForTimeout(120);
  const position = await page.evaluate(() => {
    const dot = document.querySelector('[data-testid="motion-dot"]')?.getBoundingClientRect();
    const track = document.querySelector('[data-testid="motion-track"]')?.getBoundingClientRect();
    if (!dot || !track) return null;
    return { gap: Math.round(track.right - dot.right) };
  });
  expect(position).not.toBeNull();
  expect(position?.gap ?? 999).toBeLessThanOrEqual(4);

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openDesignLab(page);
  const full = await page.evaluate(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    const dot = document.querySelector('[data-testid="motion-dot"]') as HTMLElement | null;
    return {
      durationToken: rootStyle.getPropertyValue('--duration-base').trim(),
      transitionDuration: dot ? getComputedStyle(dot).transitionDuration : '',
      helpText: document.querySelector('[data-testid="motion-help"]')?.textContent ?? '',
    };
  });
  report.reducedMotion.full = full;
  expect(durationMs(full.durationToken), 'full duration token').toBe(220);
  expect(full.transitionDuration).toContain('0.22');
  expect(full.helpText).toContain('no-preference');
});

test('captures evidence screenshots for four viewports, EN/AR and focus state', async ({ page }) => {
  const diagnostics = await attachDiagnostics(page);
  await blockExternalRequests(page);

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);

    await openDesignLab(page);
    const enName = `design-lab-${viewport.width}x${viewport.height}-en.png`;
    await page.screenshot({ path: evidencePath(enName), fullPage: true });
    report.screenshots.push({
      path: `evidence/m1/theme/${enName}`,
      viewport: `${viewport.width}x${viewport.height}`,
      lang: 'en',
      state: 'default',
      bytes: statSync(evidencePath(enName)).size,
    });

    await page.getByTestId('lang-ar').click();
    await waitForFonts(page);
    // Let the 180ms language-button transition finish before the screenshot so
    // repeated evidence captures are byte-stable.
    await page.waitForTimeout(250);
    const arName = `design-lab-${viewport.width}x${viewport.height}-ar.png`;
    await page.screenshot({ path: evidencePath(arName), fullPage: true });
    report.screenshots.push({
      path: `evidence/m1/theme/${arName}`,
      viewport: `${viewport.width}x${viewport.height}`,
      lang: 'ar',
      state: 'default',
      bytes: statSync(evidencePath(arName)).size,
    });
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await openDesignLab(page);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('reveal-note')).toBeFocused();
  // The global theme enables smooth scrolling (like the reference); scroll the
  // focused control into view deterministically before the screenshot.
  await page.getByTestId('reveal-note').scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const focusName = 'design-lab-1440x900-focus-en.png';
  await page.screenshot({ path: evidencePath(focusName), fullPage: false });
  report.screenshots.push({
    path: `evidence/m1/theme/${focusName}`,
    viewport: '1440x900',
    lang: 'en',
    state: 'focus',
    bytes: statSync(evidencePath(focusName)).size,
  });

  for (const shot of report.screenshots) {
    expect(shot.bytes, `${shot.path} size`).toBeGreaterThan(5_000);
  }
  expect(diagnostics.consoleErrors, 'console errors').toEqual([]);
  expect(diagnostics.pageErrors, 'page errors').toEqual([]);
  expect(diagnostics.failedRequests, 'failed requests').toEqual([]);
  expect(diagnostics.fontResponses.length).toBeGreaterThan(0);
});
