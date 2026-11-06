# DSH下一批：不等视频，完成其余前端 Demo

主控已批准，status=ready，未自动派发。用户2026-11-05明确“现在先放弃视频制作，完成其他工作”。本交接取代FAST_03的无MP4不启动条款。先完整读`docs/CONTENT_ONLY_DELIVERY.md`，其增量契约是本批主控裁决；不得据旧文件再等待视频或要求改成假MP4。

以下三个原子任务可连续实施，同批提交review，不逐项停工；A页面先完成集中主控复查再扩展新业务布局，B/C仅复用同一页面。只交review，不自行accepted。

## NV-001 · 接收三场景的非视频内容

**目标**：主页能创建真实、可恢复的content_only会话，非空布局预览。

**依赖**：已accepted POC-001/003/004/005/007/008；主控网页内容接收及CONTENT_ONLY_DELIVERY裁决。没有MP4依赖，旧POC-006完整媒体部分暂缓。

**必读**：docs/CONTENT_ONLY_DELIVERY.md、docs/reviews/WEB-CHATGPT-CONTENT-INTAKE.md、docs/SCENARIO_DATA_CONTRACT.md、docs/MOCK_API_CONTRACT.md、docs/POC_EVENT_PROTOCOL.md、docs/POC_STATE_MACHINES.md、contracts/poc/content-only.schema.json、既有API/domain/storage/replay代码。输入仅content-inbox/web-chatgpt-prepared/be3d777ab2e2，不使用旧本地A。

