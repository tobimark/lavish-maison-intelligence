const fs=require('fs');
function addHelper(p, anchor){
  let s=fs.readFileSync(p,'utf8');
  if(!s.includes('async function showDownloads')){
    s=s.replace(anchor, anchor+`\n\nasync function showDownloads(page: Page) {\n  const details = page.getByTestId('deliverables-downloads');\n  await expect(details).toBeVisible();\n  if (!(await details.evaluate((element) => element.hasAttribute('open')))) {\n    await details.locator('summary').click();\n    await expect(details).toHaveAttribute('open', '');\n  }\n}`);
  }
  return s;
}
let p='apps/web/tests/product-asset-downloads.spec.ts';
let s=addHelper(p,"async function download(page: Page, trigger: () => Promise<void>, filename: string): Promise<Buffer> {");
// insert after every deliverables goto statement closing line
s=s.replace(/(await page\.goto\([^\n]*deliverables[^\n]*\);\n)/g, "$1    await showDownloads(page);\n");
fs.writeFileSync(p,s);
p='apps/web/tests/product-deliverables.spec.ts';
s=addHelper(p,"function hashFile(file: string): string {");
s=s.replace(/(await page\.goto\([^\n]*deliverables[^\n]*\);\n)/g, "$1    await showDownloads(page);\n");
fs.writeFileSync(p,s);
console.log('patched downloads specs');
