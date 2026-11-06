# TASK-007 交付报告：统一壳体、导航与响应布局

- 任务：[tasks/TASK-007.md](../../tasks/TASK-007.md)；依赖 TASK-006 已 accepted（[TASK-006-ACCEPTANCE.md](TASK-006-ACCEPTANCE.md)）。
- 执行模型：DeepSeek 4.1 Flash 1017（本会话执行者）；主控工程 Agent 负责实际网页/截图复核与裁决。
- 执行时间：2026-11-04 Asia/Shanghai；工作目录 `D:\workspace\maison-intelligence`。
- 状态：**review**（未自行 accepted，未修改 tasks/gates，未开始 TASK-008/Home/Radar/Atelier 业务开发）。
- 边界：本任务只是共享壳体和内部 QA 预览，**不代表 M1 总视觉门禁通过**。

## 1. 交付摘要

| 交付物 | 位置 |
|---|---|
| 共享壳体组件（AppShell、Sidebar、Header、Breadcrumbs、内联图标、壳体 CSS module） | [apps/web/components/shell/](../../apps/web/components/shell/) |
| 正式 Logo 副本 + 来源/限制说明 | [apps/web/public/brand/](../../apps/web/public/brand/)（`lavish-logo-primary-294x294-rgb.png`、`README.md`） |
| 内部 QA 预览页 `/shell-preview` | [apps/web/app/shell-preview/](../../apps/web/app/shell-preview/) |
| 壳体浏览器检查（8 项） | [apps/web/tests/shell.spec.ts](../../apps/web/tests/shell.spec.ts) |
| 证据（7 截图 + browser-report） | [evidence/m1/shell/](../../evidence/m1/shell/) |
| 本报告 | [docs/reviews/TASK-007-DSH.md](TASK-007-DSH.md) |

页面入口：`http://127.0.0.1:3100/shell-preview`（生产模式），dev 为 `http://127.0.0.1:3000/shell-preview`。未把 design-lab 套进业务导航；`/design-lab` 与 `/` 保持独立。

## 2. 文件清单与改动说明

| 文件 | 类型 | 说明 |
|---|---|---|
| `apps/web/components/shell/AppShell.tsx` | 新增 | 客户端壳体：折叠偏好（专用 localStorage 键）、≤1170 默认收起、移动菜单开关、Escape/点击遮罩关闭、焦点陷阱与回焦、背景滚动锁、skip link、内容容器 |
| `apps/web/components/shell/Sidebar.tsx` | 新增 | 品牌区（正式 Logo + MAISON INTELLIGENCE + by Lavish Perfumes）、Workspace 导航、Soon 禁用标记、折叠/关闭控件、可访问 tooltip |
| `apps/web/components/shell/Header.tsx` | 新增 | 77/66 顶栏：移动菜单按钮、面包屑、DEMO 标记；无账号/通知/搜索等未定义控件 |
| `apps/web/components/shell/Breadcrumbs.tsx` | 新增 | 语义化 breadcrumb，末项 `aria-current="page"`，与实际 `/shell-preview` 一致 |
| `apps/web/components/shell/icons.tsx` | 新增 | 一致的内联 SVG 图标，未引入 UI/图标依赖 |
| `apps/web/components/shell/shell.module.css` | 新增 | 壳体样式；只消费已验收 Tokens；桌面抽屉宽度/过渡、暗底侧栏、折叠 rail、移动覆盖菜单 |
| `apps/web/app/shell-preview/page.tsx` | 新增 | 内部 QA 预览：页面标题、自然段、简洁内容区、检查说明；非业务首页 |
| `apps/web/app/shell-preview/shell-preview.module.css` | 新增 | 预览页内容样式（卡片/正文/元信息/提示条） |
| `apps/web/public/brand/lavish-logo-primary-294x294-rgb.png` | 新增（字节复制） | 正式 Logo，SHA-256 与源文件一致（见 §3） |
| `apps/web/public/brand/README.md` | 新增 | 来源、哈希、alt、使用限制登记 |
| `apps/web/tests/shell.spec.ts` | 新增 | 8 项壳体浏览器检查 |
| `docs/reviews/TASK-007-DSH.md` | 新增 | 本报告 |
| `evidence/m1/shell/**` | 新增 | 7 张壳体截图 + `browser-report.json` |
| `apps/web/app/layout.tsx` | **未改** | 保留 TASK-006 验过的 Token 标准导入与字体入口，无需集成 |
| `apps/web/app/design-lab/**`、`apps/web/styles/*`、`design/tokens.css`、配置/依赖 | **未改** | 见 §8 回归与约束 |

