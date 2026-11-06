# TASK-006 交付报告（含 FIX-TASK-006-01 修复）

- 任务：TASK-006（M1-01）→ 主控复核 **changes_requested** → 执行 FIX-TASK-006-01（见 [FIX-TASK-006-01.md](../../tasks/fixes/FIX-TASK-006-01.md)、审查记录 [TASK-006-MAIN.md](TASK-006-MAIN.md)），当前状态 **review**。
- 实际执行模型：DeepSeek 4.1 Flash 1017（本会话执行者）；主控工程 Agent 负责代码与浏览器视觉审查。
- 执行时间：2026-11-03 22:30–2026-11-04 00:36 Asia/Shanghai；工作目录 `D:\workspace\maison-intelligence`。
- 范围：只修 AR 整页排版覆盖、改为标准 Token 导入、补充整页 AR computed-style 断言、更新文案/报告、重跑命令与重拍截图。**没有**改 Token、Next 配置、tsconfig、依赖版本、后端、业务页面或门禁，**没有**建立 `packages/tokens`，**没有**开始 TASK-007。
- 边界：本报告不宣称 M1 通过；M1 总门禁仍由主控/PO 决定。

## 0. 逐项回应主控 changes_requested（P2 + 裁决事项）

| 主控发现 / 裁决 | 本轮修复 | 证据 |
|---|---|---|
| **P2 AR 整页样式未覆盖**：h1/type-sample-0 字距 −1.16px、区域标题 −0.216px、短标签 1.92px；正文/说明 16px/25.6px（1.6）而非 1.8 | 在 [design-lab.module.css](../../apps/web/styles/design-lab.module.css) 末尾新增 `[lang='ar']` 后代覆盖（高特异性）：真实阿文标题/区域标题/普通标签 `letter-spacing: 0`；正文与长说明 `line-height: var(--leading-ar)`；标题保留自身 1.22/1.35 行高。页面仅对必要元素补 `lang`/`bdi`，未对全部后代设 RTL/阿文字体 | 新增第 8 项 e2e 断言读取 h1、区域标题、type-sample-0/2/5、内容正文、页面说明的 computed style（AR 与 EN 各一遍）；截图见 §5 |
| **AR 字号样例元信息不真实**（AR 仍显示 `.16em` / `-0.04em` / 1.6） | AR 时 metadata 改为真实规则：`29 / 1.22 / 630 / 0`、`18 / 600 / 1.35 / 0`、`16 / 1.8`、`15 / 500 / 1.8`、`14 / 1.8`、`12 / 600 / 0`；EN 保持原 metadata | 测试断言 AR 页面出现 `16 / 1.8`、不再出现 `-0.04em`/`.16em`；切回 EN 后 `-0.04em` 恢复可见 |
| **Token 加载方式**：真实 layout 位于 `apps/web/app`，正确路径是 `../../../design/tokens.css`；不再概括为 Next 拒绝所有工作区外导入 | [layout.tsx](../../apps/web/app/layout.tsx) 改为标准导入 `import '../../../design/tokens.css';` + `globals.css` 一次加载；**删除** `loadDesignTokens`、`fs`/`path` 读取、`turbopackIgnore` 与 `<style>` 内联。构建实际通过（exit 0） | build 输出/exit code（§4）；生产 CSS chunk 内含 Token（`--canvas:#f6f5f2`）；预渲染 HTML 中 `id="design-tokens"` 内联 style 为 0 |
| **不得复制 Token、不建新 workspace** | 根 `design/tokens.css` 是唯一源，未复制；`packages/tokens` 未创建；Token 文件 SHA-256 保持 `07f8b08d…1814` | 文件哈希与 §7 HMR 实验（临时改动已按字节还原并校验哈希） |
| **HMR 说明需准确**：dev 中根 CSS 变化是否可观察、是否需刷新/重启 | 在 dev（端口 3300）做临时可恢复实验：临时改 `--canvas` 后 **8 秒内页面不自动更新**（HMR 不生效）；**刷新页面后生效**；**无需重启 dev server**。恢复原值后同样需刷新回到原值；前后 SHA-256 完全一致，未提交 Token 改动 | [dev-token-hmr.json](../../evidence/m1/theme/dev-token-hmr.json)（含 baseline/改后/恢复后值、等待时间、`requiresDevServerRestart=false`） |
| **生产行为**：静态成品不能靠刷新重读源文件 | 生产路由为静态预渲染：改 Token 后必须 **重新 `npm run build`** 再 `next start`；不能声称刷新静态成品会重读源文件 | build 路由为 Static；报告 §7 |
| **测试只测专用 arabic-sample 块**，不构成 AR 整页证据 | 新增整页 AR computed-style 测试（8 项测试之一），覆盖真实 h1、`#typography-title` 区域标题、type-sample-0/2/5、内容正文、页面说明；再切 EN 验证原排版（−1.16px / 1.92px / 25.6px） | `apps/web/tests/theme.spec.ts` 第 303 行起；8 passed |
| **页面 footer / 报告残留“Token 由 layout 原样内联”** | footer 文案改为 “imported once by the root layout”（AR 同步为“يُستورد مرة واحدة”）；`globals.css` 头注释改为标准导入；本报告全部改为标准导入描述 | 页面截图 footer；本报告 |
| 其它主控裁决（e2e 启动、AR 文案、Logo、NOT_RUN） | 按裁决保留，不扩大范围：e2e 仍“先 build + 生产模式”；AR 文案仍标待本地化；Logo 留待 TASK-007 白名单开放；Axe/200% 缩放/其它浏览器仍 NOT_RUN，不写成通过 | §9 |