**允许文件**：apps/web/demo/poc/{api,domain,storage,replay,generated}/**（仅增量profile/类型/包参数联合/前两步回放支持）；scripts/poc/{generate-content-types.mjs,validate-content-only.mjs}；apps/web/public/content-scenarios/**；apps/web/public/scenario-media/**（仅实际已收文件）；apps/web/components/poc/browser-api.ts；tests/poc/**；docs/reviews/NV-001-DSH.md；evidence/poc/content-only/**。公共原Schema/build-contract/原生成类型不改；新schema只读。

**功能与数据/API**：严格实现CONTENT_ONLY_DELIVERY的catalog/source/profile、content_only验证、新存储命名空间及已有会话命令接入。作者十JSON字节不改；元数据/待收资产有真实类型，无any/双重断言。新类型从新Schema生成；纯reducer复用，不做第二套情报/分析引擎。缺视频仅deferred，缺实际图片/字幕或坏引用则明确invalid。

**验收**：三套manifest指纹一致、15实际文件hash一致；新Schema接收已声明pending的两资产，其余结构错误拒绝；A可createSession并恢复，旧完整视频profile缺媒体仍拒绝。回放前缀上限自动取analysis completed，不能硬编码A的16用于未来所有场景。

**测试命令**：`node scripts/poc/generate-content-types.mjs --check`；`node scripts/poc/validate-content-only.mjs --dir content-inbox/web-chatgpt-prepared/be3d777ab2e2/scent-layering/1.0.0 --report evidence/poc/content-only/a.json`（同入口检B/C）；`npm run typecheck`；`npm run test:unit -- tests/poc/content-only.test.ts`。以上两个脚本由本任务实现并保持CLI参数一致。

**交付/完成定义**：增量接收器、类型/存储/回放接线、报告与必要测试，进入本批后两项；坏数据不被强转、旧模式不被放宽。不能仅把首页按钮改enabled却无法createSession。

## NV-002 · 首页、情报、脚本与分镜真实交互

**目标**：用户从Home开始完成发现→分析→编辑/保存/确认→分镜审阅，能够刷新、继续与重置。

**依赖**：NV-001实现；无需等它单独accepted。读取NV-001上下文及docs/DESIGN_SYSTEM.md、docs/DESIGN_REFERENCE_ANALYSIS.md、docs/pages/POC_WORKFLOW.md、reference/LAVISH_LiveVision_RealVideo_Demo.html、design/tokens.css。

**允许文件**：apps/web/components/poc/**、apps/web/app/poc/**、apps/web/app/page.tsx、apps/web/tests/poc-content-only.spec.ts；evidence/poc/content-only/**、docs/reviews/NV-002-DSH.md。仅通过NV-001 API读取数据，不页面import场景/访问IndexedDB。

**功能**：内容就绪场景显示“Start content demo”，明确Video deferred；Home最近记录Continue/Export/Reset。Discovery有信号列表、synthetic趋势、证据Drawer与可收起事件；Analysis有依据/Brief/EN-AR脚本、4镜头按时码编辑、保存新版本/选择/确认、脏稿离开保护；不能覆盖预置稿。分镜显示实际产品原图contain、时码/文字，不显示假播放器或坏下载按钮；可直接进入Content Delivery。回放仅前两步的Play/Pause/Step/1-2-4×/Seek/Restart，刷新paused；回放不能编辑或产生交付记录。

**视觉规格**：用HTML设计语言和现有全局组件，正文16、辅助14、宽留白、不堆KPI；四步顶部导航一致。主操作每页一处，正文不被多面板包围；Drawer/Dialog统一；AR局部RTL、产品名/ID隔离；业务故事使用网页包，不把整段技术免责声明复制成数个面板。Deferred小标签+一句说明足够。

**验收**：A主链实际可操作；编辑EN/AR并刷新仍有稿；恢复原版本不丢派生稿；快进/重播不动用户稿；Reset只清当前会话。无MP4仍能完成上述操作，无屏幕“请先提供视频”阻断。B/C用同组件展示各自真实内容。

**测试命令**：`npm run typecheck`；`npm run build`；`npm run test:e2e -- poc-content-only.spec.ts`（实际启动按既有Playwright配置）。截图1440×900、1366×768各主页面及一个AR/Drawer/Dialog关键状态，浏览器检查主按钮，不做额外全矩阵。

**交付/完成定义**：实现、可重复URL和操作说明、真实截图/测试结果交主控集中review。不能只交代码截图或声明M1已过；明显排版/操作问题修正后再交。

## NV-003 · 文案包模拟交付、导出与历史

**目标**：完成不依赖视频的交付闭环，用户可实际下载与当前脚本一致的文件。

**依赖**：NV-001/002实现，同批不等独立accepted；必读CONTENT_ONLY_DELIVERY的ContentDeliveryDraft/Attempt、四个新API与导出规则，及docs/POC_MEDIA_RULES.md、既有command/CAS/storage/下载结构。

**允许文件**：apps/web/demo/poc/{api,domain,storage,downloads}/**（只增量文案交付）；apps/web/components/poc/**（交付/历史/导出接线）；tests/poc/content-delivery.test.ts；apps/web/tests/poc-content-delivery.spec.ts；evidence/poc/content-only/**；docs/reviews/NV-003-DSH.md。package.json/package-lock.json仅可新增一个浏览器ZIP依赖（若确需），不得升级现有依赖。NV-001新增类型生成文件可同步，不改公共Schema/原类型。

**功能与契约**：实现裁决中的getContentDelivery/saveContentDeliveryDraft/simulateContentDelivery/exportContentPack，复用当前已确认脚本和原收件计划来源；新增精确快照/幂等记录，不走旧视频simulateDelivery绕guard。默认仅系统状态说明适配为文案包，用户可编辑主题/正文/.invalid地址；确认弹窗明确真实附件列表和不会真实发信。点击一次原子写本地结果，显式失败按钮/选项用于演示、重试保留失败快照；无假等待进度。脚本变化撤销待发确认，不更改历史attempt。

**视觉规格**：DESIGN_SYSTEM与POC_WORKFLOW为准；左邮件预览、右精简编辑/实际附件、下方尝试记录。所有success是“模拟文案交付已记录”；不要真实邮件已送达的图示。无视频下载、无虚构附件hash；失败有明确重试与保留内容。

**验收**：确认、双击、失败→重试、脚本改版、刷新、Export/Reset各测核心路径；EN/AR派生稿ZIP内容/时码必须真匹配，记录快照不被后续编辑覆盖。实际捕获下载并解压检查script JSON、VTT、email TXT、SIMULATED-DELIVERY.json、README；没有MP4/poster条目。不能只toast“已下载”。本阶段只本地Mock，0外部发送请求。

**测试命令**：`npm run typecheck`；`npm run test:unit -- tests/poc/content-delivery.test.ts`；`npm run build`；`npm run test:e2e -- poc-content-only.spec.ts poc-content-delivery.spec.ts`。相关原状态机/API/回放核心测试仅在改动影响时重跑一次，不扩大边缘测试。

**交付/完成定义**：三任务变更清单、实际命令exitcode/NOT_RUN、URL、截图、下载证据、已知限制，以docs/reviews/NV-BATCH-DSH.md集中汇报；不自行accepted。完成本轮文案Demo不等于旧POC-011视频验收；不再列视频缺失为本批阻断。

## 可直接粘贴给DSH

> 执行tasks/DSH_HANDOFF_DEMO_FAST_04.md的NV-001→NV-002→NV-003，同批交付可操作的文案Demo。用户已暂缓视频，主控批准docs/CONTENT_ONLY_DELIVERY.md作为当前增量契约；旧无MP4不启动规则已覆盖，不再停在awaiting_content。先读上述两文件及网页内容接收报告，从content-inbox/web-chatgpt-prepared/be3d777ab2e2接收真实三场景；A先跑通再复用B/C。严格按白名单/新输入Schema/profile/API/文案交付快照实施，旧完整视频Schema与guard不放宽，不填假hash、不制造MP4或pretend ready。完成首页/信号证据趋势/分析Brief/EN-AR脚本编辑与版本/前两步回放/刷新恢复/分镜/模拟文案交付及真实ZIP下载/历史reset。遵循HTML及DESIGN_SYSTEM，不改Tokens、不新增大架构。运行相关类型、构建、核心测试与实际浏览器截图，报告真实结果，提交docs/reviews/NV-BATCH-DSH.md集中review；不逐个任务停工、不自行accepted。尚未配置自动执行入口，本提示由用户交给DSH执行。
