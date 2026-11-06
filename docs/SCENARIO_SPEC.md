> 2026-11-04 范围更新：当前实施以 [Fully Mocked POC](POC_SCOPE.md) 为准。下文旧业务流程/后端/实时服务要求为历史，不能用于派发；当前数据/API/事件/状态机及验收见新POC文档。设计原则仍有效，具体四步布局见 pages/POC_WORKFLOW.md。本次未重做或撤销历史验收。

# 演示场景规范

所有信号与指标sourceType=DEMO；场景文本显式“illustrative scenario”，不宣称当前市场正在上涨。固定seed、固定UTC基准时间、固定事件顺序；商品事实与模拟营销假设分表。

| 场景 | 目的 | 范围 |
|---|---|---|
| A Scent Layering | UAE叠喷创意机会 | 全链路：信号→趋势→机会→Campaign→图文/视频→审批→日历→模拟反馈 |
| B Luxury Gifting | Dubai/Abu Dhabi礼赠规划 | 地区证据与Brief/渠道内容计划；后续步骤明确未展示 |
| C Oud Storytelling | 沉香文化创意 | 创意策略、官方商品身份、视觉与双语素材；不虚构文化权威背书 |

A建议事件点：0 run.started；5s signal.ingested；10s normalized/deduplicated；15s trend.clustered；20s scored；25s opportunity.created；30s explained；35s run.succeeded。这些时间是演示节奏，不是伪装实时采集耗时。

场景文件应包含scenario manifest、events、evidence、products引用、opportunity投影预期哈希、Brief preset、双语copy、render输入、模拟反馈seed。引用缺失会使seed验证失败。至少一个下降/平稳趋势、一个缺证据机会、一次可恢复生成失败，避免全绿假演示。

第三款真实产品完成核验前不伪造SKU；Scenario A可先用已确认两款的文字原型，品牌资产验收保持pending。
