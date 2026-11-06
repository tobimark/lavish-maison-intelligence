# FLOW-004-DSH · 一次完整演示路径验收

日期：2026-11-06 · 状态：完成并提交主控审查（不自行 accepted）

## 验收环境

- 新生产构建：`T670BiVsBqlwygOwybuAg`，全新端口 **3160**；未覆盖 AS/旧 FLOW 证据。
- 一个全新 Chromium context，从首页开始走唯一主路径；不是只跑测试计数。
- 证据根：`evidence/product/connected-flow/final-2026-11-06/**`。

## 主验收路径（实际执行，16 步）

1. 首页 connected-case：唯一 `Explore the campaign` 入口（`OV-explore-journey`）。
2. 进入 A 1.1.0 Journey Insight：takeaway + 四条模拟信号 + 趋势/证据。
3. 打开 evidence 抽屉，查看五条真实 prepared evidence 后关闭。
4. `Next: Campaign idea` → Strategy：为何 SERENITY / 单产品克制创意 / 官方 citrus-floral-musk 边界。
5. `Open full brief` → 精确 A Campaign Brief；返回 Creative。
6. Creative：identity → hero → 真实 provided video；实际播放 0.21s、seek 7.56s、pause；video `720×960 / 10.08s / controls / contain`。
7. EN/AR 脚本切换：真实 EN/AR 四镜头与字幕；15 秒脚本明确“not produced”。
8. `Next: Social post` → Social：预设 EN 帖只读预览，无 draft。
9. Edit → 保存自定义 caption（draft revision 2）。
10. Review：源脚本未确认，先显示 `Review creative`；显式确认后再次 Review，确认框显示精确 English/caption/CTA/hashtags/账号/video SHA。
11. Confirm review → ready。
12. Simulate publish 确认框显示同一快照 + `No content is sent to Instagram`；确认后只创建 **1 个** attempt。
13. `View simulated post` → 内部详情页：English、原 caption、720×960、Simulated；刷新后快照不变。
14. Deliverables：真实下载 A 1.1.0 双语 ZIP + 独立 MP4。
15. 回到 Radar：正常工作，无死入口。
16. Atelier：同一 Campaign/版本，编辑区正常。

补充边界（已在 `product-social-publish.spec.ts` 覆盖）：未保存离开 guard、未保存不能 Review/Simulate、双击发布只有 1 attempt、发布后改稿 old post 快照不变、EN/AR 独立保存与 RTL。

## 真实文件与快照

| 证据 | 值 |
|---|---|
| `flow-a-1.1.0-en-ar-pack.zip` | 10,736,352 B；Expand-Archive 标准解压 21 files；20 attachments + EXPORT |
| ZIP `noVideo` / `noRealEmail` | `false` / `true` |
| ZIP `providedAssetSetId` | `provided.scent-layering.serenity-v1` |
| ZIP includedVersions | en-v2 + ar-v2，均 scenarioVersion 1.1.0 |
| ZIP provided hero / identity / MP4 SHA | 与 receipt 完全一致（`1c4e337b…` / `f75fa10b…` / `15d3756a…`） |
| `flow-provided-final-preview.mp4` | 1,315,394 B；SHA-256 `15d3756a0e93f591fc767998d84911ed425e3394554272f62120d61f0e31e10e` |
| `simulated-post-snapshot.json` | 1 条 `published_simulated` attempt；EN；revision 3；`video_post`；Demo account |
| 帖子详情 | 刷新前后 caption 相同；无真实平台 URL/metrics |

ZIP 容器 bytes 与 AS-005 旧导出相差 2B（ZIP 元数据/构建时序），但 entries、附件 bytes/SHA 与 receipt 一致；不以容器大小冒充内容差异。

## 视觉/内容核对

- 1440/1366：`home-*`、`journey-{insight,strategy,creative,social}-*` 全截图；单主体区域，无横向溢出（E2E 断言 ≤1px）。
- AR：`social-ar-1440/1366`、`social-stage-ar-390`、`social-post-detail-ar-1440`；AR 帖子 caption `dir=rtl`。
- 1440 主路径 16 张：`accept-01…accept-16-*.png`（首页→证据→策略→Brief→Creative 播放→AR 脚本→Social 保存/Review/发布→帖子详情→Deliverables→Radar→Atelier）。
- 无素材画廊终点：第四段直接是社媒工作台；下载仍是辅助，不替代模拟发布记录。
- 旧 Featured product 技术文案/素材块未影响本轮主路径，未做无关重构；未恢复旧首页、未改素材比例/身份、下载与视频可用。
- 15 秒概念与 10.08 秒提供片在 Creative/Social 文案中分别标注，未假生成。

## 测试/命令

| 命令 | exit | 结果 |
|---|---:|---|
| `npm run typecheck` | 0 | 通过 |
| `npm run build` | 0 | 通过，buildId `T670BiVsBqlwygOwybuAg` |
| `npm run test:unit -- tests/poc/flow-projection.test.ts tests/poc/social-workflow.test.ts` | 0 | **18 passed**（10 + 8） |
| `npm run test:e2e -- product-connected-flow product-social-publish product-provided-assets product-cross-page` | 0 | **27 passed / 0 failed** |
| `product-matrix-dom.spec.ts`（矩阵回归，单独） | 0 | 1 passed；matrix 155 / audited 119 / FLOW 36 |
| FLOW DOM 控件复核 | 0 | **36/36 found**（`flow-matrix-audit.json`） |

日志：`handoff-e2e.log`、`unit.log`、`matrix-dom.log`、`connected-flow-e2e.log`、`social-e2e.log`。

## 矩阵

`docs/INTERACTION_AUDIT_MATRIX.csv`：119 AS 行保留 + 新增 36 行真实 FLOW/social 控件（首页 Journey 入口/四段 tab/证据/Brief/视频/EN-AR 脚本/社媒语言、字段、Edit/Save/Review/Simulate/确认/详情返回）。AS-006 的 119 行审计结果保持原样（108 found / 1 guarded / 10 NOT_RUN）；FLOW 36 行单独 DOM/E2E 复核 36/36 found，未删任何失败项。

## NOT_RUN / 边界

- 社媒发布失败/Retry 的真实 UI 分支：**NOT_RUN**；无公开失败开关，未向客户页加假按钮，由 `social-workflow.test.ts` 覆盖失败保留稿/Retry/幂等。
- 15 秒概念片/poster 未制作；AR 仍待母语/品牌审稿；无真实 Instagram/平台账号/API/邮件。
- FLOW-001 未被 accepted；本批整体不自行 accepted。