## 3. 正式 Logo 接入证明

复制方式（原样字节复制，无重绘/裁切/压缩/滤镜）：

```powershell
Copy-Item assets/brand/lavish-logo-primary-294x294-rgb.png apps/web/public/brand/lavish-logo-primary-294x294-rgb.png
```

| 校验项 | 结果 |
|---|---|
| 源文件 | `assets/brand/lavish-logo-primary-294x294-rgb.png`，114,691 B |
| 目标文件 | `apps/web/public/brand/lavish-logo-primary-294x294-rgb.png`，114,691 B |
| SHA-256（源=目标） | `f504781a6a6bbfd7f0f9a51ac077dc37e54c41dba96060667f38992d136f3966` |
| 浏览器实际响应 | `/brand/lavish-logo-primary-294x294-rgb.png` → 200；`naturalWidth/naturalHeight = 294×294` |
| 渲染尺寸 | 44×44 CSS px（2× DPR 下 88 px，低于 294 母版 ≤147 px 的建议上限） |
| 完整性 | `object-fit: contain`、`filter: none`、`border-radius: 0`；无外框裁切/圆角遮罩；方形完整显示 |
| alt | “Lavish Perfumes official logo”；阿语 alt 仍按回执保持 pending，不自撰官方译名 |
| 权利 | 内部 Demo（M1–M5）approved；对外发布仍需客户书面授权与透明/矢量母版（见 logo-receipt） |

## 4. 壳体结构与导航行为

- **可复用结构**：`AppShell` 通过 `children` 接收页面内容；`breadcrumb` 由页面传入；Sidebar/Header/Breadcrumbs 为独立组件，后续 Home/Radar/Atelier 直接复用，不写死业务内容。
- **品牌区**：正式 Logo + 软件名 `MAISON INTELLIGENCE` + 准确品牌名 `Lavish Perfumes`；窄侧栏自动两行排布，不溢出、不缩字号。
- **导航**：`Home`（真实目标 `/`，可点击）／`Intelligence Radar`（禁用，Soon）／`Creative Atelier`（禁用，Soon）。未实现项使用 `disabled` + `aria-disabled="true"` + `title` + 可见 Soon 文案，不跳 404、不弹 toast 假装打开；`/shell-preview` 不是导航目的地，因此**没有伪造 `aria-current`**。
- **顶栏**：面包屑 `MAISON INTELLIGENCE / Internal shell preview`（末项 `aria-current="page"`）、清晰 `DEMO` 标记、移动菜单按钮；无账号/通知/搜索占位。
- **宽度/尺寸**：侧栏 246（≥1451）/ 222（881–1450）/ 78（收起）/ ≤1170 默认收起；≤880 覆盖式移动菜单；顶栏 77/66；内容边距 38/27/16、最大宽 1700；触控控件 ≥44 px；正文 16、操作 15、辅助 14；页面标题沿用 29（手机 25），未为塞内容缩字号。
- **折叠状态**：专用 localStorage 键 `maison-intelligence:shell:sidebar-collapsed`；SSR 与首次客户端渲染均为展开态，`useEffect` 后恢复偏好，无 hydration 报错；localStorage 读取/写入异常均 try/catch，失败时保持稳定默认并允许本次会话内折叠。
- **折叠控件**：可访问名称 + `aria-expanded` + `title`；折叠态 hover/focus 显示 tooltip；暗色侧栏焦点环使用 Token `--focus-on-dark`（实测 `rgb(235,214,174)`，2 px solid），不使用适合浅底的深金色焦点色。
- **移动菜单**：仅壳体自实现（未提前建设 TASK-009 浮层组件库）；打开时焦点进入抽屉、Tab/Shift+Tab 循环、Escape/关闭按钮/点击遮罩均可关闭并回焦触发按钮；打开期间 `body` 滚动锁定且主工作区设为 `inert`；关闭后菜单不占内容宽度。
- **动效**：使用 180/220 ms Tokens；`prefers-reduced-motion` 下侧栏/跳过链接过渡关闭。

