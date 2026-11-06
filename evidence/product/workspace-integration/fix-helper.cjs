const fs=require('fs');
const helper=`async function showDownloads(page: Page) {
  const details = page.getByTestId('deliverables-downloads');
  await expect(details).toBeVisible();
  if (!(await details.evaluate((element) => element.hasAttribute('open')))) {
    await details.locator('summary').click();
    await expect(details).toHaveAttribute('open', '');
  }
}`;
for (const p of ['apps/web/tests/product-asset-downloads.spec.ts','apps/web/tests/product-deliverables.spec.ts']) {
  let s=fs.readFileSync(p,'utf8');
  s=s.replace('\n'+helper+'\n','\n');
  // insert helper before first test.describe
  s=s.replace('test.describe(', helper+'\n\ntest.describe(');
  fs.writeFileSync(p,s);
}
console.log('moved helper');
