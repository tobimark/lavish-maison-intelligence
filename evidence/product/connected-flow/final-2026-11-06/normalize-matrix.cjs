const fs=require('fs'); const p='docs/INTERACTION_AUDIT_MATRIX.csv'; let lines=fs.readFileSync(p,'utf8').trim().split(/\r?\n/);
const start=lines.length-36;
for(let i=start;i<lines.length;i++){
  const cells=[]; let s=lines[i]; let cur=''; let inQ=false;
  for(let j=0;j<s.length;j++){const ch=s[j]; if(ch==='"'){ if(inQ && s[j+1]==='"'){cur+='"';j++;} else inQ=!inQ; } else if(ch===',' && !inQ){cells.push(cur);cur='';} else cur+=ch;}
  cells.push(cur);
  if(cells.length!==8) throw new Error('cols '+cells.length+' line '+i);
  lines[i]=cells.join(',');
}
fs.writeFileSync(p,lines.join('\n')+'\n'); console.log('normalized',start,'to',lines.length-1);
