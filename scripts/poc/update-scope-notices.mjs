// Scope migration: keep historical text and original review evidence intact.
import { readFile, writeFile } from 'node:fs/promises';
const historicalDocs = ['PRD','PRODUCT_SCOPE','ARCHITECTURE','DATA_MODEL','API_CONTRACT','EVENT_PROTOCOL','SCENARIO_SPEC','AGENT_RUNTIME','REPLAY_ENGINE','INTELLIGENCE_WORKFLOW','CREATIVE_WORKFLOW','VIDEO_PIPELINE','TEST_PLAN','DEMO_SCRIPT','DEPLOYMENT','INFORMATION_ARCHITECTURE','UX_SPEC','VISUAL_ACCEPTANCE'];
for (const name of historicalDocs) {
  const file = `docs/${name}.md`, old = await readFile(file,'utf8');
  const notice = '> 2026-11-04 范围更新：当前实施以 [Fully Mocked POC](POC_SCOPE.md) 为准。下文旧业务流程/后端/实时服务要求为历史，不能用于派发；当前数据/API/事件/状态机及验收见新POC文档。设计原则仍有效，具体四步布局见 pages/POC_WORKFLOW.md。本次未重做或撤销历史验收。\n\n';
  if (!old.startsWith('> 2026-11-04 范围更新')) await writeFile(file,notice+old);
}
for (const name of ['HOME','INTELLIGENCE_RADAR','CREATIVE_ATELIER']) {
  const file=`docs/pages/${name}.md`, old=await readFile(file,'utf8');
  if (!old.startsWith('> 当前四阶段')) await writeFile(file,'> 当前四阶段页面规格为 [POC_WORKFLOW.md](POC_WORKFLOW.md)。下文旧业务布局仅供历史参考，不按其生成独立页面。视觉系统仍沿用HTML标杆。\n\n'+old);
}
for (const n of [5,8,9,10,11,12,13,14]) {
  const file=`tasks/TASK-${String(n).padStart(3,'0')}.md`, old=await readFile(file,'utf8');
  if (!old.startsWith('> SCOPE SUPERSEDED')) await writeFile(file,'> SCOPE SUPERSEDED · 2026-11-04：此任务已deferred，不再执行。当前范围 [POC_SCOPE](../docs/POC_SCOPE.md)，执行新 [POC任务](INDEX.md)；尤其禁止照旧要求自行生产业务场景数据。历史内容保留供追踪。\n\n'+old);
}
const gate=JSON.parse(await readFile('tasks/gates.json','utf8'));
gate.scope='fully_mocked_poc';
gate.M1.nextTask='TASK-007 main review; POC-001 contract implementation';
gate.M1.target='POC-008 four-stage limited prototype; POC-009 visual review';
gate.POC={contractStatus:'defined',implementationGate:'POC-001 review required',scenarioA:'awaiting_content',scenarioB:'awaiting_content',scenarioC:'awaiting_content',businessUiGate:'POC-009 and M1 accepted',externalServices:'prohibited',mainBrowserReviewThisTurn:false};
await writeFile('tasks/gates.json',JSON.stringify(gate,null,2)+'\n');
console.log('Historical scopes labelled; new POC gates recorded without accepting M1.');