## 1. 交付摘要

| 交付物 | 位置 |
|---|---|
| 唯一 Token 源（只读引用，未修改、未复制） | [design/tokens.css](../../design/tokens.css)（SHA-256 `07f8b08de74dde44ecdb6dad8b0d107233f394085d7aed3405b619aad5c01814`） |
| 全局样式入口（字体 + 基础元素 + Reduced Motion） | [apps/web/styles/globals.css](../../apps/web/styles/globals.css) |
| 根布局（标准导入根 Token + globals，一次加载） | [apps/web/app/layout.tsx](../../apps/web/app/layout.tsx) |
| `/design-lab` 页面与 AR 覆盖样式 | [apps/web/app/design-lab/page.tsx](../../apps/web/app/design-lab/page.tsx)、[design-lab-page.tsx](../../apps/web/app/design-lab/design-lab-page.tsx)、[design-lab.module.css](../../apps/web/styles/design-lab.module.css) |
| 本地字体与许可 | [apps/web/public/fonts/](../../apps/web/public/fonts/)、[licenses/README.md](../../apps/web/public/licenses/README.md) |
| 浏览器检查（8 项）与配置 | [apps/web/tests/theme.spec.ts](../../apps/web/tests/theme.spec.ts)、[playwright.config.ts](../../playwright.config.ts) |
| 证据（9 截图 + 2 JSON） | [evidence/m1/theme/](../../evidence/m1/theme/)：`browser-report.json`、`dev-token-hmr.json` |

未修改：`design/tokens.css`、`docs/DESIGN_SYSTEM.md`、`docs/ARCHITECTURE.md`、`docs/DATA_MODEL.md`、`contracts/openapi.json`、`backend/**`、`apps/web/app/page.tsx`、`apps/web/next.config.mjs`、`apps/web/tsconfig.json`、依赖版本、`tasks/**`。白名单外落盘仅有构建/测试忽略产物（`.next/`、`node_modules/`、`test-results/`、`next-env.d.ts`）。

## 2. 本次修复的文件改动

| 文件 | 改动 |
|---|---|
| [apps/web/app/layout.tsx](../../apps/web/app/layout.tsx) | 改为 `import '../../../design/tokens.css'` + `import '../styles/globals.css'`；删除 fs/path 读取、`loadDesignTokens`、`turbopackIgnore`、内联 `<style>`、`<head>` 手工节点；保留 metadata 与 `<html lang="en"><body>` |
| [apps/web/styles/design-lab.module.css](../../apps/web/styles/design-lab.module.css) | 末尾新增 AR 排版覆盖区：`[lang='ar']` 下的标题/区域标题/标签 `letter-spacing: 0`；正文与长说明/辅助 `line-height: var(--leading-ar)`；标题保持 1.22/1.35；不设 font-family/direction，不波及 `lang='en'`/`bdi` 技术串 |
| [apps/web/app/design-lab/design-lab-page.tsx](../../apps/web/app/design-lab/design-lab-page.tsx) | AR 字号样例 metadata 按真实阿文规则切换；footer Token 说明改为标准导入；必要 `lang`/`bdi` 标记：eyebrow、产品名、levelValue/Token 名/尺寸值、`footerMeta`、阿拉伯块英文注释（`lang="en"`），保留 SKU/产品名 bdi 隔离 |
| [apps/web/styles/globals.css](../../apps/web/styles/globals.css) | 仅更新头部注释（不再写“内联”）；字体、基础样式、Reduced Motion 逻辑不变 |
| [apps/web/tests/theme.spec.ts](../../apps/web/tests/theme.spec.ts) | 新增整页 AR/EN computed-style 测试；Reduced Motion 断言改为按毫秒数值比较（标准导入后 CSS 压缩会把 `0ms`→`0s`、`220ms`→`.22s`）；保留字体离线、四尺寸双语无溢出、真实控件、焦点、Reduced Motion 检查 |
| [docs/reviews/TASK-006-DSH.md](TASK-006-DSH.md) | 本报告（逐项回应主控） |
| `evidence/m1/theme/**` | 重拍 9 张截图 + 新 `browser-report.json` + `dev-token-hmr.json`（HMR 实验） |

