import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {parseFfprobeJson,parseVtt} from '../../../../scripts/poc/verify-media.mjs';
const root=process.cwd(),source=readFileSync('scripts/poc/verify-media.mjs','utf8');
const fn=source.slice(source.indexOf('async function videoMetadata('),source.indexOf('\nfunction extMime('));
const videoMetadata=Function(`return (${fn})`)();
const video=readFileSync('tests/fixtures/poc/media/good-1080x1920-15s.mp4');
const image=readFileSync('tests/fixtures/poc/media/poster-1080x1920.png');
let secondaryRequests=0;
const secondary=createServer((req,res)=>{secondaryRequests++;res.writeHead(200,{'Content-Type':'image/png'});res.end(image)});
const listen=s=>new Promise(resolve=>s.listen(0,'127.0.0.1',()=>resolve(`http://127.0.0.1:${s.address().port}`)));
const secondaryUrl=await listen(secondary);
const server=createServer((req,res)=>{
 if(req.url.endsWith('redirect.png')){res.writeHead(302,{Location:secondaryUrl+'/poster.png'});res.end();return}
 if(req.url.endsWith('.mp4')){
  const range=/bytes=(\d+)-(\d*)/.exec(req.headers.range||'');
  if(range){const start=Number(range[1]),end=range[2]?Number(range[2]):video.length-1;res.writeHead(206,{'Content-Type':'video/mp4','Content-Range':`bytes ${start}-${end}/${video.length}`,'Content-Length':end-start+1,'Accept-Ranges':'bytes'});res.end(video.subarray(start,end+1));return}
  res.writeHead(200,{'Content-Type':'video/mp4','Content-Length':video.length,'Accept-Ranges':'bytes'});res.end(video);return;
 }
 res.writeHead(200,{'Content-Type':'text/html'});res.end('<html><body>TEST_ONLY independent probe</body></html>');
});
const baseUrl=await listen(server);
const temp=mkdtempSync(path.join(tmpdir(),'poc002-main-'));
let browser;
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage();await page.goto(baseUrl);
 // Disable actual playback while retaining real metadata and seeking.
 await page.evaluate(()=>{HTMLMediaElement.prototype.play=function(){return Promise.resolve()}});
 const playback=await videoMetadata(page,baseUrl+'/test.mp4',15000,[2000,5000,9000,14500]);
 const uri='/scenario-media/scent-layering/1.0.0/redirect.png';
 const asset={id:'scn-scent-layering.asset.poster',kind:'poster',mimeType:'image/png',uri,bytes:image.length,sha256:createHash('sha256').update(image).digest('hex'),width:1080,height:1920,durationMs:null};
 writeFileSync(path.join(temp,'manifest.json'),JSON.stringify({scenarioId:'scn-scent-layering',scenarioVersion:'1.0.0'}));
 writeFileSync(path.join(temp,'assets.json'),JSON.stringify({data:{assets:[asset]}}));
 const reportPath=path.join(temp,'report.json');
 const cli=await new Promise(resolve=>{
  const p=spawn(process.execPath,['scripts/poc/verify-media.mjs','--dir',temp,'--base-url',baseUrl,'--report',reportPath],{cwd:root,windowsHide:true});
  let stderr='';p.stderr.on('data',b=>stderr+=b);p.on('close',exit=>resolve({exit,stderr}));
 });
 const report=JSON.parse(readFileSync(reportPath,'utf8'));
 const incompleteProbe=parseFfprobeJson({streams:[{codec_type:'video',codec_name:'h264',pix_fmt:'yuv420p',width:1080,height:1920}],format:{}},{width:1080,height:1920,durationMs:15000});
 const result={scope:'TEST_ONLY independent code probes; no customer video acceptance',playbackDisabledButReportedPlayed:playback.played,playbackMetadata:playback,crossPortRedirect:{baseUrl,secondaryUrl,secondaryRequests,cli,errors:report.errors,media:report.media},ffprobeMissingDurationIssues:incompleteProbe,vttParsed:parseVtt('WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nCompletely unrelated text\n',15000)};
 writeFileSync('evidence/poc/reviews/POC-002/fix-recheck.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{
 await browser?.close();await Promise.all([new Promise(r=>server.close(r)),new Promise(r=>secondary.close(r))]);
 if(!path.resolve(temp).startsWith(path.resolve(tmpdir())+path.sep)||!path.basename(temp).startsWith('poc002-main-'))throw Error('Unsafe cleanup');
 rmSync(temp,{recursive:true,force:true});
}
