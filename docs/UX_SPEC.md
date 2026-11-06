> 2026-11-05最高优先级更新：当前以 docs/INTERACTIVE_MOCK_PRODUCT.md、docs/INTERACTIVE_PRODUCT_API.md、docs/pages/INTERACTIVE_WORKSPACES.md 和 tasks/DSH_HANDOFF_DEMO_FAST_05.md 为准。六工作区可自由探索，Scenario只作数据容器；只读浏览无阶段前置。旧固定四步/唯一Home可用/导出依赖模拟邮件的要求不再用于开发。冻结场景Schema/业务JSON/Tokens不改，视频仍deferred。

> 2026-11-04 范围更新：当前实施以 [Fully Mocked POC](POC_SCOPE.md) 为准。下文旧业务流程/后端/实时服务要求为历史，不能用于派发；当前数据/API/事件/状态机及验收见新POC文档。设计原则仍有效，具体四步布局见 pages/POC_WORKFLOW.md。本次未重做或撤销历史验收。

# 通用交互规则

- 场景载入创建独立 ReplaySession，已有会话可继续；切换场景不删除 Campaign。当前模式与数据来源持续可见。
- 回放只有读投影权限。Create Campaign 是显式动作，显示将复制的机会、商品和证据摘要；成功后进入关联 Atelier。
- 所有编辑有 dirty/saving/saved/error 状态；离开时保护草稿；422定位字段，409提示版本冲突并允许比较后重试。
- 创建、重试、审批、发布命令禁重复点击，后端仍必须幂等。失败保留用户输入；可取消的工作明确取消后状态。
- 版本回退=从旧版本复制出新Draft，不修改历史；批准版本编辑=新Draft，原审批保持绑定旧版本；排期不得悄悄换版本。
- 所有生成显示 preset 或 live_model；真实生成失败保留错误，切换预置需用户显式动作。Copilot显示目标对象、差异与“应用为新版本”。
- 加载、空、无匹配、失败、权限不足、离线均用统一状态组件；不允许点击按钮只显示“功能即将到来”来充数。
- 全局 chrome 默认英文；双语创意以 EN/AR tab 呈现，AR 正确 RTL；不默认整个系统阿语翻转。
- 产品演示市场时间默认 Asia/Dubai，UI明确标注；数据库UTC。当前用户所在地 Asia/Shanghai 只用于项目沟通，不代替营销排期时区。

页面细节：[Home](pages/HOME.md)、[Radar](pages/INTELLIGENCE_RADAR.md)、[Atelier](pages/CREATIVE_ATELIER.md)。