## 3. 字体（未变）

| Family | 包（精确锁定） | 字体版本 | 字重 | 子集文件 | 字节 | 许可 |
|---|---|---|---|---|---|---|
| Inter | `@fontsource-variable/inter@5.3.0` | v20 | 100–900 可变 | latin 48,256 / latin-ext 85,068 | 同左 | OFL-1.1 |
| Noto Sans Arabic | `@fontsource-variable/noto-sans-arabic@5.3.0` | v33 | 100–900 可变 | arabic 165,960 / latin 31,416 | 同左 | OFL-1.1 |

加载方式不变：`globals.css` 的 `@font-face` 指向同源 `/fonts/*.woff2`（`font-display: swap`）；无 Google Fonts/CDN；完整 SHA-256/版权见 [licenses/README.md](../../apps/web/public/licenses/README.md)。实测 3 条字体请求全 200、外部请求 0、阻断非本机请求后页面/字体仍可用。

## 4. 实际命令、退出码与关键输出

| 命令 | 退出码 | 关键输出 |
|---|---|---|
| `npm run typecheck` | **0** | `tsc --noEmit` 无错误（含测试文件） |
| `npm run build` | **0** | Next 16.4.4 Turbopack：`/`、`/design-lab`、`/_not-found` 全 Static；无 Turbopack 警告；构建 CSS chunk 内含 Token（`--canvas:#f6f5f2`）；预渲染 HTML 无 `id="design-tokens"` 内联 style |
| `npm run test:e2e -- theme.spec.ts` | **0** | **8 passed（21.2s；多次重跑 21.1–21.7s）**，真实执行 `apps/web/tests/theme.spec.ts` |
| dev HMR 探针（附加验证，非验收命令） | 0 | 临时改 Token → 8s 内页面不自动更新；刷新后生效；无需重启 dev；恢复原值哈希一致（[dev-token-hmr.json](../../evidence/m1/theme/dev-token-hmr.json)） |
| `node scripts/validate-baseline.mjs` | **NOT_RUN** | 不属于本修复任务命令，且会改写白名单外 `evidence/baseline-validation.json`；未执行，不声称通过 |

浏览器实测（`browser-report.json`，Chromium 156.0.8078.4 / Playwright 1.64.1，DPR=1，headless）：console/pageerror/失败请求/外部请求/字体 404 均为 **0**；四尺寸 × EN/AR 共 8 组 `scrollWidth == innerWidth`、越界元素 0；焦点环 `2px solid rgb(129,99,51)`；Reduced Motion 下 token 计算值为 `0s`（等价 0ms）、过渡 `1e-05s`、`scroll-behavior:auto`，恢复 `no-preference` 后 token `.22s`（等价 220ms）。

## 5. 预览命令与截图

```powershell
npm ci
npm run dev                                         # http://127.0.0.1:3000/design-lab（dev 已实际启动验证）
npm run build
npm run start --workspace @maison/web -- -p 3100    # http://127.0.0.1:3100/design-lab
npm run test:e2e -- theme.spec.ts                   # 需先 build
```

截图（`evidence/m1/theme/`，DPR=1、固定样例内容；除焦点图为 1440×900 视口截图外均为整页截图；同一实现连续 3 次重拍哈希一致；本人已实际查看 EN/AR/移动/焦点图）：

