import { chromium } from 'playwright';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://127.0.0.1:3160/campaigns/scn-scent-layering.brief.main/journey?scenarioVersion=1.1.0&stage=creative',{waitUntil:'load'}); await p.waitForTimeout(900);
await p.getByTestId('journey-script-ar').click(); await p.waitForTimeout(500);
await p.screenshot({path:'evidence/product/connected-flow/final-2026-11-06/accept-07-creative-ar-script-1440.png',fullPage:true});
await p.goto('http://127.0.0.1:3160/campaigns/scn-scent-layering.brief.main/journey?scenarioVersion=1.1.0&stage=social',{waitUntil:'load'}); await p.waitForTimeout(800);
await p.screenshot({path:'evidence/product/connected-flow/final-2026-11-06/accept-08-social-preset-1440.png',fullPage:true});
await b.close();
