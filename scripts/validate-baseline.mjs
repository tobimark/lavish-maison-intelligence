import {readFile,readdir,stat,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=process.cwd(),failures=[],checks=[];
const check=(name,ok)=>{(ok?checks:failures).push(name)};
const read=p=>readFile(p,'utf8'),json=async p=>JSON.parse(await read(p));
const manifest=await json('reference/manifest.json');
for(const f of manifest.files){const b=await readFile(f.path);check(`Reference intact: ${f.path}`,b.length===f.bytes&&createHash('sha256').update(b).digest('hex')===f.sha256)}
const report=await json('evidence/reference/capture-report.json');
check('Reference browser actually captured four viewport sizes',report.views.length===4);
check('Reference interaction probes passed',report.checks.length===8&&report.checks.every(c=>c.pass));
check('Reference page has no JS errors',report.errors.length===0);
check('Mobile defect is recorded, not hidden',report.views.some(v=>v.width===390&&v.scrollWidth>v.width));
const {tasks}=await json('tasks/registry.json'),map=new Map(tasks.map(t=>[t.id,t]));
check('Task IDs unique',map.size===tasks.length);
const visiting=new Set(),done=new Set();
function visit(t){if(done.has(t.id))return;if(visiting.has(t.id))throw Error('Task dependency cycle: '+t.id);visiting.add(t.id);for(const dep of t.dependencies){if(!map.has(dep))throw Error('Missing dependency '+dep);visit(map.get(dep))}visiting.delete(t.id);done.add(t.id)}
for(const t of tasks)visit(t);check('Task graph acyclic and references resolve',true);
const headings=['Task ID','Title','Goal','Dependencies','Context','Files','Implementation Requirements','Visual Specification','Data & API Contract','Constraints','Acceptance Criteria','Test Commands','Expected Deliverables','Failure Conditions','Definition of Done','DeepSeek Execution Prompt'];
for(const t of tasks){if(t.spec){const s=await read(t.spec);check(`${t.id} all delivery fields`,headings.every(h=>s.includes('### '+h)));if(t.milestone==='M1')check(`${t.id} cites design system`,s.includes('docs/DESIGN_SYSTEM.md'))}else check(`${t.id} remains locked`,['locked','deferred'].includes(t.status))}
const gate=await json('tasks/gates.json');check('M1 not falsely accepted',['not_started','in_progress'].includes(gate.M1.status)&&gate.laterBusinessImplementation==='locked_until_M1_accepted');
const api=await json('contracts/openapi.json'),ids=[];
const walk=(value)=>{if(!value||typeof value!=='object')return;if(value.$ref){const parts=value.$ref.replace(/^#\//,'').split('/');let v=api;for(const p of parts)v=v?.[p];check(`Schema reference ${value.$ref}`,!!v)}Object.values(value).forEach(walk)};walk(api);
for(const [p,methods]of Object.entries(api.paths))for(const op of Object.values(methods)){ids.push(op.operationId);const params=[...p.matchAll(/\{(\w+)\}/g)].map(m=>m[1]);check(`${op.operationId} path params`,params.every(name=>op.parameters.some(x=>x.in==='path'&&x.name===name&&x.required)));check(`${op.operationId} error contract`,!!op.responses['409']&&!!op.responses['422'])}
check('API operation IDs unique',new Set(ids).size===ids.length);
const css=await read('design/tokens.css');
for(const [token,value]of Object.entries({'brand-black':'#191917','brand-gold':'#B89A61','canvas':'#F6F5F2','surface':'#FFFEFC','line':'#E8E5DF'}))check(`HTML-derived token ${token}`,css.includes(`--${token}: ${value}`));
const luminance=hex=>{const c=hex.replace('#','').match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722};
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const contrasts=[];
for(const [name,fg,bg]of [['body','#252521','#FFFEFC'],['secondary','#56564E','#FFFEFC'],['meta','#6B6961','#F6F5F2'],['gold text','#816333','#F5EFE3'],['danger text','#A84A40','#FBEFEA'],['info text','#35617D','#FFFEFC'],['success text','#1F7765','#E8F4EF']]){const ratio=contrast(fg,bg);contrasts.push({name,ratio});check(`Readable ${name}`,ratio>=4.5)}
async function mdFiles(dir){const result=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())result.push(...await mdFiles(p));else if(e.name.endsWith('.md'))result.push(p)}return result}
for(const f of ['README.md',...await mdFiles('docs'),...await mdFiles('tasks')]){const s=await read(f);for(const match of s.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)){const href=match[1];if(/^(https?:|#)/.test(href))continue;const target=path.resolve(path.dirname(f),href.split('#')[0]);let exists=false;try{const info=await stat(target);exists=info.isFile()||info.isDirectory()}catch{}check(`Document link ${f} -> ${href}`,exists)}}
const result={checkedAt:new Date().toISOString(),scope:'Planning integrity and reference evidence only; not product tests or M1 visual acceptance',passed:checks.length,failures,contrasts,tasks:tasks.length,openapiPaths:Object.keys(api.paths).length};
await writeFile('evidence/baseline-validation.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(failures.length)process.exitCode=1;
