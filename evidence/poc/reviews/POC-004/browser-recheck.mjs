import {createServer} from 'vite';
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
const source=readFileSync('evidence/poc/storage/fix-01/smoke.mjs','utf8').replace('evidence/poc/storage/fix-01/browser-smoke.json','evidence/poc/reviews/POC-004/browser-recheck.json');
writeFileSync('evidence/poc/reviews/POC-004/browser-recheck-child.mjs',source);
const server=await createServer({server:{host:'127.0.0.1',port:5182,strictPort:true},logLevel:'error'});
try{
 await server.listen();
 const code=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,['evidence/poc/reviews/POC-004/browser-recheck-child.mjs'],{env:{...process.env,QA_URL:'http://127.0.0.1:5182/evidence/poc/storage/fix-01/qa.html'},stdio:'inherit',windowsHide:true});p.on('error',reject);p.on('exit',resolve)});
 if(code!==0)process.exitCode=1;
}finally{await server.close()}
