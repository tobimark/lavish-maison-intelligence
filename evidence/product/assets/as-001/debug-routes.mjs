import { chromium } from 'playwright';
const browser=await chromium.launch();
for (const path of ['/','/radar','/opportunities','/atelier','/library','/deliverables']) {
  const context=await browser.newContext();
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:3000'+path,{waitUntil:'networkidle'});
  await page.waitForTimeout(2500);
  const main=(await page.locator('main').innerText()).replace(/\s+/g,' ').slice(0,160);
  console.log(path+' => '+main);
  await context.close();
}
await browser.close();
