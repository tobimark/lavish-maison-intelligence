import { writeFileSync, mkdirSync } from 'node:fs';
const base='http://127.0.0.1:3000';
const assets=[
 ['provided.scent-layering.hero-serenity','/provided-assets/scent-layering/1.0.0/hero-serenity.png'],
 ['provided.scent-layering.product-serenity','/provided-assets/scent-layering/1.0.0/product-serenity.png'],
 ['provided.scent-layering.final-preview','/provided-assets/scent-layering/1.0.0/final-preview.mp4'],
];
const out=[];
for (const [id, uri] of assets) {
  const res=await fetch(base+uri); const buf=Buffer.from(await res.arrayBuffer());
  const range=await fetch(base+uri,{headers:{Range:'bytes=0-31'}}); const rangeBuf=Buffer.from(await range.arrayBuffer());
  const { createHash }=await import('node:crypto');
  out.push({id,uri,status:res.status,mimeType:res.headers.get('content-type'),bytes:buf.length,sha256:createHash('sha256').update(buf).digest('hex'),rangeStatus:range.status,rangeBytes:rangeBuf.length,acceptRanges:range.headers.get('accept-ranges'),contentRange:range.headers.get('content-range')});
}
mkdirSync('evidence/product/assets/as-001',{recursive:true});
writeFileSync('evidence/product/assets/as-001/next-http-check.json', JSON.stringify({checkedAt:new Date().toISOString(),base,assets:out},null,2)+'\n');
console.log(JSON.stringify(out,null,2));
