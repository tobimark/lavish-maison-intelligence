import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(),out='evidence/reviews/TASK-006',port=3191;
let log='';
const proc=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(port)],{cwd:path.join(root,'apps/web'),windowsHide:true});
proc.stdout.on('data',b=>log+=b);proc.stderr.on('data',b=>log+=b);
let browser;
const report={checkedAt:new Date().toISOString(),errors:[],requestsFailed:[],styles:{},screenshots:[]};
try {
 const url=`http://127.0.0.1:${port}/design-lab`;
 let ready=false;for(let i=0;i<50;i++){try{const r=await fetch(url);if(r.ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,200))}if(!ready)throw Error(log);
 browser=await chromium.launch({headless:true});report.browser=browser.version();
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('requestfailed',r=>report.requestsFailed.push(r.url()));
 await page.goto(url);await page.evaluate(()=>document.fonts.ready);
 const sample=()=>page.evaluate(()=>{
  const targets={title:'h1',section:'#typography-title',body:'header p:nth-of-type(2)',content:'#content-preview-title + p',sampleTitle:'[data-testid="type-sample-0"]',sampleBody:'[data-testid="type-sample-2"]',sampleLabel:'[data-testid="type-sample-5"]',dedicatedAr:'[data-testid="arabic-sample"]'};
  return Object.fromEntries(Object.entries(targets).map(([name,sel])=>{const e=document.querySelector(sel);if(!e)return[name,null];const s=getComputedStyle(e);return[name,{text:e.textContent,fontFamily:s.fontFamily,fontSize:s.fontSize,letterSpacing:s.letterSpacing,lineHeight:s.lineHeight,dir:s.direction}]}));
 });
 report.styles.en=await sample();
 await page.screenshot({path:`${out}/review-1440-en.png`,fullPage:true});report.screenshots.push(`${out}/review-1440-en.png`);
 await page.getByTestId('lang-ar').click();await page.evaluate(async()=>{await document.fonts.load('400 16px "Noto Sans Arabic"','مرحبا');await document.fonts.ready});await page.waitForTimeout(250);
 report.styles.ar=await sample();
 await page.screenshot({path:`${out}/review-1440-ar.png`,fullPage:true});report.screenshots.push(`${out}/review-1440-ar.png`);
 const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
 const doc=await cdp.send('DOM.getDocument');
 const n=await cdp.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'h1'});
 report.arTitleActualFonts=await cdp.send('CSS.getPlatformFontsForNode',{nodeId:n.nodeId});
 await page.getByTestId('reveal-note').click();report.noteOpens=await page.getByTestId('note-box').isVisible();
 await page.getByTestId('reveal-note').click();report.noteCloses=!(await page.getByTestId('note-box').isVisible());
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:`${out}/review-390-ar.png`,fullPage:true});report.screenshots.push(`${out}/review-390-ar.png`);
 report.mobile=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,titleLetterSpacing:getComputedStyle(document.querySelector('h1')).letterSpacing}));
 const css=await readFile('design/tokens.css','utf8');report.inlineTokensEqualSource=await page.locator('#design-tokens').textContent()===css;
 report.arViolations=Object.entries(report.styles.ar).filter(([name,s])=>s&&name!=='dedicatedAr'&&s.letterSpacing!=='normal'&&parseFloat(s.letterSpacing)!==0).map(([name,s])=>({name,letterSpacing:s.letterSpacing}));
 report.sourceHashes={};
 for(const f of ['apps/web/app/layout.tsx','apps/web/styles/globals.css','apps/web/styles/design-lab.module.css','apps/web/app/design-lab/design-lab-page.tsx','apps/web/tests/theme.spec.ts','design/tokens.css'])report.sourceHashes[f]=createHash('sha256').update(await readFile(f)).digest('hex');
}finally{
 if(browser)await browser.close();proc.kill();await writeFile(`${out}/browser-probe.json`,JSON.stringify(report,null,2));await writeFile(`${out}/server.log`,log);console.log(JSON.stringify(report,null,2));
}
