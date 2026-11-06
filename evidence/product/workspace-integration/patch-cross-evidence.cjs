const fs=require('fs'); const p='apps/web/tests/product-cross-page.spec.ts'; let s=fs.readFileSync(p,'utf8');
if(!s.includes('const EVIDENCE =')) s=s.replace("const DB_NAME = 'lavish-poc-content-v1';","const DB_NAME = 'lavish-poc-content-v1';\nconst EVIDENCE = process.env.EVIDENCE_ROOT\n  ? path.resolve(process.env.EVIDENCE_ROOT)\n  : path.resolve(process.cwd(), 'evidence', 'product', 'workspace-integration', 'ws-004', 'cross-page');");
s=s.replace(/path\.join\('evidence', 'product', 'ip-009', ([^)]*)\)/g, 'path.join(EVIDENCE, $1)');
fs.writeFileSync(p,s); console.log('patched cross-page evidence');
