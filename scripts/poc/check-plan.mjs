// Planning integrity checks, NOT a JSON Schema validator or scenario/visual acceptance.
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const failures=[], checks=[];
const check=(label,ok)=>(ok?checks:failures).push(label);
const json=async path=>JSON.parse((await readFile(path,'utf8')).replace(/^\uFEFF/,''));
const schema=await json('contracts/poc/scenario.schema.json');
const defs=schema.$defs;
let refs=0;
function walk(value) {
  if (!value || typeof value!=='object') return;
  if (value.$ref) {
    refs++;
    check(`Local ref resolves: ${value.$ref}`,value.$ref.startsWith('#/$defs/') && !!defs[value.$ref.slice('#/$defs/'.length)]);
  }
  if (value.type==='object') {
    check('Closed object shape',value.additionalProperties===false);
    check('Required names declared',value.required.every(k=>k in value.properties));
  }
  for(const v of Object.values(value)) walk(v);
}
walk(schema);
const files=await readdir('contracts/poc/files');
check('Exactly ten file schemas',files.length===10);
for (const file of files) {
  const value=await json(`contracts/poc/files/${file}`), name=file.replace('.schema.json','');
  check(`File schema ${name} resolves`,value.$ref===schema.$id+'#/$defs/'+name && !!defs[name]);
}
check('Exactly ten bundle files',schema.required.length===10);
check('Nine hash-pinned files excluding manifest',defs.manifest.properties.files.minItems===9 && defs.manifest.properties.files.maxItems===9);
check('Four fixed stages in order',defs.manifest.properties.stages.prefixItems.map(s=>s.const).join(',')==='discovery,analysis,video,delivery');
const eventKeys=new Set();
for(const event of defs.event.oneOf){
  const key=event.properties.type.const+':'+event.properties.stage.const;
  check(`Unique event discriminator ${key}`,!eventKeys.has(key));eventKeys.add(key);
  check(`Event explicitly Mock ${key}`,event.properties.mode.const==='mock');
}
const registry=await json('tasks/registry.json'), map=new Map(registry.tasks.map(t=>[t.id,t]));
const visited=new Set(), visiting=new Set();
function visit(id){
  if(visited.has(id))return;
  if(visiting.has(id))throw Error(`Cycle ${id}`);
  if(!map.has(id))throw Error(`Missing task ${id}`);
  visiting.add(id);map.get(id).dependencies.forEach(visit);visiting.delete(id);visited.add(id);
}
registry.tasks.forEach(t=>visit(t.id));
check('Task IDs unique',map.size===registry.tasks.length);
check('Scope updated',registry.scope==='fully_mocked_poc');
const poc=registry.tasks.filter(t=>t.id.startsWith('POC-'));
check('Sixteen atomic POC task packages',poc.length===16);
const headings=['Task ID','Title','Goal','Dependencies','Context','Files','Implementation Requirements','Visual Specification','Data & API Contract','Constraints','Acceptance Criteria','Test Commands','Expected Deliverables','Failure Conditions','Definition of Done','DeepSeek Execution Prompt'];
for(const t of poc){const text=await readFile(t.spec,'utf8');check(`${t.id} delivery fields`,headings.every(h=>text.includes('### '+h)));}
check('No DSH dispatch claimed',registry.dispatched===false);
check('Old content generation task frozen',map.get('TASK-005').status==='deferred');
check('Old business page tasks frozen',[8,9,10,11,12,13,14].every(n=>map.get(`TASK-${String(n).padStart(3,'0')}`).status==='deferred'));
check('Theme acceptance retained',map.get('TASK-006').status==='accepted');
check('Shell not automatically accepted',map.get('TASK-007').status==='review');
const catalog=await json('scenarios/catalog.json');
check('Three distinct scenarios',catalog.items.length===3&&new Set(catalog.items.map(i=>i.scenarioId)).size===3);
check('No invented ready scenario',catalog.items.every(i=>i.readiness==='awaiting_content'&&i.scenarioVersion===null&&i.packagePath===null));
const tokens=await readFile('design/tokens.css');
check('Accepted tokens unchanged',createHash('sha256').update(tokens).digest('hex')==='07f8b08de74dde44ecdb6dad8b0d107233f394085d7aed3405b619aad5c01814');
const gate=await json('tasks/gates.json');
check('M1 not accepted',gate.M1.status==='in_progress');
const report={checkedAt:new Date().toISOString(),scope:'Planning structure, references, task DAG and preserved theme hash only',passed:checks.length,failures,schemaDefinitions:Object.keys(defs).length,schemaReferences:refs,pocTasks:poc.length,notRun:['Standard JSON Schema metaschema/validator execution (POC-001)','Scenario content/typed reference/media validation: complete packages not supplied','Mock API/state/replay product tests: implementation pending','Current POC browser visual acceptance: implementation pending']};
await mkdir('evidence/poc',{recursive:true});
await writeFile('evidence/poc/plan-validation.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(failures.length)process.exitCode=1;
