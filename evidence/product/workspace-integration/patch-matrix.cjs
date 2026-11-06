const fs=require('fs'); const p='docs/INTERACTION_AUDIT_MATRIX.csv'; let lines=fs.readFileSync(p,'utf8').trim().split(/\r?\n/);
const notes={
  'FLOW-stage-insight':'DEPRECATED (old Journey tab) → replacement NAV-radar / Radar current-case',
  'FLOW-stage-strategy':'DEPRECATED (old Journey tab) → replacement NAV-opportunities / Opportunities strategy',
  'FLOW-stage-creative':'DEPRECATED (old Journey tab) → replacement NAV-atelier / Atelier creative',
  'FLOW-stage-social':'DEPRECATED (old Journey tab) → replacement NAV-deliverables / Deliverables social',
  'OV-explore':'DEPRECATED (old Overview CTA) → replacement OV-explore-journey / NAV-radar',
  'OV-creative':'DEPRECATED (old Overview CTA) → replacement NAV-atelier / OV-journey-creative',
};
for (let i=1;i<lines.length;i++) {
  const cells=lines[i].split(',');
  const id=cells[0];
  if (notes[id]) cells[3]=notes[id]+'; '+cells[3];
  lines[i]=cells.join(',');
}
fs.writeFileSync(p,lines.join('\n')+'\n'); console.log('marked deprecated rows');
