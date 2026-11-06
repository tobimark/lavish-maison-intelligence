import { chromium } from 'playwright';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1440,height:900}}); const errs=[];
p.on('pageerror',e=>errs.push('pageerror '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push('console '+m.text());});
for (const [name,url] of [['home','/'],['radar','/radar?campaignId=scn-scent-layering.brief.main&scenarioVersion=1.1.0'],['opps','/opportunities?campaignId=scn-scent-layering.brief.main&scenarioVersion=1.1.0'],['atelier','/atelier?campaignId=scn-scent-layering.brief.main&scenarioVersion=1.1.0&language=en'],['deliverables','/deliverables?campaignId=scn-scent-layering.brief.main&scenarioVersion=1.1.0']]) {
 await p.goto('http://127.0.0.1:3170'+url,{waitUntil:'load'}); await p.waitForTimeout(1200);
 console.log(name, 'h1=', await p.locator('h1').first().innerText().catch(()=>'NONE'), 'overflow=', await p.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth), 'social=', await p.getByTestId('social-stage').count(), 'insight=', await p.getByTestId('journey-stage-insight').count(), 'strategy=', await p.getByTestId('journey-stage-strategy').count(), 'creative=', await p.getByTestId('journey-stage-creative').count());
 await p.screenshot({path:`evidence/product/workspace-integration/probe-${name}.png`,fullPage:false});
}
console.log('errors', JSON.stringify(errs,null,2)); await b.close();
