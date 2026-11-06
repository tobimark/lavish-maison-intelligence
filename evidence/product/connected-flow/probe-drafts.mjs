import { chromium } from 'playwright';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1440,height:900}});
const url='http://127.0.0.1:3150/campaigns/scn-scent-layering.brief.main/journey?scenarioVersion=1.1.0&stage=social';
await p.goto(url,{waitUntil:'load'}); await p.waitForTimeout(600);
await p.getByTestId('SOC-edit-post').click(); await p.waitForTimeout(300); await p.getByTestId('SOC-caption-input').fill('EN-AAA'); await p.getByTestId('SOC-save').click(); await p.waitForTimeout(400);
await p.getByTestId('SOC-language-ar').click(); await p.waitForTimeout(200); await p.getByTestId('SOC-edit-post').click(); await p.waitForTimeout(400); await p.getByTestId('SOC-caption-input').fill('AR-BBB'); await p.getByTestId('SOC-save').click(); await p.waitForTimeout(400);
const data=await p.evaluate(async()=>{const db=await new Promise((res,rej)=>{const r=indexedDB.open('lavish-poc-content-v1');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}); const tx=db.transaction('socialWorkflows','readonly'); const all=await new Promise((res,rej)=>{const r=tx.objectStore('socialWorkflows').getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}); db.close(); return all;});
console.log(JSON.stringify(data,null,2));
await b.close();
