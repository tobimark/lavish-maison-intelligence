# Vercel 部署指南

项目：MAISON INTELLIGENCE（纯前端 Next.js Mock Demo；`backend/` FastAPI 不参与运行）
仓库：https://github.com/tobimark/lavish-maison-intelligence

## 已部署（2026-11-06）

- **Production URL**：https://lavish-maison-intelligence.vercel.app
- Vercel 项目：`qiaoyuangcd-8122s-projects/lavish-maison-intelligence`
- Root Directory：`apps/web`；Framework：Next.js；Node：22.x；无环境变量
- 部署方式：Vercel CLI（Windows 无 symlink 权限，实际用 WSL Ubuntu + `vercel deploy --prod`）
- 已验证：六工作区 200、Deliverables 社媒工作台/视频 720×960/10.08s、真实 MP4 200/Range 206、旧 Journey `stage=social` 跳转到 Deliverables。
- 说明：免登录访问已关闭 Vercel Authentication（`ssoProtection=null`）；项目为内部 Mock Demo，无真实数据/密钥。

## 推荐方式：Vercel 网页 GitHub Import

1. 打开 https://vercel.com/new
2. Import Git Repository：`tobimark/lavish-maison-intelligence`
3. Configure Project：
   - **Framework Preset**：`Next.js`
   - **Root Directory**：`apps/web`（必须；这是 npm workspaces 的子应用）
   - **Build Command**：留空/默认（`next build`）
   - **Output Directory**：留空/默认（`.next`）
   - **Install Command**：留空/默认（Vercel 会自动从仓库根执行 npm workspaces 安装）
   - **Node.js Version**：`22.x`（仓库已含 `apps/web/.nvmrc` = 22）
   - **Environment Variables**：不需要；POC 无后端/无外部服务/无密钥
4. 点击 Deploy。首次构建会安装根 workspace 依赖并在 `apps/web` 执行 Next build。
5. 构建完成后用分配的 `*.vercel.app` 域名验证。

## 为什么 Root Directory 是 apps/web

- 仓库根是 npm workspaces（`apps/web` 为 workspace），Next.js 应用在 `apps/web`。
- `apps/web/next.config.mjs` 显式设置 `outputFileTracingRoot`/Turbopack root 为仓库根；
  Vercel 的 monorepo 支持会在根安装依赖、在 `apps/web` 构建。
- 若误把 Root Directory 设为仓库根：Vercel 不会自动识别 Next（根 package.json 无 next 依赖），
  构建会失败；请改回 `apps/web`，或手动设置 Framework=Next.js 并调整构建命令。

## 部署后验证清单

- `/`：六工作区 Overview，SERENITY 案例，主 CTA 正常。
- `/radar`、`/opportunities`、`/atelier`、`/library`、`/deliverables`：均可直接打开，左栏高亮正确。
- `/deliverables`：默认为社媒审阅/模拟发布工作台；视频可播放，EN/AR 可切换。
- 真实素材：`/provided-assets/scent-layering/1.0.0/final-preview.mp4` 返回 200（Range 206 可选）。
- 旧 Journey 兼容：`/campaigns/scn-scent-layering.brief.main/journey?scenarioVersion=1.1.0&stage=social`
  应 302/307 风格跳转到 `/deliverables?campaignId=...&scenarioVersion=1.1.0`（客户端 replace 后 URL 正确）。
- 构建日志中无 Next.js 版本/Node 版本错误。

## 常见问题

- **No Next.js version detected**：Root Directory 未设为 `apps/web`；或 Framework Preset 不是 Next.js。
- **Cannot find module / Workspace not found**：Root Directory 必须为 `apps/web`，让 Vercel 从仓库根安装 workspace；
  不要单独把 `apps/web` 目录拷成独立仓库。
- **Node 版本警告**：Project Settings → General → Node.js Version 选 22.x。
- **本地构建**：`npm install`（仓库根）→ `npm run build`（根脚本会调用 `@maison/web`）→ `npm run start --workspace @maison/web`。
- **代理网络**：本机 git push 需 `http.proxy=http://127.0.0.1:7897`（已写入本地仓库配置），Vercel 云端不需要。

## 不使用的方式

- 不要用 Vercel 部署 `backend/`（FastAPI 非本 Demo 运行所需；当前页面全部使用浏览器 MockApi/IndexedDB）。
- 不需要数据库、环境变量、外部 API Key。
