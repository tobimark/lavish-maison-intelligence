# WS-003-DSH · Deliverables 成为社媒审阅/模拟发布工作台

日期：2026-11-06 · 状态：完成并提交集中 review（不自行 accepted）

## 实现

- 移除默认的 Hero 画廊/文件清单/邮件日志式首屏；H1 保留 Deliverables，说明 “Review your video and copy, then simulate a social post.”
- 首屏直接复用 `SocialStage({journey,onChanged,surface:"deliverables"})`：左 EN/AR 文案/Edit/Save/Review/Simulate，右 Instagram 视频帖子预览；同一真实 10.08s 3:4 provided MP4，native controls，不裁 9:16、不重生视频。
- 保留 silent refresh（保存/发布后不 remount，语言与编辑目标保持）、AR/EN 独立稿、准确确认框、重复 publish 保护、旧帖快照不变、NavigationGuard。
- 下载移入 `<details data-testid="deliverables-downloads">Downloads and content packs</details>`（默认折叠；B/C 可展开查看已有导出）；内部保留 Provided 三资产与 MP4 下载、原包/历史重下；模拟邮件仍是抽屉更次级。
- 帖子详情 `/campaigns/[id]/social/[attemptId]` 返回按钮改为 Deliverables 并带案例/版本/语言；左栏靠 pathname 高亮 Deliverables。
- B/C 不显示 SocialStage，显示“该版本未准备社媒”的诚实状态与已有下载。

## 验证

- `product-social-publish.spec.ts` **5 passed**：EN 保存/刷新/准确 Review/Simulate/详情；EN/AR 独立+RTL；未保存 guard；双击仅 1 attempt；发布后新 revision 旧帖不变。
- `product-asset-downloads.spec.ts` **3 passed**（真实 ZIP/MP4 原字节，展开下载折叠后可下载）。
- `product-cross-page.spec.ts` **4 passed**（含旧帖子/旧导出/下载原字节/刷新 Back/Forward）。
- 截图：`evidence/product/workspace-integration/ws-003/{deliverables-1440,deliverables-1366,deliverables-ar-1440,social-published-ar-1440,social-stage-ar-1366,social-stage-ar-390,social-post-detail-en/ar-1440}.png`。
- 数据：`simulated-post-snapshot.json`（1 条 published_simulated，EN，revision 3，video SHA 15d375…）。

## 限制

- 失败/Retry 真实 UI 无公开失败开关，E2E NOT_RUN；沿用 social-workflow 单测覆盖，未加假按钮。
- 下载折叠默认关闭（产品选择）；用户需展开后进行辅助下载，不影响主发布路径。
