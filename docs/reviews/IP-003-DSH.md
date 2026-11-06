# IP-003 · 六主路由、Overview 与统一导航接线 · DSH 实施报告

日期：2026-11-05。状态：implemented（真实页面已由 IP-004..008 接线），等待主控集中 review；不自行 accepted。

## 变更

- `components/shell/{AppShell,Sidebar,icons,Header}`：Sidebar 六项真实 Link —— Overview / Intelligence Radar / Opportunities / Creative Atelier / Creative Library / Deliverables；无 Soon/disabled 分支；当前路由高亮 aria-current；Header 永久 `Demo · Mock data`；移动菜单/焦点/响应式保留。
- `app/page.tsx` 改为 Overview；新增/实现 `app/{radar,opportunities,opportunities/[opportunityId],atelier,library,deliverables}/page.tsx`，breadcrumb 与高亮一致，useSearchParams 页面包 Suspense。
- 新增 `components/product/Overview.tsx`：首屏用途 + Explore opportunities 主 CTA + Browse creative work + 三机会卡（真图/地区/产品/推荐摘要/View opportunity）+ Prepared creative work（真实 EN/AR 深链）+ Recent downloads（真实 export，空态 `Your downloads will appear here`，不伪造历史）。深色 hero H1 使用 ivory；按主控反馈已修正对比度。
- 新增 `components/product/NavigationGuard.tsx`：全局 Save/Discard/Cancel 保护，拦截内部链接、编辑器关闭、beforeunload；Save 失败保留编辑并显示错误；Discard 仅丢未保存编辑。
- `components/product/workspace.module.css`：六工作区共享布局/卡片/面板/响应式样式，仅用 design/tokens。
- 兼容：旧 `/poc/*` 路由保留；不进入客户导航；设计/证据不被覆盖。

## 验证（真实 exitcode）

| 命令 | exitcode | 证据 |
|---|---|---|
| `npm run typecheck` | 0 | evidence/product/ip-003/typecheck.log（稍后补最终） |
| `npm run build` | 0 | evidence/product/ip-003/build.log |
| `PLAYWRIGHT_PORT=3100 npm run test:e2e -- apps/web/tests/product-navigation.spec.ts` | 0（5 tests） | evidence/product/ip-003/navigation.log |

覆盖：六链接逐一点击/刷新/高亮/无 Soon；六路由干净浏览器直达均有真实内容且 sessions=0/exports=0；Overview 三机会/EN-AR/下载空态；breadcrumb 返回；脏稿 Cancel/Discard 不复活。

## 视觉证据

- 终版基线（IP-009 归档，修复后）：`evidence/product/ip-009/01-overview-1440.png`、`25-overview-1366.png`、`32-overview-390.png`；Radar/机会/Atelier/Library/Deliverables 终版见 `evidence/product/ip-009/26–31-*.png`。
- 修正前/后 Overview：`evidence/product/ip-003/smoke-overview.png` → `fixed-overview.png`（H1 由深色改 ivory，实测 color rgb(248,246,240)）。
- 六页冒烟：`evidence/product/ip-003/smoke-{overview,radar,opportunities,atelier,library,deliverables}.png`（过程证据，不作为终版基线）。
- 守卫：`guard-close.png`、`guard-campaign.png`。

## 主控反馈修正

- Overview 深色 hero H1 深字深底不可读 → 显式 ivory 色 `var(--on-dark)`，实测 rgb(248,246,240) on #191917；hero 正文与 CTA 层级复查通过。
- 终版截图统一使用修复后基线（`evidence/product/ip-009/`），不再用旧 smoke 图作为最终证据。

## 已知限制 / NOT_RUN

- 视频/媒体播放不在本批；`Layout preview` 不再出现在客户导航，但旧 `/poc/*` 仍兼容存在。
- 旧 `shell.spec.ts` / `poc-prototype.spec.ts` 中 “Soon/仅 Home” 断言与新规格冲突，按 IP-009 允许范围统一更正（不删核心测试）。
- 六页 1440/1366 终版截图、AR/窄屏在 IP-009 统一归档。
