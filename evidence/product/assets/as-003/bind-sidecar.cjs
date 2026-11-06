const fs=require('fs');
for (const p of ['design/presentation-assets/scent-layering.json','apps/web/public/presentation-assets/scent-layering.json']) {
  const data=JSON.parse(fs.readFileSync(p,'utf8'));
  data.contentStatus='bound';
  fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n');
  console.log(p, data.contentStatus, data.scenarioVersion);
}
