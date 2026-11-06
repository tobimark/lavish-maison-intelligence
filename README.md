# Lavish AI Marketing — Fully Mocked POC

客户品牌Lavish Perfumes，软件暂名MAISON INTELLIGENCE。2026-11-04更新：四阶段均由场景预置结果驱动，真实实现前端交互、状态机、回放、本地持久化、媒体播放与文件下载。

Social Trend Discovery → AI Analysis & Script → Script-to-Video → Automated Delivery。

不调用真实外部平台、LLM、视频生成或邮件服务。三场景由ChatGPT事先推演提供数据，优先Scent Layering；内容和媒体未齐前不填大量假业务结果。

## 交接入口

1. [最终范围与架构](docs/POC_SCOPE.md)
2. [Scene Data Contract](docs/SCENARIO_DATA_CONTRACT.md) 与 [机器Schema](contracts/poc/scenario.schema.json)
3. [Mock API](docs/MOCK_API_CONTRACT.md)、[Agent事件](docs/POC_EVENT_PROTOCOL.md)、[状态机](docs/POC_STATE_MACHINES.md)
4. [ChatGPT内容接口](docs/SCENARIO_AUTHORING_GUIDE.md)、[媒体规则](docs/POC_MEDIA_RULES.md)
5. [四步页面规格](docs/pages/POC_WORKFLOW.md)、[HTML分析](docs/DESIGN_REFERENCE_ANALYSIS.md)、[设计系统](docs/DESIGN_SYSTEM.md)
6. [依赖图](docs/ROADMAP.md)、[DeepSeek交接单](tasks/DSH_HANDOFF_POC_01.md)、[任务目录](tasks/INDEX.md)
7. [端到端验收](docs/POC_ACCEPTANCE.md)、[当前状态](docs/STATUS.md)

当前可执行：npm run dev / typecheck / build；node scripts/poc/check-plan.mjs；node scripts/validate-baseline.mjs。

本轮新增的是契约与任务；场景校验器/Mock API/业务UI待DSH实现。TASK-006已验收、TASK-007已有提交待主控review，M1未通过；三场景awaiting_content。旧OpenAPI/完整系统文档仅为历史；reference视频不自动成为业务成片。
