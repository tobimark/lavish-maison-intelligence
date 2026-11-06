> 2026-11-04 范围更新：当前实施以 [Fully Mocked POC](POC_SCOPE.md) 为准。下文旧业务流程/后端/实时服务要求为历史，不能用于派发；当前数据/API/事件/状态机及验收见新POC文档。设计原则仍有效，具体四步布局见 pages/POC_WORKFLOW.md。本次未重做或撤销历史验收。

# 视觉质量门禁

当前：M1 **NOT_STARTED / NOT_ACCEPTED**。参考HTML成功运行不等于新系统通过验收。

## 必须提交的证据

提交代码版本或文件哈希、浏览器版本、字体实际加载、viewport/DPR、数据seed/场景/游标、截图与console/network结果。无Git时记录artifactHash，TASK-001后改commit+dirty状态。必须本地或实际部署访问，可使用Playwright；截图由主控打开查看。

M1页面：Home默认/加载失败；Radar默认/筛选空/错误/回放展开/证据抽屉；Atelier Brief/校验失败/EN/AR/版本/Copilot差异；共享按钮全部状态、Dialog/Drawer、toast、keyboard focus。1440全状态；1366/1920/390至少默认与最复杂浮层；200%缩放检查关键路径。

## 审查清单

- [ ] 色值、无衬线、黑侧栏、暖白主区、金色用量与HTML保持同一语言。
- [ ] 29px标题、16px正文、14px辅助；业务内容无9–12px文字；字号提升已按适配规范。
- [ ] 页面inset、18/24间距、12圆角、7按钮圆角统一；无密集KPI、无多余面板围主区。
- [ ] 单个操作区最多一个主按钮；所有可见按钮/筛选/表单/导航有明确可验证行为。
- [ ] Dialog/Drawer来自共享原语；Escape/遮罩/关闭/焦点圈/回焦/脏稿保护正确。
- [ ] 产品/Logo无失真、无假图；真实身份、资源原图、尺寸、来源和使用范围可核对。
- [ ] AR正确RTL、长文可读、SKU隔离；画布/字幕不压字。
- [ ] Loading/Empty/Error/disabled/pending/focus完整；错误保留编辑内容。
- [ ] 390px无document横溢；1366业务主体可见；200%能操作；Reduced Motion生效。
- [ ] DEMO/IMPORTED/LIVE、Preset、Simulated publish标记清楚且不可被Presentation Mode隐藏。
- [ ] 浏览器console无未处理异常；关键请求无意外失败；下载确实得到正确文件。

## 评分与放行

阻断项（P0/P1）：错误品牌/产品，字体不可读，破坏主构图，关键操作无效，来源伪装，越界遮挡，无法完成流程。任何一个存在则不通过。P2为局部可用性/一致性缺陷，M1验收前清零；P3微调需逐项记录主控接受理由。不能仅凭总分放行。

流程：DeepSeek提交→主控代码检查与浏览器实测→按问题生成FIX任务（具体文件/截图区域/预期/复现/验证命令）→DeepSeek修复→同状态复拍→主控人工复查→PO体验确认→更新gate记录。若执行入口缺失，修复任务保持待派发，不能冒充已修复。

gate记录必须含reviewer、reviewedAt、artifactHash、screenshots、interactionResults、issuesResolved、PO decision。当前tasks/gates.json不允许自动写accepted。
