# WS-BATCH-DSH · 六工作区承载完整营销流程

日期：2026-11-06 · 状态：WS-001..004 完成并提交集中 review；**不自行 accepted**

## 交付目标

保留六个一级菜单原名原顺序（Overview、Intelligence Radar、Opportunities、Creative Atelier、Creative Library、Deliverables），把已 accepted 的 AS/FLOW 内容与能力并入对应工作区。没有新增 Journey/Social 一级菜单或四阶段子菜单；旧 Journey URL 只作兼容跳转。

## 主要变更

### 路由 / 上下文
- 新增 `apps/web/components/product/shared/workspace-routes.ts`、`useCampaignWorkspace.ts`：统一 campaignId/scenarioVersion/language，纯只读 helper，不复制业务数据。
- `AppShell.tsx`/`Sidebar.tsx`：侧栏链接携带当前上下文；按 pathname 归属高亮（brief→Opportunities、social detail→Deliverables、Journey 兼容跳转后目标工作区）；折叠/移动一致。
- `JourneyPage.tsx`：四 stage 先验证后 `replace` 到 Radar/Opportunities/Atelier/Deliverables；无效上下文诚实报错；不再渲染第二套四段产品 UI。

### 工作区内容
- `Overview.tsx`：主 CTA → 带 A 上下文的 Radar；四段摘要分别链接四工作区。
- `RadarPage.tsx`：并入 InsightStage（workspace 模式）；保留来源筛选/信号/趋势/证据/Activity；CTA → Opportunities。
- `OpportunitiesPage.tsx`：并入 StrategyStage（workspace 模式）；保留三机会、Brief；CTA → Atelier。
- `AtelierPage.tsx`：并入 CreativeStage（workspace 模式，原图→hero→真实 10.08s 视频→EN/AR 四镜头）；移除重复素材大块；保留编辑/保存/版本/确认；CTA → Deliverables。
- `CreativeStage`/`InsightStage`/`StrategyStage`：新增 workspace 模式与下一步链接（默认 journey 行为保留）。
- `LibraryPage.tsx`：Provided 视频卡增加 Open in Deliverables（按资产用途）。

### Deliverables
- 默认首屏改为 SocialStage 社媒审阅/模拟发布工作台；H1 保留 Deliverables。
- 下载收进 “Downloads and content packs” 折叠区（默认折叠），保留 Provided 三资产/原 MP4/历史重下；邮件仍为次级抽屉。
- `SocialStage` 新增 `surface` 标识（Deliverables 不显示 Stage 4）；保留 silent refresh、EN/AR 独立、重复 publish 保护、旧帖快照、NavigationGuard。
- 帖子详情返回按钮回 Deliverables 并带案例/版本/语言。

### 测试/证据
- 新增 `product-workspace-integration.spec.ts`（8 tests）。
- 迁移受影响旧 spec 的入口/下载折叠/视频定位断言，保留版本/语言/快照/无写入核心断言；`product-connected-flow.spec.ts` 改测旧 URL 兼容跳转。
- 新证据统一 `evidence/product/workspace-integration/{ws-001,ws-002,ws-003,final}/**`，未覆盖 AS/FLOW 旧证据。

## 命令 / 结果

| 命令 | exit | 结果 |
|---|---:|---|
| `npm run typecheck` | 0 | 通过 |
| `npm run build` | 0 | 通过，buildId `Qn1edGDBs90rcVr7YkDrq` |
| `npm run test:unit -- tests/poc/flow-projection.test.ts tests/poc/social-workflow.test.ts tests/poc/product-asset-export.test.ts` | 0 | **20 passed** |
| `npm run test:e2e -- product-workspace-integration product-navigation product-social-publish product-cross-page product-asset-downloads product-connected-flow` | 0 | **29 passed / 0 failed** |
| 迁移回归 radar/opportunities/atelier/brief/provided-assets | 0 | 23 passed |
| 真实路径脚本（全新 context，22 步） | 0 | 视频 play/seek、1 条模拟帖子、ZIP/MP4 下载 |

## 真实产物

- ZIP `evidence/product/workspace-integration/final/ws-a-1.1.0-en-ar-pack.zip`：10,736,352 B；标准解压 21 files；noVideo=false；en-v2+ar-v2@1.1.0；provided hero/identity/MP4 bytes/SHA 与 receipt 一致。
- MP4 `ws-provided-final-preview.mp4`：1,315,394 B；SHA `15d3756a0e93f591fc767998d84911ed425e3394554272f62120d61f0e31e10e`。
- 模拟帖子 `simulated-post-snapshot.json`：1 条 published_simulated，EN，revision 3，video SHA 匹配，刷新前后 caption 相同。
- 截图：`ws-002/{home,radar,opportunities,atelier}-{1440,1366}.png`；`ws-003/{deliverables-1440,deliverables-1366,deliverables-ar-1440,social-*}.png`；`final/accept-01..21-*.png`（含 AR/1366）。
- 矩阵 `docs/INTERACTION_AUDIT_MATRIX.csv`：155 行；6 个已移除旧入口标 `DEPRECATED → replacement`；不删除旧行、不伪标 pass。

## 证据隔离披露（必须如实保留）

主控验收发现并追加检查：本轮早期运行曾使用旧 spec 的硬编码证据路径，覆盖了已 accepted AS/FLOW 证据目录中的部分“生成物”。**未回滚、未用新证据伪装恢复**；当前字节如下。没有 git，旧原字节不可恢复。功能验收不因此改变，但这些目录不再严格只读。

### A. FLOW 5 个旧截图（`evidence/product/connected-flow/final-2026-11-06/`）

