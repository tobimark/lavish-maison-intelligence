const fs=require('fs');
const p='docs/INTERACTION_AUDIT_MATRIX.csv';
let s=fs.readFileSync(p,'utf8');
const reps=[
 ['AS-IDENTITY-OPEN,Atelier/Library,Product original','AS-IDENTITY-OPEN,Overview/Library,Product original'],
 ['AS-HERO-PREVIEW,Library,Hero image','AS-HERO-PREVIEW,Overview/Library,Hero image'],
 ['AS-VIDEO-TAB,Atelier,Final Video Preview','AS-VIDEO-TAB,Overview (preview dialog)/Atelier,Final Video Preview'],
 ['AS-VIDEO-PLAY,Atelier/Library,Play / Pause (native)','AS-VIDEO-PLAY,Overview (preview dialog)/Atelier/Library,Play / Pause (native)'],
 ['AS-VIDEO-SEEK,Atelier/Library,Video timeline (native)','AS-VIDEO-SEEK,Overview (preview dialog)/Atelier/Library,Video timeline (native)'],
 ['AS-VIDEO-REPLAY,Atelier/Library,Replay (native)','AS-VIDEO-REPLAY,Overview (preview dialog)/Atelier/Library,Replay (native)'],
 ['AS-VIDEO-AUDIO,Atelier/Library,Mute / Volume (native)','AS-VIDEO-AUDIO,Overview (preview dialog)/Atelier/Library,Mute / Volume (native)'],
 ['AS-VIDEO-ERROR,Atelier/Library,Retry video','AS-VIDEO-ERROR,Overview (preview dialog)/Atelier/Library,Retry video'],
];
for (const [a,b] of reps) { if (!s.includes(a)) console.log('MISS',a.slice(0,30)); s=s.split(a).join(b); }
fs.writeFileSync(p,s);
console.log('rows', (s.trim().split(/\r?\n/).length-1));
