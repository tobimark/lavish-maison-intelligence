import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
const root = path.resolve('reference');
const types = {'.html':'text/html; charset=utf-8','.mp4':'video/mp4','.png':'image/png','.css':'text/css'};
http.createServer(async (req,res)=>{
  try {
    const url = new URL(req.url,'http://localhost');
    const file = path.resolve(root,'.'+decodeURIComponent(url.pathname === '/' ? '/LAVISH_LiveVision_RealVideo_Demo.html' : url.pathname));
    if (!file.startsWith(root+path.sep)) {res.writeHead(403).end();return;}
    const s = await stat(file);
    const headers = {'Content-Type':types[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes'};
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if(range) {
      const start=+range[1],end=Math.min(range[2]?+range[2]:s.size-1,s.size-1);
      if(start>end){res.writeHead(416).end();return;}
      res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${s.size}`,'Content-Length':end-start+1});
      createReadStream(file,{start,end}).pipe(res);
    } else {res.writeHead(200,{...headers,'Content-Length':s.size});res.end(await readFile(file));}
  } catch {res.writeHead(404).end('Not found');}
}).listen(4187,'127.0.0.1',()=>console.log('Reference: http://127.0.0.1:4187'));