WS-003 社媒 E2E 于 2026-11-06 15:10:59–15:11:09 覆盖：

| 文件 | 当前字节 | 当前 SHA-256 | 主控 main-review 副本 |
|---|---:|---|---|
| social-post-detail-ar-1440.png | 293,510 | `9ae3875e…9fa07` | 293,007B（11:41，非原字节） |
| social-post-detail-en-1440.png | 295,471 | `15d5ff82…f97777` | 294,937B（11:40，非原字节） |
| social-published-ar-1440.png | 179,473 | `6cf134df…b2310` | 184,747B（11:41，非原字节） |
| social-stage-ar-1366.png | 148,323 | `137728c7…a2238` | 158,340B（11:41，非原字节） |
| social-stage-ar-390.png | 70,926 | `2c069eea…77dbf` | 69,283B（11:41，非原字节） |

`main-review-2026-11-06/` 是主控独立验收近似副本，不等于 FLOW 原字节；不得据此宣称原证据已恢复。

### B. FLOW 9 个 `flow-002/provided-assets` 生成物

WS-002 回归于 15:24:46–15:24:53 覆盖：`home-connected-1440.png` 231,575B、`home-connected-1366.png` 123,878B、`journey-creative-equal-frames-1440.png` 299,239B、`journey-creative-equal-frames-1366.png` 270,676B、`journey-creative-video-1440.png` 301,806B、`journey-creative-390.png` 638,344B、`deliverables-compact-regression-1440.png` 201,471B、`bilingual-campaign-pack-with-video.zip` 10,736,354B、`deliverables-provided-final-preview.mp4` 1,315,394B（MP4 SHA 仍为 receipt `15d3756a…`）。无 main-review 同名原字节副本；旧原字节不可恢复。

### C. AS-005 6 个文件（`evidence/product/assets/as-005/`）

产品下载回归于 15:39:40–15:39:42 重写：

| 文件 | 当前字节 | 说明 |
|---|---:|---|
| a-1.1.0-en-ar-pack.zip | 10,736,354 | 与 accepted 记录字节数相同；provided hero/identity/MP4 内部 SHA 与 receipt 一致；容器 SHA `0a1ca00e…` 未在 accepted 记录中 |
| a-1.1.0-pack-audit.json | 1,543 | 重新生成，checkedAt 变为 2026-11-06T07:39:40Z；entries/noVideo/hashes 语义同 accepted 记录 |
| b-1.0.0-pack.zip | 3,369,118 | 与 accepted 记录字节数相同；noVideo=true |
| b-1.0.0-pack-audit.json | 901 | 重新生成，语义同 accepted 记录 |
| deliverables-provided-final-preview.mp4 | 1,315,394 | SHA-256 `15d3756a0e93f591fc767998d84911ed425e3394554272f62120d61f0e31e10e`，与 accepted 完全一致 |
| video-download-audit.json | 146 | 重新生成，bytes/hash 同 accepted |

结论：AS-005 的包内附件/MP4/关键语义与 accepted 记录可比，A/B 容器字节数与 accepted 相同；但 audit 文件本身已重生成，原 audit 字节不可恢复。

### D. AS-006 / IP-009 3 个导出生成物

`product-cross-page` 于 15:40:07–15:40:13 写入 `evidence/product/ip-009/`：`cross-page-A-confirmed.zip` 1,684,642B、`cold-library-C-en.zip` 253,424B、`cold-deliverables-B-ar.zip` 1,684,607B。AS-006 accepted 报告引用的是 `matrix-dom-audit.json`（本次未触碰），这 3 个是生成的下载审计文件；原字节不可恢复。

### E. 未触碰确认

- `evidence/product/assets/as-004/**` 最新 10:25，AS-004 未触碰。
- `evidence/product/assets/as-006/**` 最新 10:53，AS-006 目录未触碰（仅上述独立 `ip-009` 3 个 zip 被写）。
- `evidence/product/ip-009/matrix-dom-audit.json` 未在 WS 轮重跑/重写。

### F. 已做隔离修复（未覆盖/回滚旧证据）

- `product-social-publish.spec.ts`、`product-asset-downloads.spec.ts`、`product-deliverables.spec.ts`、`product-provided-assets.spec.ts`、`product-cross-page.spec.ts` 均改为 `EVIDENCE_ROOT` 可配置；默认根分别落到 `workspace-integration/ws-003`、`ws-003/downloads`、`ws-003/deliverables`、`ws-002/provided-assets`、`ws-004/cross-page`。
- `product-as-audit.spec.ts`、`product-matrix-dom.spec.ts` 也支持 `EVIDENCE_ROOT`，默认改到 `workspace-integration/ws-004/{as-audit,matrix}`，避免未来覆盖 AS accepted 证据。
- 已验证：改用新根后运行 cross-page/asset-downloads，AS-005 A 包与 ip-009 三个 zip 的 mtime 不再变化；旧文件保持被覆盖后的状态，不做回滚/伪造。

## NOT_RUN / 已知限制

- 社媒发布失败/Retry 真实 UI 分支无公开失败开关，E2E NOT_RUN；由 social-workflow 单测覆盖，未加假按钮。
- 15 秒概念片/poster 未制作；AR 仍待母语/品牌审稿；无真实 Instagram/平台/后端/邮件。
- 下载默认折叠是产品规格选择；辅助下载需展开，主发布路径不依赖下载/邮件。
- 无生产级并发/队列/跨浏览器矩阵；未重测冻结 Schema/Tokens/素材/十 JSON。
- 主控实际看图、走主路径后才决定本批是否 accepted。
