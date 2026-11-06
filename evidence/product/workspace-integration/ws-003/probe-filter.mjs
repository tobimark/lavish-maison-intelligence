import { chromium } from 'playwright';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://127.0.0.1:3170/deliverables',{waitUntil:'load'}); await p.waitForTimeout(800);
const d=()=>p.getByTestId('deliverables-downloads');
console.log('initial open', await d().evaluate(e=>e.open));
await d().locator('summary').first().click(); await p.waitForTimeout(300); console.log('after open', await d().evaluate(e=>e.open));
await p.getByTestId('DEL-campaign').selectOption('scn-luxury-gifting.brief.main');
await p.waitForURL(u=>u.searchParams.get('campaignId')==='scn-luxury-gifting.brief.main');
await p.waitForTimeout(500);
console.log('after filter open', await d().evaluate(e=>e.open), 'campaignVisible', await p.getByTestId('DEL-campaign').isVisible());
if(!(await d().evaluate(e=>e.open))){ await d().locator('summary').first().click(); await p.waitForTimeout(300); }
console.log('after reopen open', await d().evaluate(e=>e.open), 'versionVisible', await p.getByTestId('DEL-version-scn-luxury-gifting.script.ar-v1-preset').isVisible().catch(()=>false), 'packageVisible', await p.getByTestId('deliverable-package').isVisible().catch(()=>false));
await p.screenshot({path:'evidence/product/workspace-integration/ws-003/probe-filter.png'});
await b.close();
