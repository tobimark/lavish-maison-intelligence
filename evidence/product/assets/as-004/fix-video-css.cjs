const fs=require('fs');
const p='apps/web/components/product/shared/provided.module.css';
let s=fs.readFileSync(p,'utf8');
const old=`.campaignVideo {
  display: block;
  width: 100%;
  max-height: 340px;
  aspect-ratio: 3 / 4;
  object-fit: contain;
  border-radius: var(--radius-small);
  background: #171714;
}`;
const neu=`.campaignVideo {
  display: block;
  width: auto;
  height: 340px;
  max-width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: contain;
  margin: 0 auto;
  border-radius: var(--radius-small);
  background: #171714;
}`;
if(!s.includes(old)) console.log('MISS video css'); else s=s.replace(old,neu);
fs.writeFileSync(p,s);
console.log('done');
