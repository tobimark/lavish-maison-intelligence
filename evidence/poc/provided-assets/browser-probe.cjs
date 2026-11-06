// Independent asset inspection only, not a product page or acceptance test.
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
(async () => {
 const file=path.resolve('assets/provided/scent-layering/1.0.0/final-preview.mp4');
 const size=fs.statSync(file).size;
 const server=http.createServer((req,res)=>{
  if(req.url!=='/final-preview.mp4'){res.writeHead(404);res.end();return;}
  const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
  const start=match?Number(match[1]):0;
  const end=match&&match[2]?Math.min(Number(match[2]),size-1):size-1;
  if(start>=size||start>end){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
  const headers={'Content-Type':'video/mp4','Accept-Ranges':'bytes','Content-Length':end-start+1};
  if(match)headers['Content-Range']=`bytes ${start}-${end}/${size}`;
  res.writeHead(match?206:200,headers);
  fs.createReadStream(file,{start,end}).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const source=`http://127.0.0.1:${server.address().port}/final-preview.mp4`;
 const browser = await chromium.launch({ headless:true });
 const page = await browser.newPage({viewport:{width:1100,height:1000}});
 try {
  await page.setContent(`<html><body style="margin:0;background:#f6f5f2"><video id="v" controls muted playsinline preload="auto" style="display:block;margin:12px auto;max-height:900px;max-width:100%;object-fit:contain" src="${source}"></video></body></html>`);
  const meta=await page.evaluate(async()=>{
   const v=document.getElementById('v');
   await new Promise((resolve,reject)=>{if(v.readyState>=2)return resolve();v.addEventListener('loadeddata',resolve,{once:true});v.addEventListener('error',()=>reject(Error('video decode error')),{once:true});});
   return {durationSeconds:v.duration,width:v.videoWidth,height:v.videoHeight,readyState:v.readyState};
  });
  await page.evaluate(()=>document.getElementById('v').play());
  await page.waitForTimeout(1600);
  const playback=await page.evaluate(()=>{const v=document.getElementById('v');v.pause();return {currentTime:v.currentTime,error:v.error?.code??null};});
  if(playback.currentTime<0.5||playback.error)throw Error('Playback did not advance');
  const seek=await page.evaluate(async()=>{const v=document.getElementById('v');v.currentTime=v.duration*0.75;await new Promise(r=>v.addEventListener('seeked',r,{once:true}));return v.currentTime;});
  if(Math.abs(seek-meta.durationSeconds*0.75)>0.15)throw Error('Seek did not reach the target');
  await page.screenshot({path:path.join(__dirname,'provided-video-browser.png'),animations:'disabled'});
  const report={scope:'provided_asset_only',originalUnchanged:true,fixture:'local HTTP byte-range support',metadata:meta,mutedPlayback:playback,seekSeconds:seek,result:'pass',note:'No product page integrated; not original 15-second scenario L5 acceptance. Audio present in container; no audio listening/rights claim.'};
  fs.writeFileSync(path.join(__dirname,'browser-probe.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
