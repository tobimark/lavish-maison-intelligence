> 2026-11-04 范围更新：当前实施以 [Fully Mocked POC](POC_SCOPE.md) 为准。下文旧业务流程/后端/实时服务要求为历史，不能用于派发；当前数据/API/事件/状态机及验收见新POC文档。设计原则仍有效，具体四步布局见 pages/POC_WORKFLOW.md。本次未重做或撤销历史验收。

> 当前生效范围为[前端 Demo](FRONTEND_DEMO_SCOPE.md)。下文涉及后端、数据库、API与服务端任务的内容保留作未来参考，不是本期实施或验收条件。

# 功能范围与可追踪性

| 需求域 | 覆盖内容 | 阶段 / 验证 |
|---|---|---|
| 数据源 | Pinterest/TikTok/Instagram/Google Trends/YouTube/Reddit/eBay/Amazon/Sephora/Fragrantica/Meta Ad Library/Shopify 未来 Adapter；首期 DEMO 与合法导入 | M3；无授权 LIVE 不可启用 |
| 持续 Agent | 调度、队列、输入输出、历史、失败重试、结构化事件；关浏览器继续 | M2；独立 worker 集成测试 |
| Replay | Run/Event/Session/Scenario、虚拟时间、1/2/4×、快照、刷新恢复、Presentation Mode、隔离重置 | M2；确定性与跨会话测试 |
| Intelligence | 标准化、去重、聚类、趋势序列、地区/兴趣/产品匹配、评分解释、风险、证据、机会历史与详情 | M3；同一服务计算分数 |
| Campaign | 机会交接、完整可编辑 Brief、创意方向、调性、渠道、双语、内容计划、建议时间 | M4；幂等和版本冲突测试 |
| 文案 | IG/FB/TikTok/Pinterest/Meta 标题正文、CTA、标签；独立再生成、语气、版本、回退 | M4；preset 与 live_model 可区分 |
| 图像 | 品牌库、主视觉、Post/Story/Pin/Ad 模板、组合编辑、预览、导出、版本 | M4；实际文件解码与尺寸检查 |
| Copilot | 目标对象修改，Brief/文案/镜头/字幕调整，明确变更差异 | M4/M5；只生成新目标版本 |
| 视频 | 15 秒、4 镜头、1080×1920 MP4、时长编辑、素材、双语字幕、片尾、封面、真实任务和错误 | M5；ffprobe 与人工播放 |
| 审批 | Draft/In Review/Changes Requested/Approved/Rejected；版本绑定、退回原因 | M5；状态机测试 |
| 日历 | 周/月、渠道、详情/预览、时间编辑、实际版本、Campaign | M5；时区与并发校验 |
| 模拟发布反馈 | 调度、成功失败、日志、统一曝光/点击/互动/转化及建议 | M5；全部标 Simulated |
| 场景演示 | A 完整，B 区域+规划，C 创意+视觉；5–8 分钟、跳关键事件、可重置 | M6；可重复 E2E |
| 前端 | 同一设计系统；Home、Radar、Atelier 核心原型先验收 | M1；截图+人工交互审查 |
| 部署 | Docker Compose、健康检查、数据种子、离线运行说明、演示脚本 | M6；从空卷安装与复演 |

不在首期：真实社媒发布、受限爬取、跨租户商业 SaaS 计费、复杂自治框架、实时从零生成所有视频画面、摄像头与人脸识别。系统可扩展接口保留，不实现空泛占位页面。

UAE/Dubai/Abu Dhabi/GCC 与 Oud/Amber/Musk/Rose/Layering/Gifting/Arabian Heritage 是关注维度，不表示市场已增长。趋势结论必须限定到 DEMO 场景和时间窗。
