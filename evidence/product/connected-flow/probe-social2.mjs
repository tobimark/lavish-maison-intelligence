import { chromium } from 'playwright';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1440,height:900}});
const log=[];
await p.goto('http://127.0.0.1:3150/campaigns/scn-scent-layering.brief.main/journey?scenarioVersion=1.1.0&stage=social',{waitUntil:'load'}); await p.waitForTimeout(800);
await p.getByTestId('SOC-edit-post').click(); await p.waitForTimeout(500);
await p.getByTestId('SOC-caption-input').fill('E2E custom EN caption for SERENITY.'); await p.getByTestId('SOC-save').click(); await p.waitForTimeout(600);
await p.getByTestId('SOC-review').click(); await p.waitForTimeout(500);
await p.getByTestId('SOC-confirm-creative').click(); await p.waitForTimeout(1800);
log.push('afterConfirm script='+await p.getByTestId('SOC-script-state').innerText());
log.push('draft='+await p.getByTestId('SOC-draft-state').innerText());
log.push('confirmPanel='+await p.getByTestId('SOC-confirm-creative-panel').count());
await p.getByTestId('SOC-review').click(); await p.waitForTimeout(600);
log.push('reviewDialog='+await p.getByTestId('SOC-review-dialog').count());
if(await p.getByTestId('SOC-review-dialog').count()){ log.push('dialogText='+(await p.getByTestId('SOC-review-dialog').innerText()).slice(0,500)); await p.screenshot({path:'evidence/product/connected-flow/probe-review-dialog.png'}); await p.getByTestId('SOC-review-confirm').click(); await p.waitForTimeout(700); }
log.push('afterReview draft='+await p.getByTestId('SOC-draft-state').innerText()+' simulateDisabled='+await p.getByTestId('SOC-simulate').isDisabled());
await p.getByTestId('SOC-simulate').click(); await p.waitForTimeout(500);
log.push('pubDialog='+await p.getByTestId('SOC-publish-dialog').count());
if(await p.getByTestId('SOC-publish-dialog').count()){ log.push('pubText='+(await p.getByTestId('SOC-publish-dialog').innerText()).slice(0,500)); await p.screenshot({path:'evidence/product/connected-flow/probe-publish-dialog.png'}); await p.getByTestId('SOC-publish-confirm').click(); await p.waitForTimeout(1200); }
log.push('result='+await p.getByTestId('SOC-publish-result').innerText().catch(()=>''));
log.push('viewPost='+await p.getByTestId('SOC-view-post').getAttribute('href').catch(()=>''));
log.push('history='+await p.getByTestId('SOC-history').innerText().catch(()=>''));
console.log(log.join('\n'));
await b.close();
