# POC-008 交付报告：首页与四步工作流框架（内容未齐阶段）

- 任务：[tasks/poc/POC-008.md](../../tasks/poc/POC-008.md)；交接：[DSH_HANDOFF_DEMO_FAST_02](../../tasks/DSH_HANDOFF_DEMO_FAST_02.md)。
- 执行模型：DeepSeek 4.1 Flash 1017；POC-005/007 已 accepted。
- 状态：**review，未 accepted**；A 内容包未到，未启动 POC-006 内容接收；不宣称 A 主链完成。
- 数据来源：现有 approved catalog（三场景全部 `awaiting_content`）；没有发布 TEST_ONLY 测试夹具，没有客户内容/媒体。

## 1. 交付范围

| 文件 | 内容 |
|---|---|
| [app/page.tsx](../../apps/web/app/page.tsx) | 真实首页：Lavish AI Marketing、三行场景入口、本地会话区、Mock/DEMO 标记 |
| [components/poc/HomeDashboard.tsx](../../apps/web/components/poc/HomeDashboard.tsx) | MockApi 读取 catalog/sessions；awaiting/start unavailable；Layout preview、本地会话 Continue/Export/Reset Dialog |
| [app/poc/preview/page.tsx](../../apps/web/app/poc/preview/page.tsx) | 明确标记的布局预览入口，不创建 session |
| [app/poc/[sessionId]/page.tsx](../../apps/web/app/poc/[sessionId]/page.tsx) | 真实 session 路由；无包/无 session 时诚实错误，不伪造 |
| [components/poc/WorkflowFrame.tsx](../../apps/web/components/poc/WorkflowFrame.tsx) | 四步结构、stepper、Operation/Replay 模式、阶段空/错/禁用态、证据 Drawer、阶段 API 动作、真实 replay 时钟接线 |
| [components/poc/home.module.css](../../apps/web/components/poc/home.module.css) / [workflow.module.css](../../apps/web/components/poc/workflow.module.css) | 1440/1366/1920/390 构图；只消费 tokens |
| [demo/poc/api/scenario-source.ts](../../apps/web/demo/poc/api/scenario-source.ts) | approved catalog → ScenarioSource；package loader 未接入前 `get()` 返回 null，不说 ready |
| `apps/web/public/scenarios/catalog.json` | 现有 catalog 原样发布副本，未注入测试场景 |
| [components/poc/Stepper.tsx](../../apps/web/components/poc/Stepper.tsx) / [poc.module.css](../../apps/web/components/poc/poc.module.css) | stepper 真实阶段导航与移动端当前步自动滚入视野 |
| [tests/poc-prototype.spec.ts](../../apps/web/tests/poc-prototype.spec.ts) | 10 项首页/四步框架/尺寸/状态测试 |

## 2. 页面与状态

- `/`：`Lavish AI Marketing` 标题、用途说明、三行 Scent Layering / Luxury Gifting / Oud Storytelling；全部 `Awaiting content`、`Mock / Demo`、`Start unavailable`；`Layout preview` 仅查看布局，不创建 session。
- 本地会话区：读取 IndexedDB session summaries；有会话时显示 Continue / Export（run_record）/ Reset（确认 Dialog）；当前无数据如实显示 empty，截图不伪造会话。
- `/poc/preview?...`：永久 banner “Layout preview only — No scenario has been started”；四步均可切换；所有业务动作 disabled；Replay mode disabled 并说明需要 approved package/session。
- 四步：Discovery、Analysis & script、Script to video、Automated delivery，共享 stepper 和 stage context；空态分别说明 signals/trends、brief/script、matching MP4/shot list、email/records 尚未提供；不发明热点、脚本、收件人或成功结果。
- Drawer：preview evidence drawer 验证 Escape、focus trap、回焦、滚动锁；无真实证据时明确 “No evidence available”。
- Operation/Replay 模式：真实 session 时使用 MockApi `getSession/getStageData/getEvents/replayCommand/advanceReplay`；回放面板由 wall→virtual 计时驱动，倍速影响目标虚拟时间，暂停停驱动、到末尾显示 ended，刷新通过 `getSession` 恢复 paused。**当前没有 approved package，故真实 session/replay 浏览器路径未实际运行**。
- `/poc/[sessionId]` 未知会话：显示 `Demo session unavailable / SESSION_NOT_FOUND`，不生成空 workflow 伪装。

## 3. 实际命令与结果

