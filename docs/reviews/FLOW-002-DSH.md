# FLOW-002-DSH · 首页入口与四段营销 Journey

日期：2026-11-06 · 状态：完成并提交主控审查（不自行 accepted）

## 范围

FLOW-001 已有 Journey 四段/flow API/存储；本轮只收尾主链、修真实缺陷、补证据与报告。未重写、未回退 FLOW-001，也未恢复旧首页三卡。

## 主链实现

- 首页保留 FLOW connected-case：H1 “From social trends to your next Lavish campaign.”、一句业务说明、一个明确 `Explore the campaign` 入口（`OV-explore-journey` → `/campaigns/scn-scent-layering.brief.main/journey?scenarioVersion=1.1.0`）、四段摘要、六工作区侧栏。
- Journey URL：`/campaigns/[campaignId]/journey?scenarioVersion=1.1.0&stage=insight|strategy|creative|social`；四段可深链、刷新、直接切换，无阶段锁；同一 Campaign 上下文始终显示。
- Insight：先给作者 `takeaway`，再列真实信号观察、趋势上下文和展开证据；明确模拟信号/不编营销结论。
- Strategy：先回答为何 SERENITY、为何这种 single-product 克制创意，再展示产品 identity、Brief 字段和“Open full brief”准确链接。
- Creative：原图 → 主视觉 → 提供视频三步业务解释；真实 10.08s/720×960/3:4 播放器（native controls，不自动播放）；15 秒四镜头 EN/AR 脚本作为独立“not produced”概念展开，不假生成；同一提供片不挂 15s VTT。
- Social：第四段直接进入真实社媒工作台（见 FLOW-003），非素材画廊/下载/邮件终点。
- 每段有明确下一步 CTA；六工作区侧栏始终可用；冷进入任意段只读，不建 session/export/social 记录。

## 本轮修复的真实缺陷

| 文件 | 缺陷 | 修复 |
|---|---|---|
| `apps/web/components/product/journey/JourneyPage.tsx` | social 保存/审阅/发布后 `onChanged=load` 触发整页 loading，SocialStage 卸载重挂，EN/AR 当前语言被重置，AR 稿可能写到 EN 草稿 | 增加 silent refresh：已就绪时后台重读 journey，不卸载当前 stage，保留语言/表单/滚动 |
| `apps/web/components/product/journey/social/SocialStage.tsx` | 发布成功后再触发一次 confirm 可能创建第二个 attempt | 新增 `publishCompletedRef`，成功后同一审阅快照的重复提交直接忽略；双击实测只落 1 条 attempt/1 条 receipt |

## 验证

| 命令 | exit | 结果 |
|---|---:|---|
| `npm run typecheck` | 0 | 通过 |
| `npm run build` | 0 | 通过，buildId `T670BiVsBqlwygOwybuAg` |
| `npm run test:e2e -- product-connected-flow.spec.ts` | 0 | **10 passed / 0 failed** |

覆盖：首页唯一入口 → insight；四段 deep link/刷新/Campaign 固定；tabs 真实 href/active；creative identity+hero+10.08s 真视频；EN/AR 四镜头/字幕；四段 next CTA + brief 同 Campaign；未知 campaign/version/invalid stage 诚实可恢复；浏览零 session/export/social；1440/1366 无横向溢出。

## 证据

`evidence/product/connected-flow/final-2026-11-06/`：
- `home-1440.png` / `home-1366.png`
- `journey-insight-1440.png` / `journey-insight-1366.png`
- `journey-strategy-1440.png` / `journey-strategy-1366.png`
- `journey-creative-1440.png` / `journey-creative-1366.png`
- `journey-social-1440.png` / `journey-social-1366.png`
- `connected-flow-e2e.log`

## 业务解释核对

- 热点：先展示“观察/意义”（takeaway），再按需展开四条真实模拟信号、趋势和五条 evidence；无增长率/平台测量声称。
- 策略：`whyThisProduct` 解释选择 SERENITY 的依据（官方 citrus/floral/musk 边界、单产品 editorial、不编 note order/performance），并给准确 Brief 路径。
- 创意：identity 为固定身份参考；hero 只加氛围、瓶标保持可见、道具非成分证据；provided video 是独立 10.08s preview，非 15s 四镜头成片渲染。
- 社媒：同一 provided 视频 + 准确 EN/AR 预设文案；明确 Demo account、Simulated、No content sent。
- 15 秒概念独立展开，页面明确“not produced”；不把提供片冒充 15 秒成片。

## 未完成 / 限制

- FLOW-001 未被 accepted；本报告只覆盖本轮收尾，不代表整批 accepted。
- 15 秒概念片/poster 未制作（作者 pending），AR 仍待母语/品牌审稿。
- 社媒发布失败重试的 UI 分支无公开失败入口；由 `tests/poc/social-workflow.test.ts` 覆盖，E2E 标 NOT_RUN（见 FLOW-003 报告）。
- 未做真实平台/账号/后端/并发；明确 mock/local。
