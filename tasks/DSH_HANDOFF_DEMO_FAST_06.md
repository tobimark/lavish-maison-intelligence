# DSH · Results First产品救援 + SERENITY真实资产

> **已收口（2026-11-06）：** AS-001..006在限定内部Demo范围accepted，见`docs/reviews/AS-IP-FINAL-ACCEPTANCE.md`及`FAST_06-AS-CLOSURE-REVIEW.md`。下方接收/待绑定指令保留历史，不再重复执行。FLOW另批审查，当前FLOW首页、社媒功能不在本次通过范围；15秒核心成片及AR正式审稿保留后续项。不能因这些后续工作把AS重新标为未完成。

> **SERENITY内容阻塞已解除（2026-11-05）：** 新作者包已通过主控内容接收，详见`docs/reviews/SERENITY-A-1.1.0-CONTENT-INTAKE.md`。唯一输入为`content-inbox/web-chatgpt-prepared/a8d1ef5f54da/scent-layering/1.1.0/`；由原指定DSH连续完成AS-003发布/版本绑定→AS-004剩余页面→AS-005含MP4成果包→AS-006集中review。页面/原素材沿用，不再索要内容包或新视频。内容批准不等于FAST_06 accepted。

> **产品主线最新修正：** 当前以`tasks/DSH_HANDOFF_CONNECTED_FLOW.md`及`docs/CONNECTED_MARKETING_FLOW.md`续作。用户要求看懂“热点总结→产品/创意方案→原图/主视觉/视频→视频＋配套文案的社媒预览与模拟发布”。六工作区/已通过首页与资产基础继续复用，原邮件和下载不再作为主链终点。FLOW-001..004纳入当前批次，同一DSH执行，不新建后端、不真实生成或发布。

## 当前续作与唯一执行者（2026-11-05）

- 唯一代码执行者：**提交`docs/reviews/AS-004-DSH.md`并完成首页修正的现有DSH会话（DeepSeek 4.1 Flash 1017）**。该会话续作AS-003/004剩余/005剩余/006。其他会话仅只读审查，不并行修改同一工作区代码/配置/内容/审计证据。本交接是执行分工，不表示已自动派发或已获执行回执。
- 主控继续负责内容/契约裁决和最终代码、浏览器、视觉审查；网页端ChatGPT负责SERENITY营销内容制作。DSH不得代编客户内容。
- `docs/reviews/AS-004-HOME-CORRECTION-MAIN-REVIEW.md`已确认首页修正视觉/交互通过，保留结果，不返工；FAST_06整体仍未accepted。原AS-IP-BATCH主控报告与首页报告结合阅读，旧“缺AS-004报告”等已被后续交付覆盖的条目不再重复处理。
- 已实现的静态素材、API、双语ZIP与独立MP4下载直接复用；先检查现状再补缺，不能按旧planned状态全部重做。内容未到时可完成Library的Provided类型/真实预览、Brief/Atelier基于准确Campaign+版本匹配的组件接线、导出逻辑及已有报告补充；不把SERENITY资产绑定旧OUD/PERLA脚本，最终绑定和资产版整链验证等待AS-003。
- 内容已到并批准接入：`LAVISH_SERENITY_A_1.1.0_HANDOFF.zip`已归档，按本文件顶部指定接收副本实施；十JSON已包含manifest/events/expected，原Hero/identity/MP4均已有。网页制作资料包保留历史，不再让用户重复制作。
- 新包到后按`docs/reviews/AS-003-INTAKE-CHECKLIST.md`归档、校验及提交主控内容审查，批准后绑定新A；随后完成含真实MP4成果包和一次集中路径/视觉验收。既有首页审查及其他证据只读保留，新验证写新目录。没有新包就不声称A已统一或整批accepted。

> **首页最新修正：** 用户明确要求identity产品原图 → Hero营销主视觉 → 视频预览的创意叙事，反对Hero/identity/video乱序和高低不齐。按`tasks/assets/AS-004-HOME-CORRECTION.md`执行用途优先、三阶段等高框布局与真实预览交互，覆盖旧首页冲突要求。属于AS-004本批修正，不另开阶段；不得将叙事顺序说成系统真实生成过程。

