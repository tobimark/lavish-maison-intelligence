> 2026-11-05最新：SERENITY A1.1.0内容已接收并批准内部Demo接入；AS-003 ready，指定输入和有限规范见`docs/reviews/SERENITY-A-1.1.0-CONTENT-INTAKE.md`。当前状态以registry.json为准，旧awaiting_content叙述已失效；AS-003发布绑定与FAST_06整体验收尚未完成。

> 当前交接为`DSH_HANDOFF_SIX_WORKSPACES.md`（WS-001..004）：用户已批准保留六菜单，将已accepted Journey能力整合至对应工作区，Deliverables以社媒预览/编辑/审阅/模拟发布和记录为主、下载为辅。AS/FLOW已收口，复用现有实现不重做；本次工作区整合尚未实施或验收。

> 2026-11-05最高优先级更新：当前以 docs/INTERACTIVE_MOCK_PRODUCT.md、docs/INTERACTIVE_PRODUCT_API.md、docs/pages/INTERACTIVE_WORKSPACES.md 和 tasks/DSH_HANDOFF_DEMO_FAST_05.md 为准。六工作区可自由探索，Scenario只作数据容器；只读浏览无阶段前置。旧固定四步/唯一Home可用/导出依赖模拟邮件的要求不再用于开发。冻结场景Schema/业务JSON/Tokens不改，视频仍deferred。

> 2026-11-05范围更新：用户暂缓视频制作；当前以 docs/CONTENT_ONLY_DELIVERY.md 和 tasks/DSH_HANDOFF_DEMO_FAST_04.md 为准，视频缺失不阻塞非视频开发。旧完整视频要求保留作未来范围，不将文案Demo标为完整视频验收通过。

# 当前任务目录 · Fully Mocked POC

权威范围docs/POC_SCOPE.md。TASK-001/006验收保留；TASK-007已提交待主控复查；旧TASK-005、008–014冻结并由POC任务替代。TASK-004仅登记实际已提供品牌资产，不授权生成客户业务内容。后端任务继续deferred。所有状态以registry.json为准；尚未派发DSH。

| ID | 目标 | 依赖 | 状态 |
|---|---|---|---|
| [TASK-001](TASK-001.md) | 建立最小工程与检查入口 | — | accepted |
| [TASK-002](TASK-002.md) | 实现公共Schema与OpenAPI契约验证 | TASK-001 | deferred |
| [TASK-003](TASK-003.md) | 建立核心关系数据库迁移 | TASK-002 | deferred |
| [TASK-004](TASK-004.md) | 登记Demo实际使用的Lavish品牌与商品素材 | — | ready |
| [TASK-005](TASK-005.md) | 建立前端统一演示类型与本地场景数据 | TASK-001 | deferred |
| [TASK-006](TASK-006.md) | 封装主题Tokens与双语字体 | TASK-001 | accepted |
| [TASK-007](TASK-007.md) | 实现统一壳体导航与响应布局 | TASK-006 | review |
| [TASK-008](TASK-008.md) | 实现控件与页面状态组件 | TASK-006 | deferred |
| [TASK-009](TASK-009.md) | 实现共享Dialog与Drawer交互原语 | TASK-008 | deferred |
| [TASK-010](TASK-010.md) | 实现Home有限高保真场景入口 | TASK-007, TASK-008 | deferred |
| [TASK-011](TASK-011.md) | 实现Radar核心视觉原型并先行审查 | TASK-005, TASK-009, TASK-010 | deferred |
| [TASK-012](TASK-012.md) | 实现Atelier核心画布与Brief原型 | TASK-011 | deferred |
| [TASK-013](TASK-013.md) | 打通三页本地原型与刷新恢复 | TASK-012 | deferred |
| [TASK-014](TASK-014.md) | 执行核心原型视觉门禁与修复闭环 | TASK-004, TASK-013 | deferred |
| TASK-015 | 后台任务队列、租约与运行生命周期 | TASK-003, TASK-014 | deferred |
| TASK-016 | Autonomous Demo Feed持久调度 | TASK-015 | deferred |
| TASK-017 | 纯事件投影与快照重建 | TASK-015 | deferred |
| TASK-018 | Replay控制、恢复与SSE补读 | TASK-017 | deferred |
| TASK-019 | 确定性、隔离与关闭浏览器测试 | TASK-016, TASK-018 | deferred |
| TASK-020 | DEMO/IMPORTED Source Adapter与证据接入 | TASK-019 | deferred |
| TASK-021 | 标准化去重聚类与统一机会评分 | TASK-020 | deferred |
| TASK-022 | 机会详情与幂等Campaign交接 | TASK-021 | deferred |
| TASK-023 | Brief版本与Concept工作流 | TASK-022 | deferred |
| TASK-024 | 双语文案Provider与离线Preset | TASK-023 | deferred |
| TASK-025 | 品牌模板图像与实际文件导出 | TASK-024 | deferred |
| TASK-026 | 素材版本与Copilot目标差异应用 | TASK-025 | deferred |
| TASK-027 | 四镜头Storyboard与双语字幕编辑 | TASK-026 | deferred |
| TASK-028 | 真实Render Worker与MP4验证 | TASK-027 | deferred |
| TASK-029 | 版本绑定审批状态机 | TASK-028 | deferred |
| TASK-030 | 周月日历与模拟发布调度 | TASK-029 | deferred |
| TASK-031 | 统一反馈指标与优化建议 | TASK-030 | deferred |
| TASK-032 | 全链路、reset隔离与离线回归 | TASK-031 | deferred |
| TASK-033 | 全页面视觉审查与缺陷修复 | TASK-032 | deferred |
| TASK-034 | Compose部署与恢复演练 | TASK-033 | deferred |
| TASK-035 | 商业演示脚本与重复验收 | TASK-034 | deferred |
| [POC-001](poc/POC-001.md) | 场景校验器与公共类型 | — | accepted |
| [POC-002](poc/POC-002.md) | 实际媒体校验工具 | POC-001 | accepted |
| [POC-003](poc/POC-003.md) | 四阶段纯状态机 | POC-001 | accepted |
| [POC-004](poc/POC-004.md) | 统一Mock API与浏览器持久化 | POC-003 | accepted |
| [POC-005](poc/POC-005.md) | 确定性回放与操作隔离 | POC-003, POC-004 | accepted |
| [POC-006](poc/POC-006.md) | 接收并验证Scent Layering内容包 | POC-001, POC-002, POC-005 | deferred（完整媒体） |
| [POC-007](poc/POC-007.md) | 四步共享交互组件 | POC-001 | accepted |
| [POC-008](poc/POC-008.md) | A场景四步有限视觉原型 | POC-004, POC-005, POC-007；内容接入另依赖006 | accepted（框架） |
| [POC-009](poc/POC-009.md) | M1实际视觉门禁 | POC-008 | planned |
| [POC-010](poc/POC-010.md) | 分析与脚本版本编辑交互 | POC-009 | planned |
| [POC-011](poc/POC-011.md) | 脚本匹配的预置视频工作台 | POC-010 | deferred |
| [POC-012](poc/POC-012.md) | 模拟交付确认与尝试记录 | POC-011 | planned |
| [POC-013](poc/POC-013.md) | 真实交付文件导出 | POC-012 | planned |
| [POC-014](poc/POC-014.md) | 会话历史与可重复演示入口 | POC-013 | planned |
| [POC-015](poc/POC-015.md) | 接收B和C完整场景 | POC-006, POC-009 | planned |
| [POC-016](poc/POC-016.md) | 全链路及最终视觉演示验收 | POC-014, POC-015 | planned |

