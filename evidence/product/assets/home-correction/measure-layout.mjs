import { chromium } from 'playwright';
const browser=await chromium.launch();
for (const width of [1440,1366]) {
  const page=await browser.newPage({viewport:{width,height: width===1440?900:768}});
  await page.goto('http://127.0.0.1:3115/',{waitUntil:'networkidle'});
  await page.waitForTimeout(500);
  const data=await page.evaluate(()=>{
    const box=(sel)=>{const n=document.querySelector(sel); if(!n) return null; const r=n.getBoundingClientRect(); return {top:Math.round(r.top),bottom:Math.round(r.bottom),height:Math.round(r.height)};};
    return {h1:box('h1'), intro:box('[aria-labelledby="overview-title"]'), concept:box('[data-testid="home-creative-progression"]'), header:box('[data-testid="home-creative-progression"] header'), grid:box('.conceptGrid'), card:box('[data-stage="identity"]'), media:box('[data-testid="home-stage-identity-media"]'), caption:box('[data-testid="home-stage-identity"] > span:last-child'), scroll:document.documentElement.scrollHeight};
  });
  console.log(width, JSON.stringify(data));
  await page.close();
}
await browser.close();
