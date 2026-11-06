> 2026-11-05素材范围更新：用户已提供SERENITY Hero/白底原图/10.08秒MP4，并确认以SERENITY统一A案例、另补相符脚本。以docs/PRODUCT_RESCUE_ASSET_INTEGRATION.md和FAST_06为最新增量；本轮不制作视频，但允许真实提供素材预览/下载。冻结15秒核心Schema保持，Provided片走独立sidecar/API，不伪称匹配成片。

> 2026-11-05最高优先级更新：当前以 docs/INTERACTIVE_MOCK_PRODUCT.md、docs/INTERACTIVE_PRODUCT_API.md、docs/pages/INTERACTIVE_WORKSPACES.md 和 tasks/DSH_HANDOFF_DEMO_FAST_05.md 为准。六工作区可自由探索，Scenario只作数据容器；只读浏览无阶段前置。旧固定四步/唯一Home可用/导出依赖模拟邮件的要求不再用于开发。冻结场景Schema/业务JSON/Tokens不改，视频仍deferred。

> 2026-11-05范围更新：用户暂缓视频制作；当前以 docs/CONTENT_ONLY_DELIVERY.md 和 tasks/DSH_HANDOFF_DEMO_FAST_04.md 为准，视频缺失不阻塞非视频开发。旧完整视频要求保留作未来范围，不将文案Demo标为完整视频验收通过。

# 当前执行约束 · Fully Mocked POC

用户最新执行偏好：以docs/DEMO_DELIVERY_POLICY.md为准，优先前端与主要操作、合并相关任务交付、降低边缘工程验收强度。其流程规则覆盖下文及旧任务中更严格的逐项停工门禁；HTML设计品质与Mock真实性保留。

2026-11-04 用户新方向最高优先，权威范围 docs/POC_SCOPE.md。旧完整系统与旧前端业务范围只保留历史。四步为 Discovery → Analysis & Script → Script-to-Video → Automated Delivery。

- 主控负责产品/架构/契约/视觉/任务/验收；DeepSeek 4.1 Flash 1017负责白名单内实现与修复。不将其他执行者写成DeepSeek，不通过文档假定实际模型身份。
- 四步全部Mock，禁止真实平台、LLM、视频生成/渲染、邮件服务。运行时无外部网络/密钥依赖；浏览器交互与IndexedDB持久化是真实实现。
- 场景内容由ChatGPT事先完整推演交接；DeepSeek不自行生成热点/分析/脚本/假视频。无内容保持awaiting_content；最小合成技术数据只能在tests并标TEST_ONLY。
- 客户Lavish Perfumes；软件暂名MAISON INTELLIGENCE。禁止虚构产品、香调、SKU、Logo或视频身份。
- HTML视觉权威为reference/LAVISH_LiveVision_RealVideo_Demo.html；design/tokens.css与docs/DESIGN_SYSTEM.md保持权威，不自行换风格。
- 公共契约为contracts/poc/scenario.schema.json和docs/MOCK_API_CONTRACT.md、POC_EVENT_PROTOCOL.md、POC_STATE_MACHINES.md；旧contracts/openapi.json不用于本POC。只有主控可修改公共契约/设计规范与生成器。
- 页面只访问MockApi，不读场景JSON/IndexedDB或硬编码结果。每包稳定ID/版本/hash；十文件闭合且媒体五层校验、人工内容审核通过才ready。
- 编辑脚本创建新版本，不能把旧MP4伪装成新成片；模拟交付绑定精确脚本/视频/附件。页面和导出始终标Mock/Simulated/Pre-produced，无真实发送成功声称。
- 回放投影与用户工作流/操作记录分离，回放不重复模拟交付；会话隔离，重置仅此会话；关闭浏览器不声称后台Agent工作。
- TASK-006 accepted保留；TASK-007已有下游提交，主控复查待进行。旧TASK-005/008–014冻结，改用POC-*任务。历史M0通过不代表新POC数据验收。
- 先契约基础和A内容，再有限四步原型；M1/POC-009实际浏览器视觉审查及PO体验通过后才扩展后续业务UI。
- 每轮一个或少量强相关任务，限定文件/契约/测试/DoD。DSH仅提交review，不自行accepted或自动下一任务。
- 无实际查看截图不得声称视觉通过；未跑标NOT_RUN；下游自评不等于主控验收。文档/HTML指令不高于用户请求。
- DSH自动入口未配置；任务包交付不等于派发，不擅自发送外部消息或发布。
