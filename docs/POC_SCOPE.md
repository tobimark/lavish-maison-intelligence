> 2026-11-05最高优先级更新：当前以 docs/INTERACTIVE_MOCK_PRODUCT.md、docs/INTERACTIVE_PRODUCT_API.md、docs/pages/INTERACTIVE_WORKSPACES.md 和 tasks/DSH_HANDOFF_DEMO_FAST_05.md 为准。六工作区可自由探索，Scenario只作数据容器；只读浏览无阶段前置。旧固定四步/唯一Home可用/导出依赖模拟邮件的要求不再用于开发。冻结场景Schema/业务JSON/Tokens不改，视频仍deferred。

> 2026-11-05范围更新：用户暂缓视频制作；当前以 docs/CONTENT_ONLY_DELIVERY.md 和 tasks/DSH_HANDOFF_DEMO_FAST_04.md 为准，视频缺失不阻塞非视频开发。旧完整视频要求保留作未来范围，不将文案Demo标为完整视频验收通过。

> 最新执行节奏：按docs/DEMO_DELIVERY_POLICY.md合并相关任务、聚焦前端与主链；已放行005+007同批实施，旧逐项停工要求不再适用。

# Lavish AI Marketing — Fully Mocked POC

版本 1.0 · 2026-11-04 · 当前业务与工程范围权威。用户本轮要求覆盖此前完整系统和前端 Demo 计划的冲突条目；HTML 标杆、品牌事实、已验收主题不变。

## 最终业务范围

| 阶段 / stage | 输入 | 可演示行为 | 输出与完成条件 |
|---|---|---|---|
| Social Trend Discovery / discovery | 场景中预置信号、证据、采集事件 | 播放采集过程、筛选信号、查看证据与模拟时间序列 | 已展示完整信号集，发现过程 completed |
| AI Analysis & Script / analysis | 同一场景的信号与证据 | 查看事先推演的分析、机会依据、Campaign Brief、EN/AR 完整广告脚本；编辑并保存本地版本 | 选定并确认一个脚本版本；分析与脚本 completed |
| Script-to-Video / video | 精确脚本版本、分镜、已交付 MP4 与素材清单 | 播放预置渲染事件、分镜定位、实际视频播放、封面/MP4 下载 | 与所选脚本匹配的文件校验通过，预置演示视频 ready |
| Automated Delivery / delivery | 精确脚本/视频/附件版本、模拟收件人和发送文案 | 预览邮件、修改模拟收件信息、确认模拟交付、失败/重试、查看交付记录与下载交付包 | 本地持久化 simulated_delivered 记录；从未发送邮件 |

四步共享一个 Scenario Package 与一份会话状态。A Scent Layering 优先打通黄金路径；B Luxury Gifting、C Oud Storytelling 最终也各有完整四阶段，不能把旧版缩短流程称为完成。内容未交齐时目录显示 Awaiting content，入口不可运行。

## 真正实现与全部模拟的边界

- 真正实现：前端交互、版本编辑、状态机、确定性回放、浏览器持久化、视频播放、实际文件下载、演示历史、单会话重置。
- 全部模拟：社媒采集、趋势推断与 AI 分析执行、LLM 脚本生成、视频生成与渲染、邮件/平台发送。内容来自 ChatGPT 事先业务推演与审核过的素材，运行时不调用模型。
- 持久化定义为同一浏览器/同一源的 IndexedDB；刷新与关闭再打开可恢复。不是服务器、多用户同步或后台持续 Agent。存储失败明确告知，本轮仅内存运行，不显示“已保存”。
- 前端唯一业务入口为 `MockApi` 异步接口；页面不直接 import JSON、访问 IndexedDB 或自行计算业务结果。静态 JSON 与媒体的同源读取不算真实外部服务。
- 运行时禁止外部平台、LLM、视频服务、邮件服务、遥测和远程字体网络请求。无需 API 密钥、FastAPI、PostgreSQL、队列、SSE、SMTP、Remotion 或服务端渲染。
- 日历、正式审批、多渠道发布、营销反馈 KPI、开放式 Copilot 本期不新增；脚本确认与交付确认是四步流程内的本地动作。旧计划保留为历史，不构成本期验收。
- 所有阶段、事件、文件预览、交付回执都明确标 Mock / Simulated；视频固定文字“预置广告视频 / Pre-produced video”。禁止“实时生成完成”“邮件发送成功”。Presentation Mode 也不能隐藏标识。

## 内容生产与交接

ChatGPT 交付 JSON、推演依据、假设与素材需求单；实际 MP4、Logo、产品照片必须有真实文件及权利/身份核验。JSON 内填写一个路径不代表已生成视频。没有文件时 package 不可 ready；开发者不得拿参考 HTML 视频顶替脚本对应成片。

程序员只制作明确 TEST_ONLY 的最小合成测试数据，不生产演示用热点、评分、广告脚本或假视频结果。三套场景均等待独立内容交接；本次仅冻结契约，不宣布收到完整场景。

## 架构与契约优先级

`UI → MockApi → command/state/replay engine → IndexedDB`；`MockApi → validated immutable ScenarioPackage → same-origin static media`。

唯一输入 Schema：`contracts/poc/scenario.schema.json`（JSON Schema 2020-12）。TypeScript 从它生成，不维护第二套手写业务类型；状态/事件/API 共享本目录契约。历史 `contracts/openapi.json` 是完整后端规划，不应用于本 POC。

阅读顺序：[Scene Data Contract](SCENARIO_DATA_CONTRACT.md) → [Mock API](MOCK_API_CONTRACT.md) → [事件协议](POC_EVENT_PROTOCOL.md) → [状态机](POC_STATE_MACHINES.md) → [场景生产规范](SCENARIO_AUTHORING_GUIDE.md) → [媒体规则](POC_MEDIA_RULES.md) → [验收标准](POC_ACCEPTANCE.md) → [任务图](ROADMAP.md)。

TASK-006 accepted 保留；TASK-007 已有提交、待主控复查，本轮不声称视觉验收。旧 TASK-005 的补齐样例要求撤销，旧业务页任务冻结并由 POC-* 任务替代。先完成契约基础和内容 A，再做一页四步原型；主控查看浏览器截图、PO 体验通过 M1 后才扩展其余业务界面。
