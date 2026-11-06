import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
let pw;
try {pw=require('playwright')} catch {pw=require(process.env.PLAYWRIGHT_MODULE || 'D:/workspace/SILLAGE/node_modules/playwright')}
const out='evidence/reference'; await mkdir(out,{recursive:true});
const browser=await pw.chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{channel:'msedge'})});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
const report={capturedAt:new Date().toISOString(),browser:browser.version(),sourceHash:createHash('sha256').update(await readFile('reference/LAVISH_LiveVision_RealVideo_Demo.html')).digest('hex'),errors:[],requestsFailed:[],responses:[],views:[],checks:[]};
page.on('pageerror',e=>report.errors.push(e.message));
page.on('requestfailed',r=>report.requestsFailed.push({url:r.url(),error:r.failure()}));
page.on('response',r=>{if(!r.url().endsWith('.mp4'))report.responses.push({url:r.url(),status:r.status()})});
const check=async(name,fn)=>{try{report.checks.push({name,pass:!!(await fn())})}catch(e){report.checks.push({name,pass:false,error:e.message})}};
try {
  await page.goto(process.env.REFERENCE_URL || pathToFileURL(path.resolve('reference/LAVISH_LiveVision_RealVideo_Demo.html')).href,{waitUntil:'load',timeout:60000});
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('.camera-card video').evaluate(async v=>{v.pause();if(v.readyState<2) await new Promise(r=>{v.onloadeddata=r;setTimeout(r,4000)});v.currentTime=2;});
  await page.waitForTimeout(400);
  for(const [width,height] of [[1920,1080],[1440,900],[1366,768],[390,844]]){
    await page.setViewportSize({width,height});
    await page.screenshot({path:`${out}/reference-${width}x${height}.png`,fullPage:true});
    report.views.push(await page.evaluate(()=>{
      const selectors=['.sidebar','.topbar','.content','.headline','.subtitle','.tool-btn','.main-grid','.card','.insight p','.brand-logo img'];
      return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,styles:Object.fromEntries(selectors.map(s=>{const el=document.querySelector(s),c=getComputedStyle(el),r=el.getBoundingClientRect();return[s,{x:r.x,y:r.y,width:r.width,height:r.height,font:c.fontFamily,fontSize:c.fontSize,lineHeight:c.lineHeight,color:c.color,background:c.backgroundColor,gap:c.gap,padding:c.padding,borderRadius:c.borderRadius,grid:c.gridTemplateColumns}]}))};
    }));
  }
  await page.setViewportSize({width:1440,height:900});
  report.media=await page.evaluate(()=>({images:[...document.images].map(i=>({src:i.src,complete:i.complete,width:i.naturalWidth,height:i.naturalHeight,display:getComputedStyle(i).display})),videos:[...document.querySelectorAll('video')].map(v=>({src:v.currentSrc,width:v.videoWidth,height:v.videoHeight,duration:v.duration,readyState:v.readyState,error:v.error?.code||null})),interAvailable:document.fonts.check('14px Inter')}));
  await check('sidebar collapses',async()=>{await page.locator('#sideCollapse').click();return await page.locator('#app').evaluate(e=>e.classList.contains('collapsed'))});
  await page.screenshot({path:`${out}/reference-collapsed.png`});await page.locator('#sideCollapse').click();
  await check('store changes metrics',async()=>{await page.locator('#storeSelect').selectOption('jadaf');return (await page.locator('#metricFoot').innerText())==='1,566'});
  await check('period changes metric',async()=>{const before=await page.locator('#metricFoot').innerText();await page.locator('#periodSelect').selectOption('week');return before!==await page.locator('#metricFoot').innerText()});
  await check('chart switches',async()=>{await page.locator('[data-chart="unique"]').click();return (await page.locator('#chartTotal').innerText())!==(await page.locator('#metricFoot').innerText())});
  await page.locator('#storeSelect').selectOption('ajman');await page.locator('#periodSelect').selectOption('today');
  await page.getByRole('button',{name:'Expand camera'}).click();
  await page.locator('#cameraClone video').evaluate(v=>{v.pause();v.currentTime=2;});await page.waitForTimeout(200);
  await check('modal opens',()=>page.locator('#cameraModal').evaluate(e=>e.classList.contains('open')));
  await page.screenshot({path:`${out}/reference-modal.png`});
  await page.keyboard.press('Escape');
  await check('modal closes via Escape',()=>page.locator('#cameraModal').evaluate(e=>!e.classList.contains('open')));
  await check('navigation works',async()=>{await page.locator('[data-page="insights"]').click();return await page.locator('[data-module="insights"]').isVisible()});
  await page.locator('[data-page="overview"]').click();
  await check('CSV export downloads',async()=>{const d=page.waitForEvent('download');await page.locator('#exportButton').click();const result=await d;await result.saveAs(`${out}/reference-export.csv`);return result.suggestedFilename().endsWith('.csv')});
  const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
  const doc=await cdp.send('DOM.getDocument');const node=await cdp.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'.headline'});
  report.renderedFonts=await cdp.send('CSS.getPlatformFontsForNode',{nodeId:node.nodeId});
} finally {await writeFile(`${out}/capture-report.json`,JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({checks:report.checks,errors:report.errors,renderedFonts:report.renderedFonts,overflow:report.views.map(v=>[v.width,v.scrollWidth])},null,2));if(report.errors.length||report.checks.some(c=>!c.pass))process.exitCode=1;}