| 命令 | exit | 结果 |
|---|---|---|
| `npm run typecheck` | **0** | 通过 |
| `npm run build` | **0** | 通过，/、/poc/preview、/poc/[sessionId] 构建 |
| `npm run test:unit -- tests/poc/replay.test.ts tests/poc/mock-api.test.ts tests/poc/storage.test.ts tests/poc/validation.test.ts` | **0** | **64 passed**（既有核心回归） |
| `npm run test:e2e -- theme.spec.ts shell.spec.ts poc-components.spec.ts poc-prototype.spec.ts` | **0** | **34 passed**（其中 10 POC-008） |

实际浏览器：Chromium 156.0.8078.4，production `next start` 127.0.0.1:3100。入口：`/`、`/poc/preview?scenarioId=scn-scent-layering&step=discovery&view=workflow`。

## 4. 截图与查看

证据目录：[evidence/poc/prototype/](../../evidence/poc/prototype/)

- 首页：1440/1366/1920/390 `home-*-en.png`
- 四步预览：1440/1366/1920/390 `preview-*-en.png`；`preview-discovery/analysis/video/delivery-1440-en.png`
- 手机 delivery：`preview-delivery-390-en.png`
- Drawer：`preview-evidence-drawer-1440.png`

已实际打开查看 1440 首页、1366/1920/390 布局、Discovery/Analysis/Video/Delivery、Drawer 与 390 预览；未发现横向溢出或阻断操作。所有页面有永久 DEMO/Mock 标记。

## 5. 关键指纹

| 文件 | Bytes | SHA-256 |
|---|---:|---|
| `app/page.tsx` | 595 | `a3fe7bdecbcd60659b79a7354e2958e95039c906080f8cfa4ec3075ade64fdfe` |
| `app/poc/preview/page.tsx` | 1,200 | `91ae9555975563264c7ec60b8b3fad26695c269a8033f10695e922147c9d1071` |
| `app/poc/[sessionId]/page.tsx` | 1,267 | `f8b3055d40f0a11e48344bb2b3bff9397a559d71c7b70703a8660ff0c75de918` |
| `components/poc/HomeDashboard.tsx` | 12,286 | `c1a39b61dff147b3c25b5ac9ff8076605c866dc600b07bedfff2848e9e5d271c` |
| `components/poc/WorkflowFrame.tsx` | 37,322 | `7d50296570aa57e9d2419b5e3c84fa6a34b635747aa6c5ff4bc8f47fce847924` |
| `components/poc/home.module.css` | 4,638 | `56e41af49d86a405c5f757e03acc5843c9ddf5c546ed709bbf9e93ca6865f390` |
| `components/poc/workflow.module.css` | 9,433 | `82cd48f0c9cd6c1d3d54fb0774f03e3789992db7503d4c3386c58da357d3c17a` |
| `components/poc/browser-api.ts` | 1,117 | `224e84a634e8fc53d8a28fe308d05a7da8a6e4a97d4e11d2b96fd088d3448524` |
| `demo/poc/api/scenario-source.ts` | 2,640 | `73aaa54633b486c71a519742c4a994e1dd0384c14cba451b7921f3c30c1a8acb` |
| `public/scenarios/catalog.json` | 750 | `a1d41e251324b7e1fb96950e0bf4d485d44fb67b3e3f4e314b3e3764007cfe78` |
| `tests/poc-prototype.spec.ts` | 8,559 | `1e6f333541ac584511493ab374eb3547f3d79a800f85df6169d8fe9536fa52d7` |

## 6. NOT_RUN / 已知限制

- **A 内容包未到**：没有 approved signals/trends/brief/EN-AR script/MP4/poster/recipient/records；没有启动 POC-006，没有发布 tests 夹具。
- **真实 session/replay 浏览器链路未实际执行**：`/poc/[sessionId]` 的真实 stage data、视频播放、回放 play/pause/seek/倍速/末尾/刷新代码已接 MockApi，但没有 approved package 可创建 session；需 POC-006 内容到齐后集中验证。
- 首页本地会话当前为空；Continue/Export/Reset 逻辑已实现但无可操作的 approved session。
- Loading/error 状态中，首页错误重试/未知 session 已覆盖；四步真实 session 的 loading/error 视频状态未实际截图。
- 未做 M1 总视觉门禁、全状态/全浏览器矩阵、真实媒体解码/播放验证；截图仅为当前框架视觉证据，不声称 accepted。
- 未修改公共 Schema、Tokens、DESIGN_SYSTEM、domain、Sidebar、依赖/配置；未自行 accepted，未开下一任务。
