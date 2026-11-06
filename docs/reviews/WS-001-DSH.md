# WS-001-DSH · 案例上下文、旧 Journey 映射与左栏高亮

日期：2026-11-06 · 状态：完成并提交集中 review（不自行 accepted）

## 实现

- 新增 `apps/web/components/product/shared/workspace-routes.ts` 与 `useCampaignWorkspace.ts`：只读解析/生成 `campaignId`、`scenarioVersion`、合法 `language`；`workspaceHref`/`navHref` 统一上下文。
- 保留六菜单原名原顺序：Overview / Intelligence Radar / Opportunities / Creative Atelier / Creative Library / Deliverables；无 Soon/假入口。
- `AppShell` 在侧栏链接上携带当前 case/version（语言只带到 Atelier/Library/Deliverables）；`Sidebar` 高亮改为 pathname 归属：`/campaigns/.../brief` → Opportunities，`/campaigns/.../social/...` → Deliverables，不再用含 query 的整串比较。
- 旧 Journey 四 stage 全部 replace：insight→Radar、strategy→Opportunities、creative→Atelier、social→Deliverables；先 `getCampaignJourney` 验证 campaign/version，无效 stage/缺版本/未知案例显示可恢复错误，不静默回退。
- 旧 Journey 不再渲染第二套四段产品界面；原稿/帖子/导出 ID 与本地记录未改。

## 验证

- `npm run typecheck` exit 0；`npm run build` exit 0。
- `product-workspace-integration.spec.ts`（WS-001 部分）**5 passed**，覆盖六菜单顺序/无 Soon、上下文跨侧栏、四映射、无效上下文、brief/social detail 高亮、浏览零写入。
- 兼容性：`product-navigation` 5 passed；旧 `product-connected-flow` 改为兼容跳转/无写入测试 4 passed（保留核心上下文断言，不再要求旧四 tabs）。

## 证据

`evidence/product/workspace-integration/ws-001/**`（截图、日志）；导航截图：`01-overview-six-menus-1440.png`、`02-legacy-social-to-deliverables-1440.png`、`03-invalid-legacy-context-1440.png`、`04-social-detail-deliverables-active-1440.png`。

## 限制

- 旧 Journey URL 不再可读四段 UI，这是本次产品规格要求；历史链接可用但不保留第二套导航。
- FLOW/AS 业务数据/状态机未重写；只做路由/上下文迁移。