POC-001已accepted、FIX-POC-001-01已关闭；POC-002已accepted、两轮FIX关闭；POC-003已accepted、FIX-POC-003-01关闭；POC-004已accepted、FIX关闭；POC-005与007可同批实施，见DSH_HANDOFF_DEMO_FAST_01.md。TASK-007可复用已提交壳体，在核心页面集中review。POC-006/015必须等ChatGPT与实际素材；POC-009通过之前不启动POC-010–014大规模业务UI。

当前下一批见DSH_HANDOFF_DEMO_FAST_02.md：005/007已集中accepted；008首页/四步框架ready，A内容到齐后合并006接入，不用技术夹具填客户页面。

2026-11-05：POC-008首页/空态框架已accepted；A主链与M1整体未通过。下一批DSH_HANDOFF_DEMO_FAST_03.md，待收到A包后合并内容接收与页面接线。

当前任务：

| Task | 目标 | 依赖 | 状态 |
|---|---|---|---|
| NV-001 | 三场景内容/新profile/会话接线 | 已验收基础 | accepted |
| NV-002 | 首页/情报/脚本/分镜/回放 | NV-001实现 | accepted |
| NV-003 | 文案交付/真实下载/历史 | NV-001/002实现 | accepted |

完整白名单、冻结增量数据/API、视觉/测试/DoD与可复制DSH Prompt见DSH_HANDOFF_DEMO_FAST_04.md。旧表/附注为历史，不再要求MP4或逐任务停工。未自动派发，未宣布实现或accepted。

2026-11-05：NV批次主控已重跑128核心测试/39浏览器测试并实际截图审查；两处常见编辑/交付缺陷已复现，暂不accepted。下一任务FIX-NV-BATCH-01，见poc/fixes/FIX-NV-BATCH-01.md；不再做额外全量基础审计，不等视频。

2026-11-05最新：FIX-NV-BATCH-01主控accepted并关闭，NV-001/002/003集中accepted，M1仅content-only核心原型范围通过。见docs/reviews/FIX-NV-BATCH-01-ACCEPTANCE.md；9单元/7浏览器及实际ZIP通过，视频继续deferred，未启动下一任务。

## 当前Interactive产品任务

优先执行DSH_HANDOFF_DEMO_FAST_05.md；以下9任务同批按依赖连续实现，不逐项停工。旧NV accepted保留，新产品未实现/未验收。

| Task | 目标 | 状态 |
|---|---|---|
| [IP-001](interactive/IP-001.md) | 统一只读产品查询与业务投影视图 | ready |
| [IP-002](interactive/IP-002.md) | 显式编辑上下文与独立内容包导出 | planned |
| [IP-003](interactive/IP-003.md) | 六主路由、Overview与统一导航接线 | planned |
| [IP-004](interactive/IP-004.md) | Radar自由筛选、热点证据与Agent活动 | planned |
| [IP-005](interactive/IP-005.md) | 三营销机会与可解释策略详情 | planned |
| [IP-006](interactive/IP-006.md) | Atelier结果预览与按需编辑版本 | planned |
| [IP-007](interactive/IP-007.md) | Creative Library统一内容浏览与版本定位 | planned |
| [IP-008](interactive/IP-008.md) | Deliverables真实导出与次级模拟交付 | planned |
| [IP-009](interactive/IP-009.md) | 全站点击矩阵、跨页一致性与产品视觉验收 | planned |

资产补充任务目录：[AS-001–006](assets/INDEX.md)。新增119行矩阵为规格/待实测，不能据此宣称新资产产品通过。
