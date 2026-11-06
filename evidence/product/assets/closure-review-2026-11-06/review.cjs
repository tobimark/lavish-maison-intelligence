const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs'); const path=require('node:path');
(async()=>{
 const dir=path.resolve('evidence/product/assets/closure-review-2026-11-06');
 const {spawn}=require('node:child_process');
 const server=spawn(process.execPath,[path.resolve('node_modules/next/dist/bin/next'),'start','apps/web','-p','3163'],{windowsHide:true,stdio:'ignore'});
 let up=false;for(let i=0;i<40;i++){try{if((await fetch('http://127.0.0.1:3163/design-lab')).ok){up=true;break;}}catch{}await new Promise(r=>setTimeout(r,300));}
 if(!up){server.kill();throw Error('Review server not ready');}
 const browser=await chromium.launch();
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const base='http://127.0.0.1:3163',c='scn-scent-layering.brief.main';
 const report={scope:'AS only; FLOW excluded',buildId:fs.readFileSync('apps/web/.next/BUILD_ID','utf8').trim(),pages:[],errors};
 try {
 await page.goto(`${base}/campaigns/${c}/brief`,{waitUntil:'load'});
 await expect(page.getByRole('heading',{level:1})).toHaveText('SERENITY — A Story in Layers');
 await expect(page.getByTestId('provided-identity')).toBeVisible();
 await expect(page.getByTestId('provided-hero')).toBeVisible();
 const txt=await page.getByTestId('campaign-brief-page').innerText();
 if(/PERLA|LAVISH OUD/.test(txt))throw Error('Old product in new Brief');
 await page.screenshot({path:path.join(dir,'brief-1440.png'),fullPage:true});report.pages.push('brief');
 await page.goto(`${base}/atelier?campaignId=${c}&language=en`,{waitUntil:'load'});
 const video=page.getByTestId('provided-video');await expect(video).toBeVisible();
 await expect.poll(()=>video.evaluate(v=>v.readyState)).toBeGreaterThanOrEqual(2);
 report.media=await video.evaluate(async v=>{await v.play();await new Promise(r=>setTimeout(r,450));v.pause();const advanced=v.currentTime;v.currentTime=7.56;await new Promise(r=>v.addEventListener('seeked',r,{once:true}));return {w:v.videoWidth,h:v.videoHeight,duration:v.duration,advanced,seek:v.currentTime,controls:v.controls,tracks:v.querySelectorAll('track').length,fit:getComputedStyle(v).objectFit,error:v.error?.message??null};});
 if(report.media.w!==720||report.media.h!==960||report.media.advanced<=0||Math.abs(report.media.seek-7.56)>.1||report.media.error)throw Error('Media check failed');
 await page.screenshot({path:path.join(dir,'atelier-en-video-1440.png'),fullPage:true});report.pages.push('atelier-en');
 await page.goto(`${base}/atelier?campaignId=${c}&language=ar`,{waitUntil:'load'});await expect(page.getByTestId('provided-video')).toBeVisible();
 await expect(page.getByText('Loading campaign',{exact:true})).toHaveCount(0);
 await expect(page.getByTestId('atelier-page')).toBeVisible();
 await page.screenshot({path:path.join(dir,'atelier-ar-1440.png'),fullPage:true});report.pages.push('atelier-ar');
 await page.goto(`${base}/library`,{waitUntil:'load'});await expect(page.getByTestId('LIB-provided-section')).toBeVisible();
 for(const kind of ['hero_image','product_original_image','final_preview_video'])await expect(page.getByTestId(`LIB-provided-${kind}`)).toBeVisible();
 await page.getByTestId('LIB-provided-preview-final_preview_video').click();await expect(page.getByRole('dialog')).toBeVisible();
 await page.screenshot({path:path.join(dir,'library-video-1440.png'),fullPage:true});await page.keyboard.press('Escape');report.pages.push('library');
 await page.goto(`${base}/deliverables?campaignId=${c}`,{waitUntil:'load'});await expect(page.getByTestId('DEL-bilingual')).toBeVisible();
 const pending=page.waitForEvent('download');await page.getByTestId('DEL-bilingual').click();const dl=await pending;await dl.saveAs(path.join(dir,'a-en-ar.zip'));report.download=dl.suggestedFilename();
 await page.setViewportSize({width:1366,height:768});await page.screenshot({path:path.join(dir,'deliverables-1366.png'),fullPage:true});report.pages.push('deliverables');
 if(errors.length)throw Error('Page errors');
 report.pass=true;
 }catch(e){report.pass=false;report.failure=String(e);throw e;}
 finally{fs.writeFileSync(path.join(dir,'browser.json'),JSON.stringify(report,null,2));await browser.close();server.kill();}
 console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1});
