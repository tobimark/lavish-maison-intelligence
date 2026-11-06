# WS 网页端复核回传 - 本地定点裁决

日期：2026-11-06。范围：外部报告 P1（Library 同路径切换 Campaign 后的侧栏上下文）。

## 结论

**Changes requested，仅 P1 收口；正式结项等待此项修复及复验。** 既有功能/视觉 accepted 记录保留，本记录补充一个后来发现的上下文缺陷；不追改历史审批，不开展 P2 重设计。

外部报告的“静态风险”已在本地实际浏览器中复现。当前仍可做受控 SERENITY A 单案例演示；自主切换 Campaign 的链路存在串案例风险，不能宣称全部闭环已无缺陷。

## 实际复现

使用已有生产构建 Qn1edGDBs90rcVr7YkDrq，临时端口 3181，Playwright 干净浏览器，1440×900 / DPR1。没有运行旧 spec 或重建，没有修改生产源码；证据只写本目录，临时服务已关闭。

1. 打开 `/library?campaignId=scn-scent-layering.brief.main&scenarioVersion=1.1.0&language=en`，左栏为 A。
2. Campaign 原生 select 切为 `scn-luxury-gifting.brief.main`。URL 及列表变为 B（A Gesture, Considered）。
3. 读取左栏链接：Atelier、Deliverables 仍是 `campaignId=scn-scent-layering.brief.main&scenarioVersion=1.1.0&language=en`。
4. 点击左栏 Atelier，实际导航至 A；刷新仍为 A。
5. 浏览器返回 Library，列表仍是 B。用户看到的当前 Campaign 与左栏导航目标不一致。

另实测切 B 后 URL 仍携带原来的 `scenarioVersion=1.1.0`。这是版本残留的事实；单独打开 B+该版本的 Deliverables 显示无社媒内容的诚实空态，没有据此确认“借 A 素材”。该空态不能作为错误版本传播合理的依据，修复时需按 B 的实际公开版本解析，不能只删除 query 后让共享 helper 默认回填 A 的 1.1.0。

## 根因核查

- `AppShell.tsx` 的 `useEffect(...,[pathname])` 只在路径变化时从 window.location.search 复制上下文，同路径 query 更新不触发。
- `LibraryPage.tsx` 的 Campaign onChange 仅修改 campaignId，保留旧 scenarioVersion / versionId / sessionId。
- `workspace-routes.ts` 的默认 scenarioVersion 为 A 的 1.1.0，简单删除 scenarioVersion 并不证明 B/C 能得到合法版本。

## 证据

- `results.json`：各步 URL、Campaign、全部侧栏 href、页面文本、源码/构建 ID 前后 SHA256。
- `01-library-A.png` / `02-library-B-after-same-path-switch.png` / `03-atelier-after-sidebar-click.png` / `04-atelier-after-refresh.png` / `05-library-after-back.png` / `06-B-with-stale-A-version.png`。
- `probe.cjs`、`server.log`：独立复现脚本与临时服务日志。所有截图是本轮新证据，不冒充历史截图。

源码三文件与 BUILD_ID 前后 hash 一致；浏览器 pageerror 为空。此次只是确认缺陷，没有修复或重新验收全部 WS。

## 外部其他意见的裁决

- 功能/视觉：接受其材料级 Accepted with disclosed exceptions 的范围说明。
- 历史证据隔离：继续 Fail / 已披露事故；本次新证据不恢复原字节。
- P2 重复说明、预览下移：非本次阻塞，暂不派发。
- 390 阿语样本不足、失败/Retry UI：继续 Not verified / NOT_RUN，不伪标 pass。
- 真实接入、15 秒片、poster、AR 品牌审稿、生产矩阵：后续独立范围。
