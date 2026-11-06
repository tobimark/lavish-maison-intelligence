const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
function check(baselinePath, dir) {
  const baseline=JSON.parse(fs.readFileSync(baselinePath,'utf8')).files;
  const changed=[]; const entries=[];
  for (const b of baseline) {
    const p=path.join(dir,b.name);
    if (!fs.existsSync(p)) { changed.push(b.name); continue; }
    const bytes=fs.statSync(p).size;
    const sha=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
    const mtime=fs.statSync(p).mtime.toISOString();
    const ok=sha===b.sha256 && bytes===b.bytes && Math.abs(new Date(mtime)-new Date(b.mtime))<1000;
    entries.push({name:b.name, bytes, sha256:sha, mtime, hashMatches:sha===b.sha256, sizeMatches:bytes===b.bytes, mtimeMatches:Math.abs(new Date(mtime)-new Date(b.mtime))<1000});
    if (!ok) changed.push(b.name);
  }
  return {dir, checked:baseline.length, unchanged:changed.length===0, changed, entries};
}
const out={
  checkedAt:new Date().toISOString(),
  note:'Historical evidence immutability check after HOME-FIX-02. Hash+size+mtime compared to FIX-01 baselines.',
  m1Shell: check('evidence/product/ip-009/evidence-incident/m1-shell-baseline-before-rerun.json','evidence/m1/shell'),
  pocPrototype: check('evidence/product/ip-009/evidence-incident/poc-prototype-restored-baseline-before-rerun.json','evidence/poc/prototype'),
};
fs.writeFileSync('evidence/product/assets/home-correction/old-evidence-unchanged.json', JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({m1:{checked:out.m1Shell.checked,unchanged:out.m1Shell.unchanged,changed:out.m1Shell.changed}, prototype:{checked:out.pocPrototype.checked,unchanged:out.pocPrototype.unchanged,changed:out.pocPrototype.changed}},null,2));
