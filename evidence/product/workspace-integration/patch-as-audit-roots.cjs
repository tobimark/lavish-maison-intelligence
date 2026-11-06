const fs=require('fs');
let p='apps/web/tests/product-as-audit.spec.ts'; let s=fs.readFileSync(p,'utf8');
s=s.replace("  : path.resolve(process.cwd(), 'evidence', 'product', 'as-006', 'interaction-audit.json');","  : path.resolve(process.cwd(), 'evidence', 'product', 'workspace-integration', 'ws-004', 'as-audit', 'interaction-audit.json');");
fs.writeFileSync(p,s);
p='apps/web/tests/product-matrix-dom.spec.ts'; s=fs.readFileSync(p,'utf8');
s=s.replace("  : path.join(ROOT, 'evidence', 'product', 'ip-009');","  : path.join(ROOT, 'evidence', 'product', 'workspace-integration', 'ws-004', 'matrix');");
fs.writeFileSync(p,s);
console.log('patched AS audit defaults');
