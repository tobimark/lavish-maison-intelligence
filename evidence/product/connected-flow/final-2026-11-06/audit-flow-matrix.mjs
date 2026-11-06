import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const base='http://127.0.0.1:3160'; const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1440,height:900}});
const ids=new Set(); const states={};
async function collect(name){const list=await p.evaluate(()=>Array.from(document.querySelectorAll('[data-control-id]')).map(e=>e.getAttribute('data-control-id')).filter(Boolean)); states[name]=list; list.forEach(id=>ids.add(id));}
await p.goto(base+'/',{waitUntil:'load'}); await p.waitForTimeout(600); await collect('home');
for(const stage of ['insight','strategy','creative','social']){await p.goto(`${base}/campaigns/scn-scent-layering.brief.main/journey?scenarioVersion=1.1.0&stage=${stage}`,{waitUntil:'load'}); await p.waitForTimeout(700); await collect(stage);}
// social lifecycle
await p.goto(`${base}/campaigns/scn-scent-layering.brief.main/journey?scenarioVersion=1.1.0&stage=social`,{waitUntil:'load'}); await p.waitForTimeout(600); await collect('social-preset');
await p.getByTestId('SOC-edit-post').click(); await p.waitForTimeout(500); await collect('social-draft');
await p.getByTestId('SOC-caption-input').fill('MATRIX-AUDIT-CAPTION'); await p.getByTestId('SOC-save').click(); await p.waitForTimeout(600);
await p.getByTestId('SOC-review').click(); await p.waitForTimeout(400); await collect('social-confirm');
if(await p.getByTestId('SOC-confirm-creative').count()){await p.getByTestId('SOC-confirm-creative').click(); await p.waitForTimeout(1500); await p.getByTestId('SOC-review').click(); await p.waitForTimeout(500);}
await collect('social-review-dialog');
await p.getByTestId('SOC-review-confirm').click(); await p.waitForTimeout(700);
await p.getByTestId('SOC-simulate').click(); await p.waitForTimeout(400); await collect('social-publish-dialog');
await p.getByTestId('SOC-publish-confirm').click(); await p.waitForTimeout(1400); await collect('social-published');
await p.getByTestId('SOC-view-post').click(); await p.waitForTimeout(800); await collect('social-detail');
const matrix=readFileSync('docs/INTERACTION_AUDIT_MATRIX.csv','utf8').trim().split(/\r?\n/);
const flow=matrix.slice(1).map(l=>l.split(',')[0]).filter(id=>id.startsWith('FLOW-')||id.startsWith('OV-journey-')||id==='OV-explore-journey');
const rows=flow.map(id=>({controlId:id,found:ids.has(id),observedState:Object.entries(states).find(([,v])=>v.includes(id))?.[0]??null}));
const missing=rows.filter(r=>!r.found).map(r=>r.controlId);
writeFileSync('evidence/product/connected-flow/final-2026-11-06/flow-matrix-audit.json',JSON.stringify({checkedAt:new Date().toISOString(),matrix:'docs/INTERACTION_AUDIT_MATRIX.csv',matrixRowCount:matrix.length-1,flowRows:rows.length,found:rows.filter(r=>r.found).length,missing,rows,states:Object.keys(states)},null,2)+'\n');
console.log(JSON.stringify({flowRows:rows.length,found:rows.filter(r=>r.found).length,missing},null,2));
await b.close();
