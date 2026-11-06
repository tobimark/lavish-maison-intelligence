import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
const dir='evidence/product/workspace-integration/final'; mkdirSync(dir,{recursive:true});
const base='http://127.0.0.1:3170'; const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1440,height:900},acceptDownloads:true}); const p=await ctx.newPage();
const errors=[]; p.on('pageerror',e=>errors.push('pageerror: '+e.message)); p.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
const steps=[]; const shot=async n=>{await p.evaluate(()=>scrollTo(0,0)); await p.waitForTimeout(120); await p.screenshot({path:`${dir}/${n}.png`}); steps.push({step:n,url:p.url()});};
const watchVideo=async()=>{const v=p.getByTestId('journey-video'); await p.waitForFunction(()=>{const n=document.querySelector('[data-testid="journey-video"]');return n&&n.readyState>=1&&n.duration>0;}); const m=await v.evaluate(n=>({controls:n.controls,width:n.videoWidth,height:n.videoHeight,duration:n.duration,fit:getComputedStyle(n).objectFit})); await v.evaluate(n=>{n.muted=true;n.currentTime=0;}); await v.evaluate(async n=>{await n.play();}); await p.waitForFunction(()=>document.querySelector('[data-testid="journey-video"]').currentTime>0.2); const played=await v.evaluate(n=>n.currentTime); await v.evaluate(n=>{n.pause();n.currentTime=7.56;}); await p.waitForTimeout(400); const seek=await v.evaluate(n=>n.currentTime); return {m,played,seek};};
// 1 home
await p.goto(base+'/',{waitUntil:'load'}); await p.waitForTimeout(700); await shot('accept-01-home-1440');
await p.getByTestId('ov-explore-journey').click(); await p.waitForTimeout(900); await shot('accept-02-insight-1440');
// evidence
await p.getByTestId('journey-view-evidence').click(); await p.waitForTimeout(400); await shot('accept-03-insight-evidence-1440'); await p.getByTestId('journey-evidence-close').click();
// strategy
await p.getByTestId('journey-next-insight').click(); await p.waitForTimeout(700); await shot('accept-04-strategy-1440');
const why=await p.getByTestId('journey-why-product').innerText();
await p.getByTestId('journey-open-brief').click(); await p.waitForTimeout(700); await shot('accept-05-brief-1440');
await p.goto(base+'/campaigns/scn-scent-layering.brief.main/journey?scenarioVersion=1.1.0&stage=creative',{waitUntil:'load'}); await p.waitForTimeout(800);
const media=await watchVideo(); await shot('accept-06-creative-video-playing-1440');
// scripts
const enShots=await p.locator('[data-testid^="journey-script-shot-"]').count();
await p.getByTestId('journey-script-ar').click(); await p.waitForTimeout(400); await shot('accept-07-creative-ar-script-1440');
// social
await p.goto(base+'/campaigns/scn-scent-layering.brief.main/journey?scenarioVersion=1.1.0&stage=social',{waitUntil:'load'}); await p.waitForTimeout(800); await shot('accept-08-social-preset-1440');
await p.getByTestId('SOC-edit-post').click(); await p.waitForTimeout(600);
const original=await p.getByTestId('SOC-caption-input').inputValue();
const caption='WS acceptance caption — saved before review and kept on the simulated post.';
await p.getByTestId('SOC-caption-input').fill(caption); await p.getByTestId('SOC-save').click(); await p.waitForTimeout(700); await shot('accept-09-social-saved-1440');
await p.getByTestId('SOC-review').click(); await p.waitForTimeout(500);
if(await p.getByTestId('SOC-confirm-creative').count()){ await p.getByTestId('SOC-confirm-creative').click(); await p.waitForTimeout(1800); await p.getByTestId('SOC-review').click(); await p.waitForTimeout(600); }
await shot('accept-10-social-review-dialog-1440');
const reviewText=await p.getByTestId('SOC-review-dialog').innerText();
await p.getByTestId('SOC-review-confirm').click(); await p.waitForTimeout(800);
await p.getByTestId('SOC-simulate').click(); await p.waitForTimeout(500); await shot('accept-11-social-publish-dialog-1440');
const publishText=await p.getByTestId('SOC-publish-dialog').innerText();
await p.getByTestId('SOC-publish-confirm').click(); await p.waitForTimeout(1600); await shot('accept-12-social-published-1440');
const href=await p.getByTestId('SOC-view-post').getAttribute('href');
await p.getByTestId('SOC-view-post').click(); await p.waitForTimeout(800); await shot('accept-13-social-post-detail-1440');
const detailCaption=await p.getByTestId('social-snapshot-caption').innerText();
await p.reload({waitUntil:'load'}); await p.waitForTimeout(700);
const detailCaptionAfterReload=await p.getByTestId('social-snapshot-caption').innerText();
// capture DB snapshot
const db=await p.evaluate(async()=>{const db=await new Promise((res,rej)=>{const r=indexedDB.open('lavish-poc-content-v1');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}); const tx=db.transaction('socialWorkflows','readonly'); const all=await new Promise((res,rej)=>{const r=tx.objectStore('socialWorkflows').getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}); db.close(); return all;});
// deliverables download ZIP and MP4
await p.goto(base+'/deliverables?campaignId=scn-scent-layering.brief.main&scenarioVersion=1.1.0',{waitUntil:'load'}); await p.waitForTimeout(900); await shot('accept-14-deliverables-1440');
await p.getByTestId('deliverables-downloads').locator('summary').first().click(); await p.waitForTimeout(400); await shot('accept-14b-downloads-open-1440');
const zipPath=path.join(dir,'ws-a-1.1.0-en-ar-pack.zip'); const mp4Path=path.join(dir,'ws-provided-final-preview.mp4');
const zipP=p.waitForEvent('download'); await p.getByTestId('DEL-bilingual').click(); const zip=await zipP; await zip.saveAs(zipPath);
await p.waitForTimeout(500);
const mp4P=p.waitForEvent('download'); await p.getByTestId('provided-video-download').click(); const mp4=await mp4P; await mp4.saveAs(mp4Path);
// return radar + atelier
await p.goto(base+'/radar',{waitUntil:'load'}); await p.waitForTimeout(700); await shot('accept-15-radar-1440');
await p.goto(base+'/atelier?campaignId=scn-scent-layering.brief.main&language=en',{waitUntil:'load'}); await p.waitForTimeout(900); await shot('accept-16-atelier-1440');
await p.goto(base+'/library?campaignId=scn-scent-layering.brief.main&scenarioVersion=1.1.0&language=en',{waitUntil:'load'}); await p.waitForTimeout(800); await shot('accept-17-library-1440');
await p.setViewportSize({width:1366,height:768});
await p.goto(base+'/radar?campaignId=scn-scent-layering.brief.main&scenarioVersion=1.1.0',{waitUntil:'load'}); await p.waitForTimeout(600); await shot('accept-18-radar-1366');
await p.goto(base+'/atelier?campaignId=scn-scent-layering.brief.main&scenarioVersion=1.1.0&language=en',{waitUntil:'load'}); await p.waitForTimeout(700); await shot('accept-19-atelier-1366');
await p.goto(base+'/deliverables?campaignId=scn-scent-layering.brief.main&scenarioVersion=1.1.0',{waitUntil:'load'}); await p.waitForTimeout(700); await shot('accept-20-deliverables-1366');
await p.setViewportSize({width:1440,height:900});
await p.goto(base+'/deliverables?campaignId=scn-scent-layering.brief.main&scenarioVersion=1.1.0&language=ar',{waitUntil:'load'}); await p.waitForTimeout(700); await p.getByTestId('SOC-language-ar').click(); await p.waitForTimeout(300); await shot('accept-21-deliverables-ar-1440');
const out={checkedAt:new Date().toISOString(),base,steps,media,enShots,why,original,caption,reviewText,publishText,href,detailCaption,detailCaptionAfterReload,downloads:{zipPath,zipBytes:readFileSync(zipPath).byteLength,zipSha256:createHash('sha256').update(readFileSync(zipPath)).digest('hex'),mp4Path,mp4Bytes:readFileSync(mp4Path).byteLength,mp4Sha256:createHash('sha256').update(readFileSync(mp4Path)).digest('hex')},socialWorkflows:db,errors};
writeFileSync(dir+'/acceptance-observations.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({steps:steps.length,media,enShots,detailCaption,detailCaptionAfterReload,downloads:out.downloads,errors},null,2));
await b.close();
