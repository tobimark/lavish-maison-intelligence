# FLOW-BATCH-DSH · 热点→产品/策略→创意/视频→社媒模拟帖子

日期：2026-11-06 · 状态：FLOW-002/003/004 完成并提交集中审查；**不自行 accepted**

## 基于

- FAST_06 AS-001..006 已 accepted，本轮不重做 AS、不制作 15 秒片、不以 AR 母语审稿为前置。
- FLOW-001 现有 Journey/flow API/存储/social 组件为基线（FLOW-001 未被 accepted）；本轮复用补缺，未从零重写、未回退其它会话代码。
- SERENITY A 1.1.0 已发布绑定；presentation sidecar 为 DSH 从批准十 JSON 装配，不是网页作者正式交付。

## 完成内容

| 项 | 结果 |
|---|---|
| FLOW-002 主链 | 首页唯一案例入口；四段深链/刷新/自由跳转；Insight 观察/意义/证据；Strategy 为何 SERENITY/Brief；Creative 原图→主视觉→真实 10.08s 视频 + 15s 概念脚本独立展开；每段下一步 CTA；六工作区自由 |
| FLOW-003 社媒 | EN/AR 预设/编辑/保存/刷新；显式 Review creative 确认源脚本；准确语言/文案/视频确认框；Simulate publish 内部帖子/详情/刷新；未保存 guard；双击只 1 attempt；发布后新 revision、旧帖快照不变；明确 Simulated/No content sent |
| FLOW-004 验收 | 全新 context 16 步主路径实际执行；真实 ZIP/MP4/帖子快照；1440/1366 + AR RTL；矩阵补 36 个真实 FLOW/social 控件；来源表逐字段 JSON Pointer |
| 来源表 | `docs/reviews/FLOW-CONTENT-PROVENANCE.md`：原文复用/机械拆分/改述三类；无新增营销结论/产品事实/效果声称 |

## 本轮修复（真实缺陷）

1. `JourneyPage.tsx`：社交 Save/Review/Publish 后的 reload 会整页 loading 卸载 SocialStage，导致 EN/AR 语言重置、AR 稿误写 EN。改为 silent refresh，保留 stage 状态。
2. `SocialStage.tsx`：发布成功后重复 confirm 可能再建 attempt；增加成功后 completed ref，双击只落 1 条 attempt/1 条 receipt。

## 真实证据

根目录：`evidence/product/connected-flow/final-2026-11-06/**`（未覆盖 AS/旧 FLOW）。

- 1440/1366：`home-*`、`journey-{insight,strategy,creative,social}-{1440,1366}.png`；主路径 `accept-01…16-*.png`。
- AR RTL：`social-ar-1440/1366.png`、`social-stage-ar-390.png`、`social-post-detail-ar-1440.png`。
- 帖子：`simulated-post-snapshot.json`（1 次 `published_simulated`，EN，revision 3，video_post，Demo account，视频 SHA 匹配）；`acceptance-observations.json`（操作/确认框/刷新前后 caption）。
- 下载：`flow-a-1.1.0-en-ar-pack.zip`（10,736,352 B，标准解压 21 files，20 attachments，noVideo=false，en-v2/ar-v2@1.1.0，provided hero/identity/MP4 bytes/SHA=receipt）；`flow-provided-final-preview.mp4`（1,315,394 B，SHA `15d375…31e10e`）。
- 日志：`handoff-e2e.log`、`unit.log`、`matrix-dom.log`、`connected-flow-e2e.log`、`social-e2e.log`。

## 命令结果

