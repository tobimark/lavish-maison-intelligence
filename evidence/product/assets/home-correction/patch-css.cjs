const fs=require('fs');
let p='apps/web/components/product/shared/ProvidedAssets.tsx';
let s=fs.readFileSync(p,'utf8');
s=s.replace(/\s*<p className=\{styles\.eyebrow\}>Featured creative concept<\/p>\r?\n\s*<h2/,'\n          <h2');
fs.writeFileSync(p,s);
p='apps/web/components/product/shared/provided.module.css';
s=fs.readFileSync(p,'utf8');
const reps=[
 ['.homeConcept {\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n  padding: 24px;','.homeConcept {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n  padding: 20px;'],
 ['.homeConceptHeader {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 12px 24px;\n}','.homeConceptHeader {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 6px 24px;\n}'],
 ['  font-size: 28px;\n  line-height: 1.15;','  font-size: 26px;\n  line-height: 1.15;'],
 ['  font-size: 16px;\n  line-height: 1.4;','  font-size: 15px;\n  line-height: 1.4;'],
 ['.homeConceptNote {\n  margin: 6px 0 0;','.homeConceptNote {\n  margin: 4px 0 0;'],
 ['.homeConceptPending {\n  margin: 6px 0 0;','.homeConceptPending {\n  margin: 4px 0 0;'],
 ['  gap: 10px;\n  min-width: 0;\n  margin: 0;\n  padding: 14px;','  gap: 8px;\n  min-width: 0;\n  margin: 0;\n  padding: 12px;'],
 ['  align-items: baseline;\n  gap: 8px;\n  min-height: 22px;','  align-items: baseline;\n  gap: 8px;\n  min-height: 20px;'],
];
for (const [a,b] of reps) { if (!s.includes(a)) console.log('MISS', JSON.stringify(a.slice(0,40))); s=s.split(a).join(b); }
fs.writeFileSync(p,s);
console.log('done');