> **FAST_05移交确认：** IP-001..009已完成实现，功能链路经主控独立验证通过，但不单独accepted，纳入本批合并验收。读取`docs/reviews/IP-BATCH-MAIN-REVIEW.md`后直接复用现有实现，不重做IP基础。随AS-006/IP-009补齐条件控件DOM证据与交互矩阵审计；运行回归时使用独立`EVIDENCE_ROOT`，不得覆盖旧证据。SERENITY内容未到只阻断AS-003最终绑定，不阻断其余可独立完成的工作。

2026-11-05最新交接，覆盖FAST05中“本批完全无视频”的限制：**不制作视频，但接入已提供MP4预览/下载**。原IP六工作区改造继续，资产任务AS001–006补入同一批，不重启基础架构或重复POC-001。

用户已明确以SERENITY统一A案例并另补脚本。三素材已原样入库、实际参数与主控sidecar已准备。读取docs/PRODUCT_RESCUE_ASSET_INTEGRATION.md、两份product/provided-asset-contract.ts、design/presentation-assets/scent-layering.json和资产receipt，再按IP/AS任务白名单实施。

## 顺序

1. 可立即执行AS001发布真实静态文件/验证；IP001读视图、IP002编辑/普通导出基础与AS002资产API按依赖衔接。
2. IP003–008六路由/实际页面继续，不以缺新A脚本停住导航、B/C内容或共享组件。AS004复用Hero/Identity/FinalVideoPreview组件接各页，Campaign Brief新增`/campaigns/[campaignId]/brief`次级详情，不增加重复一级菜单。
3. 网页端ChatGPT按WEB_CHATGPT_SERENITY_UPDATE_PROMPT交A 1.1.0；AS003接收校验后绑定SERENITY，不得把旧OUD/PERLA包换图当统一完成。旧A保留历史，新版本读取带scenarioVersion，旧session/导出不重标新产品。
4. AS005扩展Deliverables主包：明确EN/AR版本、Brief/字幕/分镜、Hero/identity/原MP4；主Download video独立真实下载，无模拟邮件前置。模拟邮件为次级旧脚本文案功能，不能混成普通导出回执。
5. AS006和IP009合并一次全站点击/媒体/跨页/下载/视觉验收；新证据evidence/product/**，提交docs/reviews/AS-IP-BATCH-DSH.md，不自行accepted。

## 重要裁决

- 720×960、3:4、10.08s、24fps是实际提供片，禁止伪填原15s/1080×1920。播放器原生controls、contain/no-autoplay，实测play/pause/seek/replay；素材标签Provided demo asset / Not generated live in this POC。
- 核心15秒脚本/版本状态机制保持；Provided片通过sidecar独立关联，不替代原要求15秒的VideoEntry，不挂未对齐VTT。编辑脚本不更新该MP4，不能显示同步生成。
- 两张图片均SERENITY，白底图为identity、Hero为营销氛围，不能互相冒充；木枝摆件不证明香调/原料。官网已核实SKU/简要香调，无容量/功效声明。
- 六一级菜单全部真实可点击，正常页面展示完整推荐依据和成果，Scenario退到底层；不保留Soon/空白假入口。Results First，不默认把高级字段/状态/hash/无renderer说明铺满屏。
- API/只读状态/原NV修复复用；新provided类型、双语包与记录noVideo布尔扩展已主控批准，冻结Schemas/Tokens/旧客户JSON不改。

## 可复制指令

> 执行tasks/DSH_HANDOFF_DEMO_FAST_06.md，将IP六工作区重构与tasks/assets/AS001–006合并。先读PRODUCT_RESCUE_ASSET_INTEGRATION、两份API契约类型和真实资产sidecar/receipt。AS001及IP基础可以立即开始，SERENITY新内容由网页ChatGPT补A1.1.0，缺包只阻断AS003最终内容绑定，不再阻断其余页面。用真实SERENITY Hero/白底identity/10.08秒3:4 MP4实现Results First、六菜单自由探索、完整Brief/双语预览/四镜头/真实视频/内容包与原MP4下载。复用MockApi/IndexedDB/版本/ZIP，避免路径硬编码和新状态机；不重生成视频、不把提供素材说成live output，不伪改旧15秒Schema。按任务白名单和矩阵运行实际浏览器/媒体/ZIP/跨页检查，提交AS-IP-BATCH-DSH集中review，不自行accepted。
