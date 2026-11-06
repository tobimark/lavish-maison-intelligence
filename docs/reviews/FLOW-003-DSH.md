# FLOW-003-DSH · 视频＋文案的社媒帖子与模拟发布

日期：2026-11-06 · 状态：完成并提交主控审查（不自行 accepted）

## 范围

复用 FLOW-001 的 `SocialDraft`/`SocialAttempt`/storage/social 组件；补齐真实 UI 交互缺陷与 `product-social-publish.spec.ts`，未改冻结 Schema/旧 API，未接真实 Instagram。

## 用户路径

Journey Social 舞台左侧：EN/AR 发布文案选择、Edit → 编辑 caption/CTA/hashtags → Save → Review（必要时先“Review creative”显式确认源脚本）→ Simulate publish；右侧 Instagram 风格预览使用同一真实 10.08s/720×960/3:4 provided MP4，native controls，不裁 9:16、不重生视频。确认框显示已保存的准确语言、caption、CTA、hashtags、账号、channel 和视频 SHA；成功后显示内部模拟帖子卡/时间/View simulated post；刷新保留；历史 attempt 不可变。

## 本轮真实修复

| 文件 | 问题 | 修复 |
|---|---|---|
| `JourneyPage.tsx` | Save/Review/Publish 后的 `onChanged` 让整页 loading → SocialStage remount，语言回 EN；AR 保存会写进 EN 稿 | silent refresh，不卸载 stage；EN/AR 独立稿与当前语言保持 |
| `SocialStage.tsx` | 发布成功后的重复 confirm 可能再建 attempt（快速双击时第二次在第一次完成后的 microtask 触发） | `publishCompletedRef` 在成功后置位，同一次审阅的重复提交忽略；双击只产生 1 attempt/1 receipt |
| `apps/web/tests/product-social-publish.spec.ts`（新增） | 无真实 UI E2E；history 的 card/link 同前缀导致计数歧义 | 新增 5 条 UI 全路径；计数限定 `article[data-testid^="SOC-attempt-"]` |

## E2E 覆盖（5 passed）

1. **EN 主路径**：预设只读（无稿、Review/Simulate disabled）→ Edit → 保存自定义 caption → 刷新恢复 → Review 确认框验证 English+caption+视频 SHA → Simulate → View simulated post → 详情页快照（English/720×960/Simulated）。
2. **EN/AR 独立稿**：EN/AR 分别 Edit/Save（AR RTL）；刷新后各自恢复；AR Review/Simulate 确认框为 Arabic+阿拉伯语 caption；AR 详情快照 `dir=rtl`；回 EN 仍保留 EN 稿。
3. **未保存保护**：Reviewed 后改 caption 不保存 → dirty note 可见、Simulate/Review disabled；点侧栏 Opportunities 出现 guard，取消留在 Journey；Discard 回到已保存值。
4. **发布后改稿/旧帖不变**：双击发布确认只落 1 个 `article` attempt；发布后改 caption + Save → revision+1，旧帖详情仍显示原 caption，不随新稿变化。
5. **响应式/RTL**：1366 与 390 的 AR social 无横向溢出；截图落盘。

## 命令

| 命令 | exit | 结果 |
|---|---:|---|
| `npm run typecheck` | 0 | 通过 |
| `npm run build` | 0 | 通过，buildId `T670BiVsBqlwygOwybuAg` |
| `npm run test:e2e -- product-social-publish.spec.ts` | 0 | **5 passed / 0 failed** |
| `npm run test:unit -- tests/poc/social-workflow.test.ts` | 0 | 见最终 batch 记录；覆盖失败 attempt/retry、幂等 receipt、旧快照、迁移等 |

## 证据

`evidence/product/connected-flow/final-2026-11-06/`：
- `social-ar-1440.png`、`social-ar-1366.png`、`social-stage-ar-390.png`
- `social-published-ar-1440.png`
- `social-post-detail-en-1440.png`、`social-post-detail-ar-1440.png`
- `social-e2e.log`（5 passed）

## 明确边界

- 只有 Instagram 一条模拟路径；无真实平台/账号/URL/metrics。
- 页面持续显示 `Simulated`、`No content was sent to Instagram`；账号为 `Lavish Perfumes · Demo account`。
- 未把 10.08s 提供片描述为 15s 成片；未加 9:16 裁切或重生视频。
- **失败/Retry E2E：NOT_RUN**。`flow-commands` 的 `simulateFailure` 是 TEST ONLY，页面没有公开失败开关；按 handoff 不向客户页加假失败按钮。失败保留稿/新 attempt 的重试逻辑由 `tests/poc/social-workflow.test.ts` 覆盖，未用 UI 假成功替代。
- 发布后的“再编辑→再审阅→再次模拟发布”未重复做第二次发布；已覆盖发布后新 revision 和旧帖不变。
- 未做生产级并发/多标签页；双击同页已覆盖。