| 文件 | 视口 | 语言 | 实际像素 | 字节 | SHA-256（前 16） |
|---|---|---|---|---|---|
| [design-lab-1920x1080-en.png](../../evidence/m1/theme/design-lab-1920x1080-en.png) | 1920×1080 | EN | 1920×2141 | 326,097 | `53bbf31ce47e2920` |
| [design-lab-1920x1080-ar.png](../../evidence/m1/theme/design-lab-1920x1080-ar.png) | 1920×1080 | AR | 1920×2130 | 315,230 | `5b839bdc65ee97a6` |
| [design-lab-1440x900-en.png](../../evidence/m1/theme/design-lab-1440x900-en.png) | 1440×900 | EN | 1440×2125 | 319,026 | `72522acec84aec4d` |
| [design-lab-1440x900-ar.png](../../evidence/m1/theme/design-lab-1440x900-ar.png) | 1440×900 | AR | 1440×2160 | 312,614 | `204fb44ce2c275b6` |
| [design-lab-1366x768-en.png](../../evidence/m1/theme/design-lab-1366x768-en.png) | 1366×768 | EN | 1366×2125 | 318,815 | `2ae8d1ea5a566440` |
| [design-lab-1366x768-ar.png](../../evidence/m1/theme/design-lab-1366x768-ar.png) | 1366×768 | AR | 1366×2160 | 310,659 | `54bdabcc08707282` |
| [design-lab-390x844-en.png](../../evidence/m1/theme/design-lab-390x844-en.png) | 390×844 | EN | 390×5036 | 315,970 | `4085bb23b3fbdb80` |
| [design-lab-390x844-ar.png](../../evidence/m1/theme/design-lab-390x844-ar.png) | 390×844 | AR | 390×4960 | 311,531 | `094b326269e66330` |
| [design-lab-1440x900-focus-en.png](../../evidence/m1/theme/design-lab-1440x900-focus-en.png) | 1440×900 | EN（焦点态） | 1440×900（视口） | 121,745 | `02049d4941f99e9b` |

AR 截图可见：标题/区域标题/短标签字距正常（无负/正 tracking），正文与长说明行高变宽（1.8），metadata 显示 `29 / 1.22 / 630 / 0`、`16 / 1.8`、`12 / 600 / 0`；EN 截图保持原 tracking 与 1.6 行高。主控可打开原图复核。

## 6. AR 排版落实与实测数据

修复后由测试读取的真实 computed styles（1440×900，`theme.spec.ts` 第 303 行起）：

| 元素 | AR | EN（回归） |
|---|---|---|
| h1 页面标题 | `letter-spacing: normal/0`、29px、行高 35.38px（1.22，标题自身行高） | `-1.16px`、29px、35.38px |
| 区域标题（`#typography-title`） | `normal/0`、18px、24.3px（1.35） | `-0.216px`、24.3px |
| type-sample-0（29px 样例） | `normal/0`、29px、35.38px | `-1.16px` |
| type-sample-2 / 内容正文 / 页面说明 | 16px / **28.8px（1.8）** | 16px / 25.6px（1.6） |
| type-sample-5 短标签 | `normal/0`、12px | `1.92px`（.16em） |

实现说明：
- 覆盖集中在 [design-lab.module.css](../../apps/web/styles/design-lab.module.css) 的 `[lang='ar']` 后代规则，只改字距与正文行高，**不**统一设置 `font-family` 或 `direction`。
- 显式英文/技术片段保持原规则：eyebrow、产品名、`levelValue`/Token 名/尺寸值、`footerMeta` 均为 `lang="en"` + `bdi dir="ltr"`；阿拉伯块中的英文说明也标 `lang="en"`；SKU/产品名隔离保持不反转。
- 标题行高不被统一改写：h1 仍 1.22，区域/卡片标题仍 1.35；只有正文与长说明改为 1.8。
- Reduced Motion 的 Token 计算值在标准导入 + 生产压缩后为 `0s` / `.22s`（与 0ms/220ms 等价）；e2e 改为按毫秒数值断言，避免把压缩格式误判为失败。

## 7. Token 标准导入与 dev/prod 行为

- **实现**：`apps/web/app/layout.tsx` → `import '../../../design/tokens.css';`（`apps/web/app` 上溯 3 级到仓库根），随后 `import '../styles/globals.css'`；全局样式仍只在根布局加载一次。
- **构建结果**：标准导入在原应用实际 build 成功（exit 0，无警告），生产 CSS chunk 内含根 Token；预渲染 HTML 中不再有 `id="design-tokens"` 内联 `<style>`；`apps/web/next.config.mjs`/`tsconfig.json`/依赖均未改，也未建 `packages/tokens`。
- **dev 实测**（临时、可恢复，详见 [dev-token-hmr.json](../../evidence/m1/theme/dev-token-hmr.json)）：

