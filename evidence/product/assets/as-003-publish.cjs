const fs=require('fs');
const catalogPath='apps/web/public/content-scenarios/catalog.json';
const manifest=JSON.parse(fs.readFileSync('scenarios/scent-layering/1.1.0/manifest.json','utf8'));
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
const HASH='709abfdeb11f28a316ca6709c751f21cbcabdcb7cf30e4756418d9d8f46f854d';
const entry={
  scenarioId:'scn-scent-layering',
  title:manifest.title,
  scenarioVersion:'1.1.0',
  packageHash:HASH,
  packagePath:'/content-scenarios/scent-layering/1.1.0',
  profile:'content_only',
  readiness:'content_ready',
  mediaStatus:'deferred',
  reviewRef:'docs/reviews/SERENITY-A-1.1.0-CONTENT-INTAKE.md'
};
catalog.items=[entry,...catalog.items.filter(i=>!(i.scenarioId==='scn-scent-layering'&&i.scenarioVersion==='1.1.0'))];
fs.writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n');
const versionIndex={
  schemaVersion:'1.0.0',
  scenarioId:'scn-scent-layering',
  defaultVersion:'1.1.0',
  versions:[
    {scenarioVersion:'1.1.0',packageHash:HASH,packagePath:'/content-scenarios/scent-layering/1.1.0',status:'current',explicitOnly:false,reviewRef:'docs/reviews/SERENITY-A-1.1.0-CONTENT-INTAKE.md'},
    {scenarioVersion:'1.0.0',packageHash:catalog.items.find(i=>i.scenarioId==='scn-scent-layering'&&i.scenarioVersion==='1.0.0').packageHash,packagePath:'/content-scenarios/scent-layering/1.0.0',status:'historical',explicitOnly:true,note:'OUD/PERLA history retained; old sessions/exports are not relabelled.'}
  ]
};
fs.writeFileSync('apps/web/public/content-scenarios/version-index.json',JSON.stringify(versionIndex,null,2)+'\n');
fs.writeFileSync('scenarios/scent-layering/1.1.0/version-index.json',JSON.stringify(versionIndex,null,2)+'\n');
console.log(JSON.stringify(catalog.items.map(i=>({v:i.scenarioVersion,h:i.packageHash})),null,2));
