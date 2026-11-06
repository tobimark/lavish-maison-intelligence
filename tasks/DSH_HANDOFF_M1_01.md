> HISTORICAL：TASK-006已经主控accepted。本交接单只保留历史；当前执行入口为DSH_HANDOFF_POC_01.md，不重跑旧任务。

# DSH 任务交接：M1-01 · 前端主题、双语字体与视觉基线页

任务对应：TASK-006。状态：可执行，未派发。工作目录：`D:/workspace/maison-intelligence`。

以下内容可完整交给 DSH 执行，不需要补充之前的聊天记录。本说明补充 TASK-006 的工具配置、交付路径与停止条件；发生文件白名单差异时，以本说明为准。

## 1. 角色与当前目标

你是本项目的下游前端编码执行者。主控负责产品方向、架构、公共设计规范与最终验收；你负责按任务实现、验证并提交结果。

本期只做 **Lavish Perfumes 的高保真前端 Demo**。MAISON INTELLIGENCE 是软件暂名。M0 已按前端范围审查通过，Next.js Web 基础已能构建和启动。

**本轮只完成全局主题、双语字体与 `/design-lab` 视觉基线页。** 完成后提交主控 review，再安排导航、Radar 和 Atelier。不要一次开发整个 Demo。

## 2. 前置依赖

- TASK-001：前端基础已 accepted，见 `docs/reviews/M0.md`。
- 延续当前 Next.js / React / TypeScript 与 npm workspace，不重新初始化项目。
- 本轮不依赖 TASK-002/003、后端服务、数据库或真实 API。

## 3. 开工前必须阅读

按以下顺序读取本地文件：

1. `docs/FRONTEND_DEMO_SCOPE.md`
2. `PROJECT_CONSTRAINTS.md`
3. `docs/DESIGN_REFERENCE_ANALYSIS.md`
4. `reference/LAVISH_LiveVision_RealVideo_Demo.html`
5. `docs/DESIGN_SYSTEM.md`
6. `design/tokens.css`
7. `docs/VISUAL_ACCEPTANCE.md`
8. `docs/BRAND_ASSETS.md`
9. `apps/web/app/layout.tsx`、`apps/web/package.json`、根目录 `package.json`

实际查看 `evidence/reference/reference-1440x900.png`，并查看至少一张移动端参考截图。不要只读色值表后自行设计另一套 SaaS 风格。

范围冲突时，用户最新要求“仅前端 Demo”和 `FRONTEND_DEMO_SCOPE.md` 优先；全局视觉仍以指定 HTML 与 DESIGN_SYSTEM 为准。

## 4. 允许新增或修改的文件

- `apps/web/styles/**`
- `apps/web/public/fonts/**`
- `apps/web/public/licenses/**`
- `apps/web/app/layout.tsx`
- `apps/web/app/design-lab/**`
- `apps/web/tests/theme.spec.ts`
- `playwright.config.ts`：仅为本任务的浏览器检查配置。
- `apps/web/package.json`、根 `package.json`、`package-lock.json`：仅在字体依赖或必要检查脚本需要时修改，不升级现有框架。
- `evidence/m1/theme/**`
- `docs/reviews/TASK-006-DSH.md`

其他文件只读。尤其不要修改 `design/tokens.css`、`docs/DESIGN_SYSTEM.md`、业务路由、后端、历史契约或任务门禁。发现全局规范冲突时，在交付报告中提出具体问题和建议，等待主控裁决。

## 5. 功能规格

### 全局主题与字体

- 将根目录 `design/tokens.css` 作为唯一 Token 源，通过全局样式引用，避免复制出第二套色表。
- 全局样式经 `layout.tsx` 一次加载；基础样式包括 box-sizing、正文背景与文字、标题、可见焦点、表单字体继承、Reduced Motion。
- 本地提供 Inter 和 Noto Sans Arabic 及其许可证。可使用本地字体文件或锁定版本的字体包；页面运行时不能依赖 Google Fonts/CDN 请求。
- 使用 DESIGN_SYSTEM 的字号与字重。记录本地 Inter 与参考截图中 Segoe UI 的实际排版差异，不宣称 HTML 原稿已经加载 Inter。
- 阿语样例使用 `lang="ar" dir="rtl"`，字距为0；英文字母、SKU、数字混排用合适的隔离方式，不倒序处理字符串。

### `/design-lab` 视觉基线页

这是内部设计验证页，不是正式业务首页。保留 `/` 当前基础页，本轮不制作 Home/Radar/Atelier。

页面必须能直观看到：

1. 页面标题、说明、区域标题、正文、辅助信息、短标签的完整文字层级。
2. 暖白页面、浅色表面、深色表面、金色强调、细边框、圆角与间距的实际组合。
3. 一块简洁的内容预览：使用业务相关的 Demo 文本展示标题、说明、来源标签与一项操作，验证字体/留白/层级；不要做无意义 KPI 墙。
4. EN 与 AR 切换。两种语言使用相同组件与空间规则，切换真实生效。
5. 焦点和 Reduced Motion 样例。控件必须有真实作用，例如切换语言、显示/隐藏示例说明；不展示无效按钮。