## 5. 实际命令、退出码与结果

| 命令 | exit | 结果 |
|---|---|---|
| `npm run typecheck` | **0** | `tsc --noEmit` 无错误（含新壳体与测试） |
| `npm run build` | **0** | Next 16.4.4 Turbopack；`/`、`/design-lab`、`/shell-preview`、`/_not-found` 全静态；无警告 |
| `npm run test:e2e -- theme.spec.ts shell.spec.ts` | **0** | **16 passed（47.0 s；重复运行 46.7–47.4 s）**：shell 8 项 + theme 8 项 |
| 截图确定性 | — | 同一实现连续 2 次整套重跑，7 张 shell 截图字节/哈希完全一致 |
| `node scripts/validate-baseline.mjs` | **NOT_RUN** | 不属于本任务命令，且会改写白名单外文件；未执行，不声称通过 |

浏览器实测：Chromium 156.0.8078.4 / Playwright 1.64.1，DPR=1、headless、生产构建；console error / pageerror / 失败请求 / 外部请求均为 **0**；字体与 Logo 均同源加载。`/design-lab` 的 8 项检查全部通过，主题证据目录 9 张截图哈希与 TASK-006 accepted 时一致（无字体/AR/Token 回归）。

## 6. 壳体检查清单（shell.spec.ts，8 项）

1. Logo 真实加载（200、294×294、44 CSS px、contain、无滤镜/圆角、alt）、面包屑、DEMO、标题、无账号/搜索控件、console/网络干净。
2. 响应式断点：1920/1440/1366 侧栏 246/222/222；1170 默认 78；1171 为 222；881 为 78；880 出现移动菜单按钮且侧栏 off-canvas。
3. 桌面折叠：222↔78、`aria-label` 切换、localStorage 写入 `true`/`false`、刷新恢复、hover/focus tooltip、暗底焦点环。
4. localStorage 不可用：无 pageerror；壳体稳定展开；折叠仍在本会话生效，刷新回到稳定默认（不持久化）。
5. 导航：仅 Home 可点；Radar/Atelier 禁用且带 Soon；程序化点击不改变 URL、不请求 `/radar`、`/atelier`、不出现假 toast；无伪造 `aria-current`。
6. 移动菜单：键盘（Enter）打开；焦点进入关闭按钮；Shift+Tab/Tab 在抽屉内循环；Escape、可见关闭按钮、点击遮罩三种关闭均回焦触发按钮；背景滚动锁定/恢复；主工作区 inert；390 无横溢。
7. 四尺寸 1920/1440/1366/390：document/body 无横溢；顶栏高度 77/66；内容边距 38/27/16；桌面主内容从侧栏右侧开始、未被遮盖；移动主内容占满 390。
8. 证据截图：4 尺寸默认、1440 折叠、390 菜单打开、1440 键盘焦点；7 张全部 >5 KB 并写入 `browser-report.json`。

## 7. 证据截图（已逐张实际查看）

| 文件 | 视口/状态 | 实际像素 | 字节 | SHA-256（前 16） |
|---|---|---|---|---|
| [shell-1920x1080-default.png](../../evidence/m1/shell/shell-1920x1080-default.png) | 1920×1080 默认 | 1920×1080 | 159,458 | `176387dab04905f3` |
| [shell-1440x900-default.png](../../evidence/m1/shell/shell-1440x900-default.png) | 1440×900 默认 | 1440×900 | 143,951 | `96dd46b3c8e1dff2` |
| [shell-1366x768-default.png](../../evidence/m1/shell/shell-1366x768-default.png) | 1366×768 默认 | 1366×768 | 119,832 | `beccb30150f563a5` |
| [shell-390x844-default.png](../../evidence/m1/shell/shell-390x844-default.png) | 390×844 默认 | 390×844 | 71,712 | `d07e8d81c8e45bed` |
| [shell-1440x900-collapsed.png](../../evidence/m1/shell/shell-1440x900-collapsed.png) | 1440×900 桌面折叠 | 1440×900 | 128,580 | `5dcdb582aa111267` |
| [shell-390x844-menu-open.png](../../evidence/m1/shell/shell-390x844-menu-open.png) | 390×844 移动菜单打开 | 390×844 | 33,935 | `a1f6cd29ec576b1a` |
| [shell-1440x900-focus.png](../../evidence/m1/shell/shell-1440x900-focus.png) | 1440×900 键盘焦点（Home） | 1440×900 | 144,914 | `d06ec88a691693ad` |

