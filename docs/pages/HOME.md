> 当前四阶段页面规格为 [POC_WORKFLOW.md](POC_WORKFLOW.md)。下文旧业务布局仅供历史参考，不按其生成独立页面。视觉系统仍沿用HTML标杆。

# Home / 演示入口规格

引用 ../DESIGN_SYSTEM.md、../UX_SPEC.md；路由 `/`。目标是选择/继续演示，不是管理指标墙。

桌面：统一侧栏与顶栏；标题“Marketing intelligence, made actionable”，页面标题29；下方一段16px说明。主区左约2/3为 Scenario A 场景故事与步骤（Signal → Opportunity → Campaign），右约1/3为最近项目列表，间18。下方B/C两行简短场景入口，不重复大卡片。主按钮“Start demo”，次按钮“Continue session”仅有会话时出现；DEMO标识与预计6分钟常驻。

场景切换只更新说明、封面与目标，不修改后台任务。开始→创建本地M1演示会话或M2 API会话→Radar；重复点击只一个会话。继续→恢复虚拟时间和页面上下文。无会话有明确空态；载入失败显示重试；未核验商品图显示真实“Brand artwork pending”，不画假香水瓶。

移动单列，先场景后最近项目；无固定底部按钮遮挡内容。M1用静态场景与本地 mock，显示“Prototype · DEMO”。

验收：1440/1366/390无页面横滚，主操作首屏可见；不超过一处实心主按钮；Tab顺序与视觉一致；截图保留标题、场景、待素材标记；刷新后可继续会话。三种场景不可全部声称端到端已实现。
