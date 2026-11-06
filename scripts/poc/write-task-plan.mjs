// Main-controller planning update only; never executes or dispatches implementation.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const commonRead = 'PROJECT_CONSTRAINTS.md；docs/POC_SCOPE.md；docs/SCENARIO_DATA_CONTRACT.md；contracts/poc/scenario.schema.json；docs/MOCK_API_CONTRACT.md；docs/POC_EVENT_PROTOCOL.md；docs/POC_STATE_MACHINES.md；docs/POC_ACCEPTANCE.md';
const designRead = 'docs/DESIGN_SYSTEM.md；design/tokens.css（只读）；docs/DESIGN_REFERENCE_ANALYSIS.md；docs/pages/POC_WORKFLOW.md；reference/LAVISH_LiveVision_RealVideo_Demo.html；evidence/reference/截图；docs/reviews/TASK-006-ACCEPTANCE.md';
const tasks = [
  ['POC-001','P0','场景校验器与公共类型',[],
    '实现标准JSON Schema 2020-12验证、十文件装配、静态语义检查与公共类型生成，不创作客户场景。',
    'scripts/poc/validate-scenario.mjs；scripts/poc/generate-types.mjs；apps/web/demo/poc/generated/**；apps/web/demo/poc/validation/**；tests/poc/validation.test.ts；tests/fixtures/poc/**；package.json/package-lock.json（仅验证器/类型生成依赖与命令）',
    '从唯一Schema生成类型；实现L1/L2/L4和L3静态规则及typed-reference映射；L3的实际checkpoint投影比较留接入口，由POC-005完成前标NOT_RUN，不能runnable；识别entry链、镜头/字幕边界、事件守卫/有序性、资产哈希和路径；共享语义函数供reducer使用。验证catalog三条awaiting_content不能计成功。TEST_ONLY最小合成数据只能在tests，不能入public；报告按契约逐层pass/fail/not_run，L5未跑则runnable=false。标准validator离线注册本地$ref，不访问.invalid URL。',
    '正例技术夹具通过已实现检查；L3投影比对与L5未实现保持NOT_RUN；缺文件/未知字段/错误引用类型/跨场景/重复ID/乱序/错hash/路径越界/非.invalid/缺媒体均定位到file+jsonPointer并exit1；缺包不假通过；类型可编译。',
    'npm run typecheck\nnpm run test:unit -- tests/poc/validation.test.ts',false],
  ['POC-002','P0','实际媒体校验工具',['POC-001'],
    '验证场景文件可真实访问、解码、播放和下载，为ready提供L5证据。',
    'scripts/poc/verify-media.mjs；tests/poc/media-validation.test.ts；tests/fixtures/poc/media/**；evidence/poc/media/**',
    '按docs/POC_MEDIA_RULES.md使用Playwright和本地ffprobe；HTTP GET、MIME/签名、hash、播放/seek/封面/字幕检查；工具缺失或媒体缺失NOT_RUN/fail，不虚构视频；只读探测，不调用渲染服务。技术测试媒体明确TEST_ONLY且不进入catalog。',
    '损坏/伪MP4/错尺寸时长/404/外域跳转/不可seek可检测；良好技术样例记录实际metadata；失败返回非0；客户媒体未到明确未验收。',
    'npm run test:unit -- tests/poc/media-validation.test.ts\n# 场景文件到齐且启动Web后执行契约中的verify-media命令；否则NOT_RUN',false],
  ['POC-003','P0','四阶段纯状态机',['POC-001'],
    '实现统一领域reducer、版本失效和typed guards，供操作与回放共用。',
    'apps/web/demo/poc/domain/**；tests/poc/state-machine.test.ts',
    '遵循POC_STATE_MACHINES的每条转换；script编辑新版本、video/delivery stale；明确确认边界、失败attempt、精确附件绑定；workflow与replay分离；不依赖DOM/系统时间/随机数/网络。引用校验复用POC-001语义函数，禁止维护另一套实体结构。',
    '每条合法转换、非法跳步、脚本不匹配、旧确认失效、同事件重复、失败重试均有单测；输入对象无原位修改；历史结果不可覆写。',
    'npm run typecheck\nnpm run test:unit -- tests/poc/state-machine.test.ts',false],
  ['POC-004','P0','统一Mock API与浏览器持久化',['POC-003'],
    '实现前端唯一业务入口及隔离、可恢复的会话存储。',
    'apps/web/demo/poc/api/**；apps/web/demo/poc/storage/**；tests/poc/mock-api.test.ts；tests/poc/storage.test.ts；package.json/package-lock.json（仅IndexedDB测试依赖）',
    '完整实现MOCK_API方法（下载仅接口与现有静态文件，ZIP由POC-013补齐，未实现返回明确错误）；字段严格校验；单transaction保存状态/幂等receipt/history。不同key同revision并发仅一个成功，相同key原响应返回。createSession固定包hash；损坏/配额/存储失败可导出恢复，不能假已保存；无后端/外部服务。',
    '统一Result/错误码；两session隔离、两tab写冲突、重复create/delivery、刷新/版本不兼容/重置范围、内存模式提示契约通过；页面不读数据库的架构边界可检查。',
    'npm run typecheck\nnpm run test:unit -- tests/poc/mock-api.test.ts tests/poc/storage.test.ts',false],
  ['POC-005','P0','确定性回放与操作隔离',['POC-003','POC-004'],
    '提供事件驱动播放控制和一致状态恢复，不用定时文案伪造流程。',
    'apps/web/demo/poc/replay/**；apps/web/demo/poc/api/replay*；apps/web/demo/poc/validation/**（仅checkpoint投影适配）；scripts/poc/validate-scenario.mjs（仅L3投影接线）；tests/poc/replay.test.ts',
    '接入校验器L3，调用同一reducer实际比较所有expected checkpoints；按POC_EVENT_PROTOCOL实现play/pause/step/seek/restart与1/2/4×；相同atMs按sequence；虚拟clock与系统墙钟隔离；纯projection可hash；refresh为paused。回放只投影预置receipt，绝不写用户deliveryAttempts或稿件。',
    '所有checkpoint一致，直接seek/多次seek/step/不同速度相同hash；重复投递幂等；两session隔离；回放结束用户交付记录未增。',
    'npm run typecheck\nnpm run test:unit -- tests/poc/replay.test.ts',false],
  ['POC-006','P0','接收并验证Scent Layering内容包',['POC-001','POC-002','POC-005'],
    '将ChatGPT提供的完整A包和已核实媒体接入，完成内容/资产门禁。',
    'scenarios/scent-layering/**；scenarios/catalog.json（仅A条目）；apps/web/public/scenario-media/scent-layering/**；evidence/poc/content/scent-layering-review.md；evidence/poc/scenario-a-validation.json；evidence/poc/media-a.json',
    '前置外部输入：ChatGPT十文件与实际素材。未到齐只列缺项，不自行编写热点/脚本/假hash；媒体本地字节核验，主控实际看脚本/视频匹配及品牌事实。ready需要五层验证与主控content review，DSH只能提交待review报告。',
    'entry链闭合、EN/AR完整脚本、至少精确entry视频、成功/失败交付样例、四阶段checkpoints；真实MP4可播；客户场景不含TEST_ONLY；人工审核后才改ready。',
    'node scripts/poc/validate-scenario.mjs --dir scenarios/scent-layering/1.0.0 --strict --report evidence/poc/scenario-a-validation.json\nnode scripts/poc/verify-media.mjs --dir scenarios/scent-layering/1.0.0 --base-url http://127.0.0.1:3100 --report evidence/poc/media-a.json\nnode scripts/poc/validate-scenario.mjs --dir scenarios/scent-layering/1.0.0 --strict --media-report evidence/poc/media-a.json --report evidence/poc/scenario-a-validation.json',false],
  ['POC-007','M1','四步共享交互组件',['POC-001','TASK-007'],
    '在已复核壳体上建立统一控件与浮层，不实现业务结果。',
    'apps/web/components/poc/**；apps/web/app/poc-components/**；apps/web/tests/poc-components.spec.ts；evidence/poc/components/**',
    '实现Button/Input/Select/Tabs/Badge/Stepper/Drawer/Dialog/Toast/Empty/Error；状态及键盘行为统一；组件页仅中性技术说明。TASK-007必须主控accepted，交付报告自评不能作依赖通过。',
    '所有控件focus/disabled/loading/error可操作；Dialog/Drawer Escape、focus trap、回焦、滚动锁；四尺寸截图实际查看后主控审查；不改Tokens或design-lab。',
    'npm run typecheck\nnpm run build\nnpm run test:e2e -- theme.spec.ts shell.spec.ts poc-components.spec.ts',true],
  ['POC-008','M1','A场景四步有限视觉原型',['POC-004','POC-005','POC-006','POC-007'],
    '建立一个完整视觉骨架，验证四步布局和真实数据呈现，供M1视觉门禁。',
    'apps/web/app/page.tsx；apps/web/app/poc/**；apps/web/components/poc/**；apps/web/components/shell/Sidebar.tsx（仅真实路由导航）；apps/web/tests/poc-prototype.spec.ts；evidence/poc/prototype/**',
    '严格按docs/pages/POC_WORKFLOW.md实现首页与/poc/[sessionId]；MockApi唯一取数；A真实包，B/C未到显示awaiting。有限原型包含四步preview、播放视频、一个证据Drawer/确认Dialog、EN/AR及错误/空态；未实施动作禁用并说明，不假成功。不扩展编辑器/交付业务全UI。',
    '四步构图统一，1440/1366/1920/390无溢出；真实资源、原始预置声明、依赖未满足状态清楚；交付主控实际浏览器审查证据。',
    'npm run typecheck\nnpm run build\nnpm run test:e2e -- theme.spec.ts shell.spec.ts poc-prototype.spec.ts',true],
  ['POC-009','M1','M1实际视觉门禁',['POC-008'],
    '主控复核有限原型、安排明确修复并由PO体验确认，决定是否扩展。',
    'docs/reviews/POC-009-MAIN.md；evidence/poc/visual-gate/**；tasks/poc/fixes/**；tasks/gates.json（仅主控）',
    'DSH负责取证和按FIX白名单修复；主控必须运行浏览器实际打开截图逐项对照HTML与已验收theme/shell。检查EN/AR、字号/留白/比例、全部已启用控件、200%/Reduced Motion/四尺寸。代码改动需独立FIX任务限定文件。',
    'P0/P1/P2清零；源hash、包hash、截图/交互/NOT_RUN记录齐；PO体验确认；只有主控写M1 accepted。无法看实际渲染就不通过。',
    'npm run typecheck\nnpm run build\nnpm run test:e2e -- theme.spec.ts shell.spec.ts poc-components.spec.ts poc-prototype.spec.ts',true],
  ['POC-010','P1','分析与脚本版本编辑交互',['POC-009'],
    '完成阶段2真实编辑、版本保存/选择/确认与EN/AR。',
    'apps/web/components/poc/analysis/**；apps/web/app/poc/**（仅阶段2接线）；apps/web/tests/poc-analysis.spec.ts；evidence/poc/analysis/**',
    '展示ChatGPT分析依据与Brief；完整脚本按4镜头编辑，校验时码/总长；MockApi保存派生版本与确认；脏稿离开保护；新稿没有对应视频明确stale，用户显式选回原稿继续。不能自动改MP4或编造LLM答案。',
    '保存刷新存在、旧版本不覆盖、AR排版正确、脚本切换使下游失效；全部编辑/对比/确认按钮真工作并有截图。',
    'npm run typecheck\nnpm run build\nnpm run test:e2e -- poc-analysis.spec.ts',true],
  ['POC-011','P1','脚本匹配的预置视频工作台',['POC-010'],
    '完成阶段3分镜、模拟渲染回放与真实播放器交互。',
    'apps/web/components/poc/video/**；apps/web/app/poc/**（仅阶段3接线）；apps/web/tests/poc-video.spec.ts；evidence/poc/video/**',
    '预置事件进度始终Simulated render；视频预置声明、精确版本、四镜头seek、字幕、封面、MP4下载；资源404/坏文件阻止完成与交付；旧视频只读历史，不能声称编辑稿已有成片。',
    '可播放/暂停/seek/结束、正确9:16、真实下载hash；不匹配版本与媒体失败都有负测；无外部渲染请求。',
    'npm run typecheck\nnpm run build\nnpm run test:e2e -- poc-video.spec.ts',true],
  ['POC-012','P1','模拟交付确认与尝试记录',['POC-011'],
    '完成阶段4邮件预览、模拟交付、失败/重试，绑定精确附件。',
    'apps/web/components/poc/delivery/**；apps/web/app/poc/**（仅阶段4接线）；apps/web/tests/poc-delivery.spec.ts；evidence/poc/delivery/**',
    '使用delivery计划/recipient/record；允许编辑模拟内容，地址只.invalid；确认Dialog展示脚本/video/hash/附件与不会真实发信；simulateDelivery幂等、失败明确触发、retry新attempt；历史不可覆写。',
    '双击不重复记录、编辑撤销旧确认、错误地址拒绝、失败后重试保留记录、全部Simulated标识；0个外域发送请求。',
    'npm run typecheck\nnpm run build\nnpm run test:e2e -- poc-delivery.spec.ts',true],
  ['POC-013','P1','真实交付文件导出',['POC-012'],
    '输出可打开的脚本/视频/封面/交付ZIP/运行记录。',
    'apps/web/demo/poc/downloads/**；apps/web/demo/poc/api/download*；apps/web/components/poc/delivery/**（仅导出接线）；package.json/package-lock.json（仅ZIP依赖）；tests/poc/downloads.test.ts；apps/web/tests/poc-downloads.spec.ts；evidence/poc/downloads/**',
    '按POC_MEDIA_RULES组装ZIP，使用实际匹配文件，不调用邮件；所有导出带mode=mock和版本关系；Blob释放、安全filename、下载失败不记成功。',
    'E2E捕获实际文件，验证MP4/hash、封面、脚本JSON与ZIP条目/回执；失败与不匹配附件被拒绝；不只是toast通过。',
    'npm run typecheck\nnpm run test:unit -- tests/poc/downloads.test.ts\nnpm run build\nnpm run test:e2e -- poc-downloads.spec.ts',true],
  ['POC-014','P1','会话历史与可重复演示入口',['POC-013'],
    '完成继续演示、刷新恢复、历史查看及单会话重置UI。',
    'apps/web/components/poc/history/**；apps/web/app/page.tsx；apps/web/app/poc/**（仅历史/恢复入口）；apps/web/tests/poc-history.spec.ts；evidence/poc/history/**',
    '历史与preset receipt分区明确；session固定包；关闭重开paused、存储错误/损坏有解释与导出；reset确认仅此session，保留其他session与壳体偏好。',
    '两个场景会话隔离、刷新可恢复、回放不增交付记录、重置后再次跑A无污染；所有按钮有真实行为。',
    'npm run typecheck\nnpm run build\nnpm run test:e2e -- poc-history.spec.ts',true],
  ['POC-015','P2','接收B和C完整场景',['POC-006','POC-009'],
    '通过同一契约接入Luxury Gifting/Oud Storytelling，不另建页面硬编码。',
    'scenarios/luxury-gifting/**；scenarios/oud-storytelling/**；scenarios/catalog.json（仅B/C）；apps/web/public/scenario-media/luxury-gifting/**；apps/web/public/scenario-media/oud-storytelling/**；evidence/poc/content/luxury-gifting-review.md；evidence/poc/content/oud-storytelling-review.md；evidence/poc/bc-validation/**',
    '必须收到ChatGPT完整数据和真实匹配MP4；两场景分别跑五层验证，主控内容/视频审查；禁止沿用A的文案/引用或用缩短链交付。UI共用MockApi与四步组件，不新增独立业务数据。',
    '两包各自四步关系闭合、媒体真实可用、EN/AR脚本与成功失败样例；未到保持awaiting，不能改ready。',
    'node scripts/poc/validate-scenario.mjs --catalog scenarios/catalog.json --strict --report evidence/poc/bc-validation/catalog.json\n# 对B/C分别执行verify-media，再分别以--media-report合并重跑validate-scenario；记录实际命令和exitcode',false],
  ['POC-016','P2','全链路及最终视觉演示验收',['POC-014','POC-015'],
    '验证三场景完整四步、离线外部服务隔离、重复演示与最终视觉品质。',
    'apps/web/tests/poc-e2e.spec.ts；apps/web/tests/poc-visual.spec.ts；evidence/poc/final/**；docs/reviews/POC-FINAL.md；docs/DEMO_SCRIPT.md；docs/DEPLOYMENT.md（仅前端运行部署说明）',
    '落实POC_ACCEPTANCE所有测试，5–8分钟A脚本；三场景完整流程/失败重试/版本不匹配/reset/存储失败/两tab；浏览器外域请求禁止；实际视频下载与ZIP核验。主控看四尺寸截图并复查所有交互，PO最终体验。部署说明仅静态资源+Next前端现有服务，不恢复完整后端。',
    '所有要求有实际结果与证据、无假生成/假发送；未跑如实列出；主控与PO确认后才final accepted，剩余问题不能隐藏在总结。',
    'npm run typecheck\nnpm run test:unit\nnpm run build\nnpm run test:e2e',true]
];
await mkdir('tasks/poc', { recursive: true });
const registry = JSON.parse(await readFile('tasks/registry.json', 'utf8'));
if (registry.tasks.some(t => t.id.startsWith('POC-') && !['ready','planned'].includes(t.status))) throw new Error('POC execution has begun; update individual tasks and preserve review statuses instead of regenerating.');
registry.scope = 'fully_mocked_poc';
registry.reviewedAt = '2026-11-04';
registry.scopeContract = 'docs/POC_SCOPE.md';
registry.dispatched = false;
for (const task of registry.tasks) {
  const n = Number(task.id.replace('TASK-', ''));
  if (n === 5 || (n >= 8 && n <= 14)) {
    task.status = 'deferred';
    task.scopeNote = 'Superseded by POC-* scenario-driven contracts; do not generate scenario content or execute old business-page scope.';
  }
  if (n === 7) {
    task.status = 'review';
    task.submissionReport = 'docs/reviews/TASK-007-DSH.md';
    task.releaseNote = 'Submitted; main browser/code acceptance pending. Existing shell can be reused only after review.';
  }
}
registry.tasks = registry.tasks.filter(t => !t.id.startsWith('POC-'));
const noScope = '四阶段全部Mock；不调用外部平台/LLM/视频生成/邮件服务；不创作客户业务数据。不得修改公共Schema、Tokens、DESIGN_SYSTEM或本任务白名单外文件；需改公共契约时报告主控。只交付review，不自行accepted、不自动开下一任务。';
for (const [id,milestone,title,deps,goal,files,requirements,acceptance,commands,frontend] of tasks) {
  const status = id === 'POC-001' ? 'ready' : 'planned';
  const spec = `tasks/poc/${id}.md`;
  const reads = `${commonRead}；${frontend ? designRead : 'docs/SCENARIO_AUTHORING_GUIDE.md；docs/POC_MEDIA_RULES.md'}`;
  const visual = frontend ? '严格执行docs/DESIGN_SYSTEM.md与docs/pages/POC_WORKFLOW.md，HTML标杆最高；实际截图1440×900、1366×768、1920×1080、390×844，EN/AR、loading/empty/error/focus；不假称主控视觉通过。' : '不新增业务UI；涉及资产保持Lavish身份/比例准确。docs/DESIGN_SYSTEM.md仍为后续页面权威。';
  const prompt = `执行${id}：${title}。目标：${goal} 前置依赖：${deps.join('、') || '本轮主控契约定义'}，必须全部主控accepted；若需场景内容则还必须已收到完整包，缺失只列缺项。先读：${reads}。仅可改：${files}；另可写docs/reviews/${id}-DSH.md。要求：${requirements} 视觉：${visual} 数据/API遵守contracts/poc/scenario.schema.json、MOCK_API_CONTRACT、POC_EVENT_PROTOCOL、POC_STATE_MACHINES，不另写冲突类型或独立页面夹具。验收：${acceptance} 运行命令：${commands.replaceAll('\n','；')}。${noScope} 交付变更清单、实际命令及exitcode、测试结果、证据路径/源hash、已知限制/NOT_RUN。`;
  const text = `# ${id} — ${title}\n\n当前${status}；仅定义任务，不代表已派发或已实现。\n\n### Task ID\n${id}\n\n### Title\n${title}\n\n### Goal\n${goal}\n\n### Dependencies\n${deps.join('、') || '本轮主控契约冻结；无其他代码前置任务'}。只认主控accepted。内容依赖不是空测试数据可替代。\n\n### Context\n${reads}\n\n### Files\n${files}；docs/reviews/${id}-DSH.md。未列文件不可改。\n\n### Implementation Requirements\n${requirements}\n\n### Visual Specification\n${visual}\n\n### Data & API Contract\ncontracts/poc/scenario.schema.json（输入结构）；docs/MOCK_API_CONTRACT.md（方法/返回/错误/幂等）；docs/POC_EVENT_PROTOCOL.md（事件类型/回放）；docs/POC_STATE_MACHINES.md（guard/失效）。生成类型为唯一实现类型来源；不得读旧OpenAPI定义本POC。\n\n### Constraints\n${noScope}\n\n### Acceptance Criteria\n${acceptance}\n\n### Test Commands\n以下是任务实施后要执行的命令；本次规划未运行这些尚未实现的测试。媒体命令需要Web启动与完整场景包。\n\n\`\`\`powershell\n${commands}\n\`\`\`\n\n### Expected Deliverables\n白名单文件、测试/证据、交付报告；报告注明数据来源、执行者、文件hash、命令exitcode与未运行检查，不以自报PASS代替主控复查。\n\n### Failure Conditions\n违背任一验收条件、真实外部调用、伪造业务数据/媒体、无效下载、页面硬编码、漏报未测、越权修改契约或视觉、绕过依赖门禁均未完成。\n\n### Definition of Done\n实现和所需测试完成，证据可重现，主控代码/功能审查通过；前端另需实际浏览器截图审查。内容任务另需人工语义与媒体匹配检查。不自动进入下一任务。\n\n### DeepSeek Execution Prompt\n${prompt}\n`;
  await writeFile(spec,text);
  registry.tasks.push({ id,milestone,title,dependencies:deps,status,owner:'DeepSeek 4.1 Flash 1017; main controller review',spec,scope:'fully_mocked_poc' });
}
await writeFile('tasks/registry.json',JSON.stringify(registry,null,2)+'\n');
let index = '# 当前任务目录 · Fully Mocked POC\n\n权威范围docs/POC_SCOPE.md。TASK-001/006验收保留；TASK-007已提交待主控复查；旧TASK-005、008–014冻结并由POC任务替代。TASK-004仅登记实际已提供品牌资产，不授权生成客户业务内容。后端任务继续deferred。所有状态以registry.json为准；尚未派发DSH。\n\n| ID | 目标 | 依赖 | 状态 |\n|---|---|---|---|\n';
for(const t of registry.tasks) index += `| ${t.spec ? `[${t.id}](${t.spec.replace('tasks/','')})` : t.id} | ${t.title} | ${t.dependencies.join(', ') || '—'} | ${t.status} |\n`;
index += '\n第一批仅POC-001可开始；POC-002/003在001主控accepted后执行。TASK-007先主控review，不重复开发。POC-006/015必须等ChatGPT与实际素材；POC-009通过之前不启动POC-010–014大规模业务UI。\n';
await writeFile('tasks/INDEX.md',index);
console.log(`Wrote ${tasks.length} scoped POC task packages; no development dispatched.`);
