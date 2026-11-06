import { chromium } from 'playwright';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1440,height:900}});
const base='http://127.0.0.1:3160'; const ids=new Set(); const byState={};
async function collect(name){const list=await p.evaluate(()=>Array.from(document.querySelectorAll('[data-control-id]')).map(e=>e.getAttribute('data-control-id')).filter(Boolean)); byState[name]=list; list.forEach(id=>ids.add(id));}
await p.goto(base+'/',{waitUntil:'load'}); await p.waitForTimeout(700); await collect('home');
for(const stage of ['insight','strategy','creative','social']){await p.goto(`${base}/campaigns/scn-scent-layering.brief.main/journey?scenarioVersion=1.1.0&stage=${stage}`,{waitUntil:'load'}); await p.waitForTimeout(700); await collect(stage);}
await p.goto(`${base}/campaigns/scn-scent-layering.brief.main/journey?scenarioVersion=1.1.0&stage=social`,{waitUntil:'load'}); await p.waitForTimeout(600);
await p.getByTestId('SOC-edit-post').click(); await p.waitForTimeout(500); await collect('social-draft');
await p.getByTestId('SOC-caption-input').fill('probe caption'); await p.getByTestId('SOC-save').click(); await p.waitForTimeout(500);
await p.getByTestId('SOC-review').click(); await p.waitForTimeout(400); await collect('social-confirm');
if(await p.getByTestId('SOC-confirm-creative').count()){await p.getByTestId('SOC-confirm-creative').click(); await p.waitForTimeout(1500); await p.getByTestId('SOC-review').click(); await p.waitForTimeout(500);}
await collect('social-review-dialog');
console.log(JSON.stringify({ids:[...ids].sort(),byState},null,2));
await b.close();
