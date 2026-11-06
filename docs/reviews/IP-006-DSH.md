# IP-006 · Atelier 结果预览与按需编辑版本 · DSH 实施报告

日期：2026-11-05。状态：implemented，等待主控集中 review；不自行 accepted。

## 变更

- 新增 `components/product/atelier/AtelierPage.tsx` 与 `components/product/shared/PreviewBlocks.tsx`（ScriptPreview/StoryboardPreview/VersionBadges，供 IP-007/008 复用）。
- 默认结果预览：真实 Campaign 选择器（3 项）、Brief/Copy & script/Storyboard tabs、EN/AR 切换；`?campaignId=&language=&versionId=&sessionId=&tab=` 精确直达；无 query 默认 A；未知 Campaign/版本明确提示并可回默认，不静默换 A。
- 版本列表原样展示 Preset/Saved、Unconfirmed/Confirmed 与已有导出；版本/语言切换仅调用 getCampaign 预览，不调用 selectScript、不撤销确认、不建会话。
- 编辑按需：Edit script 才调用 beginCampaignEdit（稳定 creationKey 防重复工作稿）；复用既有 saveScriptDraft/confirmScript/状态机；常用字段（title/hook/message/cta/caption/hashtags）在前，镜头/字幕时码收进 Advanced；AR 编辑字段 dir=rtl；Confirm 在脏稿时禁用并要求先 Save。
- 保存产生不可变派生稿并刷新 URL 预览；确认仅作用精确 active version；Discard 恢复已保存快照且不复活旧稿；关闭/离开走 NavigationGuard Save/Discard/Cancel。
- 为避免把旧四步壳体塞回，编辑器复用既有命令与状态机语义，但以独立结果预览 + 按需 Drawer 呈现，不嵌入旧 ContentOnlyFrame 四步流程。

## 验证（真实 exitcode）

| 命令 | exitcode | 证据 |
|---|---|---|
| `npm run typecheck` | 0 | evidence/product/ip-006/typecheck.log |
| `npm run build` | 0 | evidence/product/ip-006/build.log |
| `PLAYWRIGHT_PORT=3100 npm run test:e2e -- apps/web/tests/product-atelier.spec.ts` | 0（4 tests） | evidence/product/ip-006/atelier.log |

覆盖：B/C 带 language+tab 深链预览无会话；AR 内容 dir=rtl；Copy/Brief/Storyboard tabs；四镜头真实图、Logo ≤147px、无 `<video>`；显式编辑→保存→刷新→确认归属正确；版本预览切换不撤销确认（DB activeScriptVersionId 不变）；Discard 后重开不复活；AR 编辑保存内容跨刷新保留。

## 视觉证据

- `evidence/product/ip-006/atelier-A-1440.png`、`atelier-A-1366.png`
- `evidence/product/ip-006/atelier-A-ar-storyboard-1440.png`、`atelier-A-ar-390.png`
- `evidence/product/ip-006/atelier-confirmed-1440.png`、`atelier-ar-1440.png`、`atelier-storyboard-1440.png`

## 已知限制 / NOT_RUN

- 编辑器 Drawer 为模态，背景菜单不可点击；因此“离开保护”通过关闭 Drawer / 浏览器刷新 / 后续可导航场景触发（已实测 Cancel/Discard/Save）。
- 视频仍 deferred，不提供播放器/MP4 下载。
