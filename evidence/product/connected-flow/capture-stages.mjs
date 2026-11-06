import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const dir='evidence/product/connected-flow/final-2026-11-06'; mkdirSync(dir,{recursive:true});
const base='http://127.0.0.1:3160'; const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1440,height:900}});
const errors=[]; p.on('pageerror',e=>errors.push(e.message));
const stages=['insight','strategy','creative','social'];
for (const vp of [{w:1440,h:900,s:'1440'},{w:1366,h:768,s:'1366'}]) {
  await p.setViewportSize({width:vp.w,height:vp.h});
  await p.goto(base+'/',{waitUntil:'load'}); await p.waitForTimeout(700); await p.screenshot({path:`${dir}/home-${vp.s}.png`});
  for (const stage of stages) {
    await p.goto(`${base}/campaigns/scn-scent-layering.brief.main/journey?scenarioVersion=1.1.0&stage=${stage}`,{waitUntil:'load'}); await p.waitForTimeout(900);
    await p.screenshot({path:`${dir}/journey-${stage}-${vp.s}.png`});
  }
}
await p.setViewportSize({width:1440,height:900});
await p.goto(`${base}/campaigns/scn-scent-layering.brief.main/journey?scenarioVersion=1.1.0&stage=social`,{waitUntil:'load'}); await p.waitForTimeout(800);
await p.getByTestId('SOC-language-ar').click(); await p.waitForTimeout(400); await p.screenshot({path:`${dir}/social-ar-1440.png`});
await p.setViewportSize({width:1366,height:768}); await p.waitForTimeout(400); await p.screenshot({path:`${dir}/social-ar-1366.png`});
await p.setViewportSize({width:390,height:844}); await p.reload({waitUntil:'load'}); await p.waitForTimeout(700); await p.screenshot({path:`${dir}/social-ar-390.png`,fullPage:true});
console.log(JSON.stringify({errors},null,2)); await b.close();
