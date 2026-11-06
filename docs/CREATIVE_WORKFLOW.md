> 2026-11-04 范围更新：当前实施以 [Fully Mocked POC](POC_SCOPE.md) 为准。下文旧业务流程/后端/实时服务要求为历史，不能用于派发；当前数据/API/事件/状态机及验收见新POC文档。设计原则仍有效，具体四步布局见 pages/POC_WORKFLOW.md。本次未重做或撤销历史验收。

> 当前生效范围为[前端 Demo](FRONTEND_DEMO_SCOPE.md)。下文涉及后端、数据库、API与服务端任务的内容保留作未来参考，不是本期实施或验收条件。

# Creative 工作流

Campaign交接→Brief v1→用户编辑→选择Concept→生成渠道与语言变体→编辑/版本→审批→排期。Campaign名称、主题、目标、地区、受众、商品、概念、调性、渠道、内容计划、语言、建议发布时间为Brief字段。每次生成引用精确Brief版本与BrandGuidelines版本。

PresetProvider使用scenarioVersion+seed+operation+targetId稳定输出；LiveModelProvider支持OpenAI-compatible结构化JSON，超时/重试/校验错误独立记录。provider配置由服务端读取，密钥不送浏览器。失败响应不自动回退Preset；UI提供显式切换并记录generationMode。

支持instagram_caption、facebook_post、tiktok_script、pinterest_title/description、meta_headline/body、cta、hashtags；locale=en/ar。操作可只针对单字段、语气或语言；每次生成新AssetVersion，旧审批不变。编辑回退产生新版本且有parentVersionId。

Copilot输入targetType/targetId/baseVersion/instruction，输出结构化patch+diff+解释摘要；用户Apply后事务检查baseVersion，409处理冲突；不对无关字段“顺手优化”。审核通过内容修改必须新Draft，不能覆盖approvedVersion。

图像第一版模板组合真实授权商品图、背景与可编辑文字，输出PNG/JPEG实际文件；生成背景不改瓶身/标签。模板固定aspectRatio/安全边/字体/方向，阿文由浏览器排版，不逐字符绘制。审批前预览成品。
