const fs=require('fs');
let p='apps/web/tests/product-atelier.spec.ts'; let s=fs.readFileSync(p,'utf8');
s=s.replace("    const providedVideo = page.getByTestId('provided-video');","    const providedVideo = page.getByTestId('journey-video');");
fs.writeFileSync(p,s);
p='apps/web/tests/product-opportunities.spec.ts'; s=fs.readFileSync(p,'utf8');
s=s.replace("await expect(page.getByTestId(`OPP-card-${opportunity.analysisId}`)).toHaveAttribute('href', `/opportunities/${opportunity.analysisId}`);","await expect(page.getByTestId(`OPP-card-${opportunity.analysisId}`)).toHaveAttribute('href', `/opportunities/${opportunity.analysisId}?campaignId=scn-scent-layering.brief.main&scenarioVersion=1.1.0`);");
fs.writeFileSync(p,s);
p='apps/web/tests/product-provided-assets.spec.ts'; s=fs.readFileSync(p,'utf8');
// helper
s=s.replace("function spread(values: number[]): number {",`async function openDownloads(page: Page) {
  const details = page.getByTestId('deliverables-downloads');
  await expect(details).toBeVisible();
  if (!(await details.evaluate((element) => element.hasAttribute('open')))) {
    await details.locator('summary').first().click();
    await expect(details).toHaveAttribute('open', '');
  }
}

function spread(values: number[]): number {`);
// homepage CTA and stage hrefs
s=s.replace("    `/campaigns/${CAMPAIGN}/journey?scenarioVersion=1.1.0`,","    `/radar?campaignId=${CAMPAIGN}&scenarioVersion=1.1.0`,");
s=s.replace("  for (const stage of ['insight', 'strategy', 'creative', 'social']) {\n    await expect(page.getByTestId(`home-journey-step-${stage}`)).toHaveAttribute(\n      'href',\n      `/campaigns/${CAMPAIGN}/journey?scenarioVersion=1.1.0&stage=${stage}`,\n    );\n  }","  const stageTargets: Array<[string, string]> = [\n    ['insight', '/radar'], ['strategy', '/opportunities'], ['creative', '/atelier'], ['social', '/deliverables'],\n  ];\n  for (const [stage, target] of stageTargets) {\n    await expect(page.getByTestId(`home-journey-step-${stage}`)).toHaveAttribute(\n      'href',\n      `${target}?campaignId=${CAMPAIGN}&scenarioVersion=1.1.0`,\n    );\n  }");
// CTA test URLs
s=s.replace("  await expect(page).toHaveURL((url) => url.pathname === `/campaigns/${CAMPAIGN}/journey`);","  await expect(page).toHaveURL((url) => url.pathname === '/radar' && url.searchParams.get('campaignId') === CAMPAIGN);");
s=s.replace("  await expect(page).toHaveURL(/\\/opportunities$/);","  await expect(page).toHaveURL((url) => url.pathname === '/opportunities');");
// deliverables showcase / downloads open
s=s.replace("  await open(page, '/deliverables');\n  await expect(page.getByTestId('deliverables-page')).toBeVisible();\n  await expect(page.getByTestId('provided-showcase-deliverables')).toBeVisible();","  await open(page, '/deliverables');\n  await expect(page.getByTestId('deliverables-page')).toBeVisible();\n  await openDownloads(page);\n  await expect(page.getByTestId('provided-showcase-deliverables')).toBeVisible();");
s=s.replace("  await open(page, '/deliverables');\n  await expect(page.getByTestId('DEL-bilingual')).toBeVisible();","  await open(page, '/deliverables');\n  await openDownloads(page);\n  await expect(page.getByTestId('DEL-bilingual')).toBeVisible();");
s=s.replace("  await open(page, '/deliverables');\n  const downloadPromise = page.waitForEvent('download');\n  await page.getByTestId('provided-video-download').click();","  await open(page, '/deliverables');\n  await openDownloads(page);\n  const downloadPromise = page.waitForEvent('download');\n  await page.getByTestId('provided-video-download').click();");
fs.writeFileSync(p,s);
console.log('patched specs');
