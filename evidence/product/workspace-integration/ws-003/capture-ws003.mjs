import { chromium } from 'playwright';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1440,height:900}});
const base='http://127.0.0.1:3170'; const A='scn-scent-layering.brief.main';
for (const [name,w,h] of [['deliverables-1440',1440,900],['deliverables-1366',1366,768]]) {
 await p.setViewportSize({width:w,height:h});
 await p.goto(`${base}/deliverables?campaignId=${A}&scenarioVersion=1.1.0`,{waitUntil:'load'}); await p.waitForTimeout(700);
 await p.screenshot({path:`evidence/product/workspace-integration/ws-003/${name}.png`});
}
await p.setViewportSize({width:1440,height:900});
await p.goto(`${base}/deliverables?campaignId=${A}&scenarioVersion=1.1.0&language=ar`,{waitUntil:'load'}); await p.waitForTimeout(700);
await p.getByTestId('SOC-language-ar').click(); await p.waitForTimeout(300);
await p.screenshot({path:'evidence/product/workspace-integration/ws-003/deliverables-ar-1440.png'});
await b.close();
