import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const base='http://127.0.0.1:3140'; const dir='evidence/product/assets/as-004'; mkdirSync(dir,{recursive:true});
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[]; page.on('pageerror',e=>errors.push(e.message));
await page.goto(base+'/',{waitUntil:'load'}); await page.waitForTimeout(1200);
const overview={h1:await page.locator('h1').innerText(), pending:await page.getByText('Campaign copy is being prepared.').count(), assets:await page.getByTestId('home-creative-progression').innerText()};
await page.screenshot({path:dir+'/checkpoint-A-overview-1440.png'});
await page.goto(base+'/campaigns/scn-scent-layering.brief.main/brief',{waitUntil:'load'}); await page.waitForTimeout(1200);
const brief={title:await page.locator('h1').innerText(), identity:await page.getByTestId('provided-identity').count(), hero:await page.getByTestId('provided-hero').count(), body:(await page.locator('main').innerText()).replace(/\s+/g,' ').slice(0,400)};
await page.screenshot({path:dir+'/checkpoint-A-brief-1440.png'});
await page.goto(base+'/atelier?campaignId=scn-scent-layering.brief.main&language=en',{waitUntil:'load'}); await page.waitForTimeout(1500);
const atelier={video:await page.getByTestId('provided-video').count(), identity:await page.getByTestId('provided-identity').count(), body:(await page.locator('main').innerText()).replace(/\s+/g,' ').slice(0,500)};
const video=page.getByTestId('provided-video');
let media=null; if(await video.count()){ await page.waitForFunction(()=>{const v=document.querySelector('[data-testid="provided-video"]');return v&&v.readyState>=1&&v.duration>0;}); media=await video.evaluate(v=>({controls:v.controls,width:v.videoWidth,height:v.videoHeight,duration:v.duration,paused:v.paused})); }
await page.screenshot({path:dir+'/checkpoint-A-atelier-1440.png'});
await page.setViewportSize({width:1366,height:768});
for (const [name,url] of [['overview','/'],['brief','/campaigns/scn-scent-layering.brief.main/brief'],['atelier','/atelier?campaignId=scn-scent-layering.brief.main&language=en']]) { await page.goto(base+url,{waitUntil:'load'}); await page.waitForTimeout(900); await page.screenshot({path:dir+`/checkpoint-A-${name}-1366.png`}); }
await browser.close();
writeFileSync(dir+'/checkpoint-A.json',JSON.stringify({checkedAt:new Date().toISOString(),base,overview,brief,atelier,media,errors},null,2)+'\n');
console.log(JSON.stringify({overview,brief,atelier,media,errors},null,2));