说明：壳体截图采用**视口截图**而非整页截图，以正确呈现固定侧栏/顶栏的应用构图；页面可正常纵向滚动，横溢在测试中单独覆盖。`browser-report.json` 记录浏览器版本、Logo 实测、7 个断点、折叠/tooltip/焦点环、移动菜单状态、截图清单与零错误诊断。

## 8. 约束与回归确认

- **Token 未改**：`design/tokens.css` SHA-256 仍为 `07f8b08de74dde44ecdb6dad8b0d107233f394085d7aed3405b619aad5c01814`；壳体只消费既有颜色/字号/间距/圆角/动效 Tokens，无第二套色板。
- **未改** Next/TS 配置、依赖版本、`apps/web/app/layout.tsx`、`globals.css`、design-lab 页面/样式、数据契约、backend、tasks/gates、其他证据目录；未新建 `packages/*`；未引入 UI 框架或图标包。
- **未开发业务页面**：没有新建 Home/Radar/Atelier 空壳冒充成果；`/` 仍是 Foundation ready；Radar/Atelier 仅禁用入口。
- **design-lab 回归**：theme.spec.ts 8 项通过，9 张主题截图哈希与 accepted 版本一致。
- **可访问性**：语义 breadcrumb/landmark、skip link、可见焦点（暗底用 on-dark Token）、触控 44 px、禁用态可辨识、`inert`+焦点陷阱+滚动锁；未做 Axe 扫描（见 §9）。
- **颜色对比**：暗侧栏文本使用 Token `--nav-text`/`--on-dark`；禁用项保留可读对比并额外标注 Soon，不仅靠透明度传达。

## 9. 已知限制与需主控决定事项

1. **范围**：`/shell-preview` 是内部 QA 页，不是业务 Home；Home/Radar/Atelier 页面与抽屉/浮层组件库分别属于后续任务，未提前实现。
2. **语言**：壳体界面为英文（与 DESIGN_SYSTEM/参考一致），未构建阿语侧栏导航；TASK-006 的 AR 规则仍仅在 design-lab 验证。若 M1 要求阿语壳体，请主控下发范围/文案。
3. **LocalStorage**：偏好按浏览器/源保存；禁用或清理存储时回退稳定默认（已测）。多标签页之间未做跨窗口同步（未要求）。
4. **Tooltip**：折叠 rail 的 hover/focus tooltip 为壳体自实现 CSS + 原生 `title` 兜底；移动抽屉不显示 tooltip（显示完整标签）；未建设通用 Tooltip 组件库。
5. **截图**：视口截图；未做像素 diff/视觉回归基线（当前用哈希证明同实现可重复）。字体来自本地 Inter；若系统缺少字体，截图只在受控 Chromium 下有基准。
6. **未执行**：Axe/自动可访问性审计、200% 缩放、Firefox/WebKit、真实屏幕阅读器、后端联调（本任务无 API）；均 NOT_RUN，不报告通过。
7. **Logo 权利**：仅内部 Demo approved；对外发布前需书面授权与透明/矢量母版，且阿语 alt 待客户审。
8. **M1 门禁**：未修改 `tasks/gates.json`；M1 仍未通过。完成后停止，等主控 review；不继续 TASK-008 或 Home/Radar/Atelier。

## 10. 复现入口

```powershell
npm ci
npm run typecheck
npm run build
npm run test:e2e -- theme.spec.ts shell.spec.ts
npm run start --workspace @maison/web -- -p 3100
# 打开 http://127.0.0.1:3100/shell-preview
# 证据：evidence/m1/shell/（7 截图 + browser-report.json）
```

主控可直接查看实际页面（桌面折叠→刷新、≤1170 默认收起、≤880 菜单、Escape/回焦、Tab 焦点）与 7 张截图。如需 FIX，请指出视口/状态、预期与实际、复现步骤；我在 TASK-007 白名单内修复并重跑、重拍。本报告不代替主控验收，也不改变任务状态。