| 命令 | exit | 结果 |
|---|---:|---|
| `npm run typecheck` | 0 | 通过 |
| `npm run build` | 0 | 通过，buildId `T670BiVsBqlwygOwybuAg` |
| `npm run test:unit -- tests/poc/flow-projection.test.ts tests/poc/social-workflow.test.ts` | 0 | **18 passed** |
| `npm run test:e2e -- product-connected-flow.spec.ts product-social-publish.spec.ts product-provided-assets.spec.ts product-cross-page.spec.ts` | 0 | **27 passed / 0 failed** |
| `product-matrix-dom.spec.ts` | 0 | 1 passed；AS 119 行审计保持 108 found/1 guarded/10 NOT_RUN；matrix 155 rows |
| FLOW 控件 DOM 复核 | 0 | **36/36 found**（`flow-matrix-audit.json`） |

## 矩阵

`docs/INTERACTION_AUDIT_MATRIX.csv` 155 行：101 IP 基础 + 18 AS + **36 新增 FLOW/social 真实控件**（首页 Journey 入口/四段 tab/证据/Brief/视频/EN-AR 脚本/社媒语言、caption、CTA、hashtags、Edit、Save、Review、Simulate、确认/取消、详情返回）。未删除任何旧行/失败项；AS-006 的 119 行审计范围保持不变以便与已 accepted 证据比较。

## 视觉/业务结论

- 四段先结果后细节，顶部只保留 Campaign 上下文与阶段 tabs；没有素材画廊式堆叠，也没有假生成/假进度。
- 创意段三张等高画面直观看出 identity→hero→video 的关系；video 原生控件真实播放 10.08s，与社交段同一片同 SHA。
- 社媒段左侧“发什么/配什么文字”与右侧 Instagram 预览同屏；AR RTL 方向正确，确认框显示准确快照。
- 15 秒概念脚本单独展开并标“not produced”，不把 10.08s 提供片冒充 15s 成片。
- 下载仍是辅助，模拟帖子记录是第四段结果；主链可在六侧栏自由离开。

## 3–5 分钟中文演示稿（业务结果，不朗读 ID/日志）

1. **首页（约 20 秒）**：“我们从一个具体市场观察出发，而不只是看素材。首页只给一个 SERENITY 案例入口，右侧六工作区随时可去。”
2. **热点（约 45 秒）**：“第一段先给结论：模拟信号指向‘用一段克制的视觉叙事展示 SERENITY’，不是成分或功效断言。需要时再展开四条观察和五条证据，能看到来源和不确定性。”
3. **策略（约 45 秒）**：“第二段回答为什么是 SERENITY：官方描述只支持 citrus/floral/musk 的有限词汇，所以我们做单产品 editorial，不编香调顺序、容量或效果；旁边可直接打开完整 Brief。”
4. **创意（约 60 秒）**：“第三段把结果拆成三步：白底原图先固定身份，主视觉只加氛围且瓶标完整，最后是真实提供的 10.08 秒视频。播放、暂停、拖动都是真的；15 秒四镜头脚本是另一个概念展开，页面明确还没制作。”
5. **社媒（约 60 秒）**：“第四段把同一视频和 EN/AR 文案变成帖子。先看预设，只有点 Edit 才建本地稿；改完保存，刷新还在。点 Review 前先显式确认源脚本，确认框逐字显示将发布的语言、文案和视频。模拟发布后生成内部帖子，刷新能看到同一快照；再改稿只会生成新 revision，旧帖不变。页面一直写明不会发到 Instagram。”
6. **收尾（约 30 秒）**：“Deliverables 仍可下载内容包和原 MP4；Radar/Atelier 随时可回。整条链讲清‘为什么做、做什么、发什么’，15 秒成片和 AR 母语审稿是明确后续，不假装已完成。”

## NOT_RUN / 后续

- 社媒发布失败/Retry 的真实 UI 分支：**NOT_RUN**（无公开失败开关，未加假按钮；失败保留稿/新 attempt 由 `social-workflow.test.ts` 覆盖）。
- 15 秒概念片/poster 未制作；AR 仍待母语/品牌审稿；无真实 Instagram/平台账号/API/邮件/后端；无多用户/并发/跨浏览器矩阵。
- FLOW-001 未被 accepted；本报告不替代主控看图/试路径；等待主控决定整批 accepted。
