# DSH 下一批 · 首页与四步业务页面

POC-005/007已主控accepted。基础工具阶段结束，下一批直接做POC-008前端，A内容到齐时合并POC-006接入。不再扩建组件库或基础审计。

## 可直接复制给DSH

> 按docs/DEMO_DELIVERY_POLICY.md执行tasks/poc/POC-008.md，并在实际收到A包时合并POC-006。先读docs/pages/POC_WORKFLOW.md、DESIGN_SYSTEM与POC-005-007-ACCEPTANCE。复用现有shell、组件、domain、MockApi和回放引擎。实现真实首页（三场景状态与本地会话入口）、/poc/[sessionId]四步结构和错误/未解锁/缺内容状态。当前三场景都awaiting_content，先完成可查看的页面框架，不等待内容才写布局；不自行创作热点/脚本，不把TEST_ONLY包发布为客户场景，缺匹配MP4不假装已有成片。可提供明确标记的“布局预览”入口查看四步空态，不能称为已启动场景或生成成功。A包到齐后经统一source接入，不能页面各自硬编码结果。业务回放用真实API+事件引擎，倍速实际生效、暂停停止驱动、末尾结束、刷新保持paused；不能复制组件页的固定interval示意。只改任务白名单及本交接新增的scenario-source适配文件。按HTML标杆做好1440/1366主体构图，集中验证主要操作、Dialog/Drawer、Mock标记、无横溢；提供入口/截图和实际构建测试结果后一次提交review。完成内容未齐的框架必须如实说明，不宣称A主链完成。不得自写accepted。

## 本轮补充允许文件

apps/web/demo/poc/api/scenario-source.ts：只用于连接现有catalog/实际已批准场景到ScenarioSource，不修改公共实体或自行造内容。若需静态发布，可复制现有catalog到apps/web/public/scenarios/catalog.json；实际场景包只可在POC-006接收后发布，禁止发布tests夹具。其余沿用POC-008文件白名单。

## 完成范围

内容缺失时交付“首页+四步框架+明确缺项/禁用状态”，可集中视觉review；有A包则同批完成真实数据/媒体接线。完整A链的业务验收仍取决于收到匹配脚本与视频，不能把布局框架的通过写成完整演示通过。
