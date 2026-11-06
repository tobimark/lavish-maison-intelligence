const fs=require('fs'); const p='apps/web/tests/product-workspace-integration.spec.ts'; let s=fs.readFileSync(p,'utf8');
const block=`

test.describe('WS-FIX-001 · Library same-path campaign switch keeps sidebar context', () => {
  test('A→B→Atelier/Deliverables/B→C→A, exact-version cleanup, All/Clear and read-only counts', async ({ page }) => {
    const dir = process.env.EVIDENCE_ROOT
      ? path.resolve(process.env.EVIDENCE_ROOT)
      : path.resolve(process.cwd(), 'evidence', 'product', 'workspace-integration', 'ws-fix-001', 'run-default');
    mkdirSync(dir, { recursive: true });
    const shot = async (name: string) => {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(120);
      await page.screenshot({ path: path.join(dir, name), fullPage: false });
    };
    const B = 'scn-luxury-gifting.brief.main';
    const C = 'scn-oud-storytelling.brief.main';
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/library?campaignId=${A}&scenarioVersion=1.1.0&language=en`, { waitUntil: 'load' });
    await expect(page.getByTestId('LIB-campaign')).toBeVisible();
    await page.waitForTimeout(400);
    const before = await counts(page);
    await shot('01-library-A-1440.png');

    // Real native select, not goto(B).
    await page.getByTestId('LIB-campaign').selectOption(B);
    await expect(page).toHaveURL((url) => url.searchParams.get('campaignId') === B
      && url.searchParams.get('scenarioVersion') === '1.0.0'
      && url.searchParams.get('language') === 'en'
      && !url.searchParams.get('versionId')
      && !url.searchParams.get('sessionId'));
    const atelierHref = await page.getByTestId('shell-nav-atelier').getAttribute('href');
    const deliverablesHref = await page.getByTestId('shell-nav-deliverables').getAttribute('href');
    expect(atelierHref).toBe(`/atelier?campaignId=${B}&scenarioVersion=1.0.0&language=en`);
    expect(deliverablesHref).toBe(`/deliverables?campaignId=${B}&scenarioVersion=1.0.0&language=en`);
    await shot('02-library-B-href-before-click-1440.png');

    await page.getByTestId('shell-nav-atelier').click();
    await expect(page).toHaveURL((url) => url.pathname === '/atelier'
      && url.searchParams.get('campaignId') === B
      && url.searchParams.get('scenarioVersion') === '1.0.0');
    await expect(page.getByTestId('atelier-page')).toContainText('A Gesture, Considered');
    await shot('03-atelier-B-1440.png');
    await page.reload({ waitUntil: 'load' });
    await expect(page.getByTestId('atelier-page')).toContainText('A Gesture, Considered');
    await expect(page).toHaveURL((url) => url.searchParams.get('campaignId') === B);
    await page.goBack({ waitUntil: 'load' });
    await expect(page.getByTestId('LIB-campaign')).toHaveValue(B);
    await expect(page.getByTestId('shell-nav-atelier')).toHaveAttribute('href', `/atelier?campaignId=${B}&scenarioVersion=1.0.0&language=en`);

    await page.getByTestId('shell-nav-deliverables').click();
    await expect(page).toHaveURL((url) => url.pathname === '/deliverables'
      && url.searchParams.get('campaignId') === B
      && url.searchParams.get('scenarioVersion') === '1.0.0');
    await expect(page.getByTestId('deliverables-social-unavailable')).toBeVisible();
    await shot('04-deliverables-B-1440.png');

    // B→C→A via the same real select.
    await page.getByTestId('shell-nav-library').click();
    await expect(page.getByTestId('LIB-campaign')).toHaveValue(B);
    await page.getByTestId('LIB-campaign').selectOption(C);
    await expect(page).toHaveURL((url) => url.searchParams.get('campaignId') === C
      && url.searchParams.get('scenarioVersion') === '1.0.0');
    await page.getByTestId('LIB-campaign').selectOption(A);
    await expect(page).toHaveURL((url) => url.searchParams.get('campaignId') === A
      && url.searchParams.get('scenarioVersion') === '1.1.0');
    await expect(page.getByTestId('shell-nav-atelier')).toHaveAttribute('href', `/atelier?campaignId=${A}&scenarioVersion=1.1.0&language=en`);
    await shot('05-library-A-return-1440.png');

    // AR keeps the case/version and reaches both workspaces.
    await page.getByTestId('LIB-language').selectOption('ar');
    await expect(page).toHaveURL((url) => url.searchParams.get('language') === 'ar');
    await expect(page.getByTestId('shell-nav-atelier')).toHaveAttribute('href', `/atelier?campaignId=${A}&scenarioVersion=1.1.0&language=ar`);
    await expect(page.getByTestId('shell-nav-deliverables')).toHaveAttribute('href', `/deliverables?campaignId=${A}&scenarioVersion=1.1.0&language=ar`);

    // All campaigns clears the case context (no stale A version).
    await page.getByTestId('LIB-campaign').selectOption('');
    await expect(page).toHaveURL((url) => !url.searchParams.get('campaignId')
      && !url.searchParams.get('scenarioVersion')
      && !url.searchParams.get('versionId')
      && !url.searchParams.get('sessionId'));
    await expect(page.getByTestId('shell-nav-atelier')).toHaveAttribute('href', '/atelier?language=ar');
    await shot('06-library-all-campaigns-1440.png');

    // Clear filters removes every leftover filter and exact reference.
    await page.goto(`/library?campaignId=${A}&scenarioVersion=1.1.0&language=en&kind=script&origin=preset&versionId=scn-scent-layering.script.en-v2`, { waitUntil: 'load' });
    await page.waitForTimeout(500);
    await page.getByTestId('LIB-clear').click();
    await expect(page).toHaveURL((url) => !url.searchParams.toString());
    await expect(page.getByTestId('shell-nav-atelier')).toHaveAttribute('href', '/atelier');

    // An explicit A exact version, then switch to B: old exact reference/preview must disappear.
    await page.goto(`/library?campaignId=${A}&scenarioVersion=1.1.0&language=en&versionId=scn-scent-layering.script.en-v2&sessionId=`, { waitUntil: 'load' });
    await page.waitForTimeout(500);
    await page.getByTestId('LIB-campaign').selectOption(B);
    await expect(page).toHaveURL((url) => url.searchParams.get('campaignId') === B
      && url.searchParams.get('scenarioVersion') === '1.0.0'
      && !url.searchParams.get('versionId')
      && !url.searchParams.get('sessionId'));
    await expect(page.getByTestId('LIB-preview')).toHaveCount(0);

    expect(await counts(page)).toEqual(before);
  });
});
`;
fs.writeFileSync(p,s+block); console.log('added fix test');