| 观察项 | 结果 |
|---|---|
| 基线 `--canvas` | `#f6f5f2`（body `rgb(246,245,242)`） |
| 临时改 `--canvas: #F3F2EE` 后不刷新等待 8s | **未自动更新**（仍为 `#f6f5f2`） |
| 刷新页面后 | 变为 `#f3f2ee`（body `rgb(243,242,238)`） |
| 恢复原文件字节后不刷新等待 8s | 仍为 `#f3f2ee`；刷新后回到 `#f6f5f2` |
| 是否需重启 dev server | **否** |
| Token 文件 SHA-256 前后 | 均为 `07f8b08d…1814`（字节级还原，未提交任何 Token 改动） |
| 生产 | 路由为静态预渲染，**改 Token 必须重新 build**；刷新静态成品不会重读源文件 |

结论：dev 下根 Token 变更**需要刷新页面**才可见（无需重启 dev）；生产需要重新构建。页面 footer 与报告已不再声称“内联/原样注入”。

## 8. 与 HTML 参考的差异（更新）

1. 字体：参考 HTML 未加载 Inter（实测回退 Segoe UI Semibold）；本页真实加载 Inter v20。同标题（29px/630/−0.04em）宽度：Inter **237.83px** vs Segoe **225.00px**（+5.70%）vs Arial **234.81px**（+1.29%）——EN 与 TASK-006 一致；AR 现在使用 Noto Sans Arabic、字距 0、正文 1.8。
2. 字号按 DESIGN_SYSTEM 适配：正文 16、辅助 14、区域/卡片标题 18、短标签下限 12、页面标题 29/1.22/630、手机 25；未把业务正文降到 9–12px。
3. 颜色/几何/表面语言与参考一致（画布 `#F6F5F2`、表面 `#FFFEFC`、品牌黑 `#191917`、金色 `#B89A61`、12/7/5 圆角、细边框、极弱阴影）；暗色仅局部预览；无衬线标题、无蓝紫渐变/玻璃/发光。
4. 焦点环使用 Token `--focus #816333`；Reduced Motion 关闭位移与平滑滚动。
5. 参考是零售 KPI 仪表盘；本页是内部设计验证页，不做 KPI 墙、不伪造业务数据；未使用参考视频/摄像头素材。

## 9. 已知问题、缺失条件、需主控决定事项

1. **Token 变更生效方式**：dev 需刷新页面（无需重启 dev）；生产必须重新 build（静态预渲染）。这是本轮实测结果，已在 footer/报告更新。
2. **e2e 环境**：新机器需 `npx playwright install chromium`（Chromium v1248，118.1 MiB，不进仓库）；`npm run test:e2e` 前需 `npm run build`（webServer 用 `next start`）。
3. **AR 文案**：仍为布局样例，待客户/本地化审查；产品名与 SKU 保持官方拉丁写法，不自行音译。
4. **Logo**：本任务仍未展示；按主控裁决留待 TASK-007 白名单开放 `apps/web/public/brand/` 后原样复制并核对 SHA-256。
5. **NOT_RUN**：Axe/自动可访问性审计、200% 缩放、Firefox/WebKit、真实屏幕阅读器、`validate-baseline` 均未运行，未写成通过（主控裁决不追加为本轮阻塞）。
6. **页面状态**：刷新后语言回到 EN、说明收起（无持久化；本任务未要求）。
7. **测试产物**：e2e 会自动重写 `evidence/m1/theme/` 截图与 JSON（同状态复拍，当前连续 3 次哈希一致）；测试服务日志中的 `NO_COLOR`/`FORCE_COLOR` 警告来自 Next 启动环境，无功能影响。
8. **M1 门禁**：未修改 `tasks/gates.json`；M1 仍未通过，TASK-007 及后续等待主控 review 后再启动。

## 10. 复现与审查入口

```powershell
npm ci
npm run typecheck
npm run build
npm run test:e2e -- theme.spec.ts
# 证据：evidence/m1/theme/（9 张截图 + browser-report.json + dev-token-hmr.json）
```

主控可直接打开 9 张截图与两个 JSON；如需 FIX，请指出截图区域/元素、预期与实际、复现命令，我在同一任务范围内修复并重拍。本报告不代替主控验收，也不改变任何任务状态。
