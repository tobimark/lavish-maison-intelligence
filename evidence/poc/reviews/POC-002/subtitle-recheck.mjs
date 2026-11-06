import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
const root=process.cwd(), temp=mkdtempSync(path.join(tmpdir(),'poc002-vtt-review-'));
const text='WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nExpected\n\n00:01.000 --> 00:02.000\nUnexpected extra cue\n';
const bytes=Buffer.from(text),hash=createHash('sha256').update(bytes).digest('hex');
const server=createServer((req,res)=>{if(req.url.endsWith('.vtt')){res.writeHead(200,{'Content-Type':'text/vtt'});res.end(bytes)}else{res.writeHead(200,{'Content-Type':'text/html'});res.end('<body>TEST_ONLY subtitle review</body>')}});
const base=await new Promise(r=>server.listen(0,'127.0.0.1',()=>r(`http://127.0.0.1:${server.address().port}`)));
try{
 const save=(name,data)=>writeFileSync(path.join(temp,name),JSON.stringify(data));
 save('manifest.json',{scenarioId:'scn-scent-layering',scenarioVersion:'1.0.0'});
 save('assets.json',{data:{assets:[{id:'scn-scent-layering.asset.sub',kind:'subtitle',mimeType:'text/vtt',uri:'/scenario-media/scent-layering/1.0.0/review.vtt',bytes:bytes.length,sha256:hash}]}});
 save('video.json',{data:{videos:[{scriptVersionId:'scn-scent-layering.script.en',subtitleAssetIds:['scn-scent-layering.asset.sub'],durationMs:15000}]}});
 save('script.json',{data:{versions:[{id:'scn-scent-layering.script.en',language:'en',durationMs:15000,subtitles:[{startMs:0,endMs:1000,text:'Expected'}]}]}});
 const out=path.join(temp,'report.json');
 const result=await new Promise(resolve=>{const p=spawn(process.execPath,['scripts/poc/verify-media.mjs','--dir',temp,'--base-url',base,'--report',out],{cwd:root,windowsHide:true});let stderr='';p.stderr.on('data',b=>stderr+=b);p.on('close',exit=>resolve({exit,stderr}))});
 const evidence={scope:'TEST_ONLY independent subtitle CLI probe, not a customer package',inputVtt:text,scriptExpectedCueCount:1,result,report:JSON.parse(readFileSync(out,'utf8'))};
 writeFileSync('evidence/poc/reviews/POC-002/subtitle-recheck.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
}finally{await new Promise(r=>server.close(r));if(!path.resolve(temp).startsWith(path.resolve(tmpdir())+path.sep)||!path.basename(temp).startsWith('poc002-vtt-review-'))throw Error('Unsafe cleanup');rmSync(temp,{recursive:true,force:true})}
