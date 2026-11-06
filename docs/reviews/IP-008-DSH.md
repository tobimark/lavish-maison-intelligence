# IP-008 · Deliverables 真实导出与次级模拟交付 · DSH 实施报告

日期：2026-11-05。状态：implemented，等待主控集中 review；不自行 accepted。

## 变更

- 新增 `components/product/deliverables/DeliverablesPage.tsx`：
  - 直接展示三 Campaign 的 EN/AR 预置稿与保存版本（Campaign/Language 筛选、选择版本只读预览、Preset/Saved、Draft/Confirmed 标记、真实内容清单）。
  - 主 CTA `Download content pack` → `exportScriptPack` + 真实触发下载 + `markProductExportTriggered`；无 Run/确认/模拟邮件前置；成功仅说 `Download started` 并记录版本/时间/真实文件名；内部 hash 只在 Details。
  - Recent exports：详情含文件名/版本/状态/size/SHA-256/attachments；`Download again` 用 `getProductExport` 返回原 bytes，不重新生成；准备/下载触达诚实区分；失败显示错误与 Retry，不假成功。
  - 未确认版本包内明确 Draft/Not confirmed，不因下载而确认；旧导出在新版本保存后保留原字节。
  - 次级 `Simulate email delivery` 抽屉复用既有 ContentDelivery：未确认先显式 Confirm；保存 draft 后才允许成功/失败；dirty 时两按钮禁用并说明；失败→重试保留 attempt；attempt 导出真实 ZIP；普通 export 与邮件 attempt 分区。
- 复用既有 ZIP builder（含 media/ 目录）与 ContentDelivery 状态机，未复制第二套。

## 验证（真实 exitcode）

| 命令 | exitcode | 证据 |
|---|---|---|
| `npm run typecheck` | 0 | evidence/product/ip-008/typecheck.log |
| `npm run build` | 0 | evidence/product/ip-008/build.log |
| `PLAYWRIGHT_PORT=3100 npm run test:e2e -- apps/web/tests/product-deliverables.spec.ts` | 0（4 tests） | evidence/product/ip-008/deliverables.log |

覆盖：干净浏览器直接导出 B(AR)/C(EN) 预置稿 → 真实 ZIP、sessions=0、email attempts=0、export 记录=download_triggered、未确认；下载字节 SHA 与 DB 记录 hash 一致；Details 展示 hash；再次下载 bytes 完全相同；Atelier 保存 AR 稿（含 subtitle 文本/时码）→ Deliverables 精确导出 Draft → 显式 Confirm 后再导出 Confirmed current，旧 Draft 记录原字节不变；邮件抽屉：未确认 gate→Confirm→dirty 禁用→Save→成功/失败/重试三次 attempt、导出 attempt ZIP、不产生普通 export 记录。

## ZIP 标准解压核对（evidence/product/ip-008/zip-audit.json）

标准 Expand-Archive 解压 5 个真实下载包：
- B-AR preset（8 条目，sha256 b70b2179…f2a1）：title=الهدية تبدأ بفكرة.，unconfirmed，7 附件 hash 全匹配，媒体 perla/logo hash 与源包一致，无 MP4。
- C-EN preset（8 条目，d1d781a6…0abb）：oud 媒体真实嵌入，unconfirmed。
- Saved AR Draft（9 条目，title=عنوان حزمة التسليم，unconfirmed）：subtitle1=نص ترجمة محفوظ，4 cues，storyboard 4 shot 时码并引用三张真实媒体，README 标 Draft / Not confirmed、No MP4。
- Saved AR Confirmed（9 条目，confirmed_current，README/EXPORT 状态与 Draft 不同）。
- Mail simulated attempt（5 条目）：含 SIMULATED-DELIVERY.json、email.txt、script.json、VTT，无 MP4；无普通 EXPORT.json。

## 视觉证据

- 终版基线：`evidence/product/ip-009/13-deliverables-1440.png`、`31-deliverables-1366.png`、`36-deliverables-390.png`、`14-deliverables-export-1440.png`、`15-deliverables-mail-1440.png`、`16-deliverables-mail-attempt-1440.png`、`18-deliverables-export-detail-1440.png`、`23-deliverables-saved-confirmed-1440.png`。

## 已知限制 / NOT_RUN

- 模拟邮件仍为本地「Simulated」记录；无真实发送/回执。
- 视频/MP4/poster 继续 deferred，包内明确 noVideo。
