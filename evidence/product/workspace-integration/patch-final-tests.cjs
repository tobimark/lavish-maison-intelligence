const fs=require('fs');
let p='apps/web/tests/product-cross-page.spec.ts'; let s=fs.readFileSync(p,'utf8');
if(!s.includes('async function openDownloads')) s=s.replace("test.describe(",`async function openDownloads(page: Page) {\n  const details = page.getByTestId('deliverables-downloads');\n  await expect(details).toBeVisible();\n  if (!(await details.evaluate((element) => element.hasAttribute('open')))) {\n    await details.locator('summary').first().click();\n  }\n}\n\ntest.describe(`);
s=s.replace(/(await page\.goto\([^\n]*deliverables[^\n]*\);\n)/g, "$1  await openDownloads(page);\n");
fs.writeFileSync(p,s);
p='apps/web/tests/product-workspace-integration.spec.ts'; s=fs.readFileSync(p,'utf8');
s=s.replace("    await expect(page.getByTestId('deliverables-downloads')).toHaveAttribute('open', '');","    await page.getByTestId('deliverables-downloads').locator('summary').first().click();\n    await expect(page.getByTestId('deliverables-downloads')).toHaveAttribute('open', '');");
fs.writeFileSync(p,s);
console.log('patched cross-page + WS2');
