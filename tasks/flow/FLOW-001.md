# FLOW-001 · 连贯案例投影与本地社媒状态

## Goal / Dependencies

在现有MockApi集中读取同一案例四段内容，并提供保存/审阅/模拟发布的本地状态。依赖IP/AS已实现基础；最终客户内容绑定依赖AS-003，新sidecar未到时可以完成代码和隔离测试，不能填假客户内容。

## Context

docs/CONNECTED_MARKETING_FLOW.md、docs/SOCIAL_MOCK_CONTRACT.md、DESIGN_SYSTEM.md、INTERACTIVE_PRODUCT_API.md、现有api/{types,product-contract,provided-asset-contract,product-queries,mock-api}.ts、storage/{types,memory,indexeddb}.ts、components/poc/browser-api.ts；原AgentEvent/邮件API只读保留。

## Allowed Files

- apps/web/demo/poc/api/flow-{contract,source,queries,commands}.ts（新增）
- apps/web/demo/poc/api/{mock-api,types,index}.ts；仅同门面依赖注入/实现导出，不改旧签名
- apps/web/demo/poc/storage/{types,memory,indexeddb,index}.ts；只添加socialWorkflows聚合及DB3无损升级
- apps/web/components/poc/browser-api.ts；返回组合新API类型，不强断言不存在方法
- scripts/poc/validate-campaign-presentation.mjs（新增小型sidecar检查，复用原加载器/校验帮助）
- tests/poc/{flow-projection,social-workflow}.test.ts；docs/reviews/FLOW-001-DSH.md；evidence/product/connected-flow/flow-001/**

## Functional / Visual / Data Requirements

按SOCIAL_MOCK_CONTRACT实现getCampaignJourney、SocialDraft/Attempt和prepare/get/list/save/review/simulate/getPost命令。只读不写，绑定精确Campaign/版本/packageHash、脚本/视频hash，旧包缺新sidecar返回pending。新字段独立组合契约，不破冻结Schema或旧types；同一MockApi与IndexedDB，Memory一致、DB2→3保留数据。审阅调用原script确认事实，不伪造确认；只发布已保存已审阅的精确文本/视频。正常重复点击幂等，存储后才返回成功；失败历史可重试，历史快照不改。无UI，不声称视觉通过。

## Acceptance / Tests

投影引用闭合/pending诚实；无浏览写入；DB迁移保留旧工作稿/导出；保存刷新、旧reviewHash拒绝、原子publish/幂等、修改不改已发快照。只测这些正常链路，不扩展生产级调度。

```powershell
npm run typecheck
npm run test:unit -- tests/poc/flow-projection.test.ts tests/poc/social-workflow.test.ts
```

## Deliverables / Failure / DoD / Prompt

交代码、相关测试真实exit与报告；出现双数据源、错误版本混用、提前成功、改冻结协议即未完成。依赖满足可连续进入FLOW-002，不自行accepted。

> 执行FLOW-001，先读两份主控flow规格，按Allowed Files实现集中Journey投影、presentation检查与社媒本地状态/命令。复用现有MockApi/存储，保护旧稿和导出；严格已保存审阅快照/幂等/错误反馈。新SERENITY包未到只写pending，不编客户内容。交相关验证与报告，继续同批相关任务，不自行accepted。
