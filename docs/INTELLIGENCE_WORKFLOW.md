> 2026-11-04 范围更新：当前实施以 [Fully Mocked POC](POC_SCOPE.md) 为准。下文旧业务流程/后端/实时服务要求为历史，不能用于派发；当前数据/API/事件/状态机及验收见新POC文档。设计原则仍有效，具体四步布局见 pages/POC_WORKFLOW.md。本次未重做或撤销历史验收。

> 当前生效范围为[前端 Demo](FRONTEND_DEMO_SCOPE.md)。下文涉及后端、数据库、API与服务端任务的内容保留作未来参考，不是本期实施或验收条件。

# Intelligence 工作流

SourceAdapter协议：`fetchBatch(cursor, window, regions) -> signals, evidence, nextCursor, sourceType`；DEMO离线seed，IMPORTED先校验manifest与授权声明，LIVE未配置返回未启用。归一化保留原词与标准topic；去重按source外部ID和标准内容fingerprint，不能删除证据来源。

确定性演示聚类：预置topic词表+区域+窗口，methodVersion固定；LLM可提供解释但不能随意变分数。Trend保存时间序列与comparisonWindow，缺比较期不声称增长。

机会评分 v1：momentum 30%、brandFit 30%、regionalRelevance 20%、evidenceQuality 20%，各项0–100，weighted sum四舍五入到整数；缺项记null并标incomplete，整体score=null，不按零或重分配掩盖缺数据。解释包含权重、原值、证据ID、计算版本；risk单列，不隐藏在总分。brandFit依据已核验产品与允许主张，不编产品香调。

例如DEMO输入80/85/90/70得82；前后端统一返回此值。机会模型完整含标题/简介/来源趋势/证据/地区/品牌契合/商品/渠道/方向/风险/来源/时间/更新历史。详情页必须能追溯每项证据，不能只显示一个数字。