允许使用少量原生控件作为样例；本轮不实现完整 Button/Form/Dialog/Drawer 组件库，这些属于后续任务。

## 6. 视觉规格

- 画布 `#F6F5F2`，表面 `#FFFEFC`，品牌黑 `#191917`，金色强调 `#B89A61`；实际样式引用 Token。
- 正文16px、操作15px、辅助14px、短标签12px、区域标题18px、页面标题29px；移动标题25px。不可把业务正文降到10–12px。
- 卡片圆角12px，控件圆角7px，区域间距以18/24px为主；阴影克制。
- 暗色仅用于局部预览，不把整个页面改成黑色大屏；不引入衬线标题、蓝紫渐变、玻璃效果或发光装饰。
- 颜色样例可展示浅金，但正文应使用可读文字色。成功文字使用 `--good-text`，不要在浅绿底用对比度不足的原图形色。
- 焦点环清晰，Reduced Motion 下无非必要位移与平滑滚动。
- 390px 页面不得出现整页横向溢出；英文和阿文均不得裁切或互相覆盖。
- 本轮不需要商品图或视频，不得为补视觉而生成虚构香水瓶或重绘 Logo。若展示品牌标志，只使用已登记的正式文件；资源使用须另列文件白名单请求，不能擅自从相邻项目拷贝素材。

## 7. 数据与接口约定

- 全部为前端静态样例与 React 本地状态，不请求业务 API。
- 演示内容明确显示 `Demo / Design preview`；不暗示真实采集、实时模型生成或发布。
- 本任务不建立 Campaign 数据层、不做服务端回放、不引入 OpenAPI 类型生成链。
- 字体、主题、状态组件的组织应便于后续页面复用，不将全局规则局限在 design-lab 页面内部。

## 8. 验证命令与实际浏览器检查

从工作区根目录执行：

```powershell
npm run typecheck
npm run build
npm run test:e2e -- theme.spec.ts
```

配置 Playwright 的测试路径和本地服务启动，确保命令确实发现并执行 `apps/web/tests/theme.spec.ts`，不以“未找到测试”或 passWithNoTests 当作通过。

浏览器检查应覆盖：

- `/design-lab` 成功加载，EN/AR切换生效。
- 本地字体成功加载，英文/阿文样例的实际字体可核对。
- 拒绝外部网络资源时，字体与页面仍能工作；本地服务请求允许通过。
- 四种尺寸均无 document 横向溢出。
- 键盘能到达并操作样例控件，focus可见。
- Reduced Motion 媒体条件下动效被关闭。
- console 无未处理异常；无字体404。

截图尺寸：1920×1080、1440×900、1366×768、390×844。每个尺寸保存 EN 和 AR 页面截图；另保存至少一张焦点态截图。所有截图保存到 `evidence/m1/theme/`，使用固定样例内容。

Windows 沙箱可能让 Turbopack 或浏览器启动遇到权限问题。发生时记录原始错误，通过可用授权机制执行相同命令；无法验证时明确写 `NOT_RUN` 和原因，不把环境失败改写为通过。

## 9. 验收条件

- 全局主题唯一来源明确，无擅自改色或重建另一套设计系统。
- 字体本地可用、许可文件齐全；字号与阿文排版符合规范。
- design-lab 能展示未来工作空间的文字与空间品质，语言/焦点/动效示例真实可操作。
- 构建与类型检查通过，浏览器测试实际执行通过。
- 指定尺寸截图齐全，开发者自己实际查看并修正溢出、裁切、字号与排版问题。
- 主控收到源代码、实际运行证据和截图后进行独立视觉审查。本轮不能自行宣布 M1 通过。

## 10. 交付报告与完成定义

将报告写入 `docs/reviews/TASK-006-DSH.md`，包括：

1. 任务ID与实际执行模型。
2. 修改文件及每项修改的用途。
3. 字体来源、版本、字重、许可与加载方式。
4. 每条真实命令、退出码与关键输出；未运行项明确说明。
5. 本地预览启动命令、URL与截图列表。
6. 相对HTML参考的差异及依据，尤其字体渲染差异。
7. 已知问题、缺失条件、需要主控决定的事项。

完成标准：上述交付齐全后提交 `review`，等待主控代码与实际视觉审查。**到这里停止，不自动继续 TASK-007、Radar、Atelier 或其他页面，不更改任何任务为 accepted。**

## 11. 可复制执行指令

你在 `D:/workspace/maison-intelligence` 中执行开发。请完整读取 `tasks/DSH_HANDOFF_M1_01.md`，然后只完成其中的 M1-01 / TASK-006：全局主题、Inter与Noto Sans Arabic本地字体、`/design-lab`视觉基线页，以及指定验证和截图。M0已按前端Demo范围通过；本期不建设后端、数据库、真实API或视频渲染服务。以指定HTML和DESIGN_SYSTEM为视觉依据，严格遵守本说明的文件白名单，不重新定义架构或改写全局Tokens。完成后提交 `docs/reviews/TASK-006-DSH.md` 与 `evidence/m1/theme/`，列出真实测试结果和截图，等待主控review，不自动进入下一任务。
