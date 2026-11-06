import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const base='http://127.0.0.1:3140';
const out={};
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error') errors.push(m.text());});
for (const [key,url] of [['overview','/'],['brief','/campaigns/scn-scent-layering.brief.main/brief'],['atelier','/atelier?campaignId=scn-scent-layering.brief.main&language=en'],['library','/library'],['deliverables','/deliverables']]) {
  await page.goto(base+url,{waitUntil:'load'}); await page.waitForTimeout(2200);
  out[key]={url:page.url(), body:(await page.locator('main').innerText()).replace(/\s+/g,' ').slice(0,1200)};
}
mkdirSync('evidence/product/assets/as-003',{recursive:true});
await page.goto(base+'/campaigns/scn-scent-layering.brief.main/brief',{waitUntil:'load'}); await page.waitForTimeout(1500); await page.screenshot({path:'evidence/product/assets/as-003/brief-before-AS004-1440.png'});
await page.goto(base+'/atelier?campaignId=scn-scent-layering.brief.main&language=en',{waitUntil:'load'}); await page.waitForTimeout(1500); await page.screenshot({path:'evidence/product/assets/as-003/atelier-before-AS004-1440.png'});
await browser.close();
writeFileSync('evidence/product/assets/as-003/query-probe.json',JSON.stringify({checkedAt:new Date().toISOString(),out,errors},null,2)+'\n');
console.log(JSON.stringify(out,null,2)); console.log('ERRORS',errors);
