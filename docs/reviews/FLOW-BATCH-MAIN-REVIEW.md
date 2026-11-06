# FLOW 批次 · 主控审查

日期：2026-11-06。执行者：唯一 DSH。范围：tasks/DSH_HANDOFF_FLOW_FINISH.md（FLOW-002/003/004 收尾 + FLOW-BATCH-DSH），AS 批次已 accepted、不重做；15 秒制作与 AR 母语审稿不作本批前置。

## 结论

**FLOW-002/003/004 批次 accepted（实现 + 真实 UI 测试 + 证据）。** 单条完整案例链已可操作：首页 → 热点观察/证据 → 为何 SERENITY/Brief → 原图/主视觉/真实 10.08s 视频 → EN/AR 社媒文案编辑保存 → 显式确认 → 审阅 → 模拟发布 → 详情/刷新 → 下载内容包/MP4 → 自由返回其他工作区。

不包含/不声称：FLOW-001 单独 accepted；15 秒成片/poster；AR 母语/品牌审稿；真实 Instagram/平台/API/邮件/后端；生产级并发/跨浏览器。

## 主控实际验收

### 视觉/主路径（实际打开 16 步证据）

- `accept-01-home` → `accept-04-strategy`：首页唯一 SERENITY 案例入口；四段 tabs 可直接访问；热点段先结论、证据按需；策略段用官方 citrus/floral/musk 边界解释为何单产品 editorial，无新功效声明。
- `accept-05-brief` → `accept-07-creative-ar-script`：Brief 1.1.0；创意段 identity→Hero→video 三卡解释演进；真实视频 720×960/10.08s/3:4 contain/native controls，实际 play→seek 7.56s；15s 概念脚本独立展开、标未制作；AR 脚本 RTL。
- `accept-08-social-preset` → `accept-13-social-post-detail`：社媒左编辑/右 Instagram 预览；仅 Edit 建稿；Review 确认框逐字显示语言/caption/CTA/hashtags/video SHA；Simulate publish 后创建内部帖子；详情页刷新 caption 不变；明确 “Simulated / No content sent to Instagram”。
- `accept-14-deliverables` → `accept-16-atelier`：ZIP/MP4 可用；Radar/Atelier 可自由返回；无死入口。
- AR 帖子：`social-published-ar-1440.png`、`social-post-detail-ar-1440.png`、`social-ar-390.png`，RTL 方向正确。

### 交互正确性（真实 UI + 单测/证据）

- EN/AR 各自草稿保存与刷新恢复；切换语言不覆盖另一稿。
- 未保存修改时 Review/Simulate 禁用；侧栏离开触发 guard；Review creative 显式确认后才可审阅。
- 双击发布只产生 **1 条 attempt / 1 条 receipt**（`simulated-post-snapshot.json`：attemptCount=1、published_simulated、EN、revision 3、视频 SHA 匹配）。
- 发布后编辑草稿 revision+1，旧帖详情 caption 保持原快照（acceptance-observations `detailCaptionAfterReload` 一致）。
- 修复 2 个真实缺陷：JourneyPage 保存后 remount 导致语言重置/AR 稿误写；SocialStage 发布成功后重复 confirm 再建 attempt。

### 真实下载

主控独立解压 A 包（`flow-a-1.1.0-en-ar-pack.zip`，10,736,352B，SHA `d598eddc…1e233`）：21 files；`EXPORT.json` `noVideo=false`、`noRealEmail=true`、en-v2/ar-v2@1.1.0；包内 hero SHA `1c4e337b…b37499`、identity `f75fa10b…026af62`、MP4 1,315,394B SHA `15d3756a…31e10e`，全部与 receipt 一致；独立 MP4 同样一致。

### 测试/矩阵

| 命令 | 结果 |
|---|---|
| typecheck / build | exit 0 / 0，buildId `T670BiVsBqlwygOwybuAg` |
| flow-projection + social-workflow 单测 | 18 passed |
| connected-flow + social-publish + provided-assets + cross-page E2E | 27 passed / 0 failed |
| product-matrix-dom | 1 passed；AS 119 行保持 108 found/1 guarded/10 NOT_RUN |
| FLOW 控件 DOM | 36/36 found；矩阵 155 行（101 IP+18 AS+36 FLOW） |

## 来源表

`docs/reviews/FLOW-CONTENT-PROVENANCE.md` 逐字段映射到批准文件 + JSON Pointer，分原文复用/机械拆分/改述；caption 除 hashtags 拆分外逐字核对；未新增营销结论/产品事实/效果声称；明确 sidecar 为 DSH 从批准内容装配、非网页作者正式交付。

## 主控披露/限制

1. **社媒发布失败/Retry 的真实 UI 分支 NOT_RUN**：页面无公开失败开关，未加假按钮；失败保留稿/新 attempt 由 `social-workflow.test.ts` 覆盖。E2E 未伪造该路径。
2. 验收帖子快照使用 “FLOW acceptance caption — …” 测试文案（本地真实记录），不是最终营销预设；预设文案在 `accept-08` 可见。主控以此验证快照机制，不将该测试文案当客户文案。
3. 15 秒概念片/poster 未制作、AR 待母语审稿；无真实 Instagram/平台/后端/邮件；无生产级并发/跨浏览器矩阵。
4. FLOW-001 未被单独 accepted；本批只对 FLOW-002/003/004 当前实现与证据负责。AS 批次未被重做；`product-contract.ts` 的增量来自 FLOW 批次，已在报告中列明、未回退。

## 证据

- 报告：`docs/reviews/FLOW-002-DSH.md`、`FLOW-003-DSH.md`、`FLOW-004-DSH.md`、`FLOW-BATCH-DSH.md`（含 3–5 分钟中文演示稿）
- 证据根：`evidence/product/connected-flow/final-2026-11-06/**`（16 步截图、AR RTL、ZIP/MP4、帖子快照、矩阵审计、日志）
- 来源表：`docs/reviews/FLOW-CONTENT-PROVENANCE.md`
- 主控独立解压/哈希：本报告记录；ZIP SHA `d598eddc6923b9abacee345213500c203e5fa35d64ac396b9a67c2318be1e233`
