# AS-004-HOME-CORRECTION · 主控审查

日期：2026-11-05。执行者：dsh（本会话）。规格：tasks/assets/AS-004-HOME-CORRECTION.md。主控：lead。

## 结论

**本次首页修正通过主控视觉/交互审查（AS-004 范围内），无需返工。** 批次仍 **not accepted**，因为 SERENITY 1.1.0 内容未到，AS-003 绑定、AS-005 含 MP4 包、AS-006 完整审计仍未完成；本结论只针对首页修正。

## 主控实际查看

- [home-purpose-1440.png](../../evidence/product/assets/home-correction/home-purpose-1440.png)：H1「From market insight to campaign-ready creative」+说明句+两个真实 CTA 在素材区之前；SERENITY 三卡 01→02→03；1440 下卡片说明/操作行仍可见。
- [home-purpose-1366.png](../../evidence/product/assets/home-correction/home-purpose-1366.png)：用途/CTA/三阶段媒体与标题在首屏；说明/操作行在折叠线下（规格只要求媒体与标题）。
- [home-video-preview-1440.png](../../evidence/product/assets/home-correction/home-video-preview-1440.png)：完整播放器仅在 Dialog；真实 3:4 720×960 视频、原生 controls、Provided 标签。
- [home-image-preview-1440.png](../../evidence/product/assets/home-correction/home-image-preview-1440.png)：identity 白底原图预览，产品标签完整。
- [home-purpose-390.png](../../evidence/product/assets/home-correction/home-purpose-390.png)：单列 01→02→03，无横向溢出。
- [deliverables-compact-regression-1440.png](../../evidence/product/assets/home-correction/deliverables-compact-regression-1440.png)：首页专用布局未泄漏到 Deliverables。

## 主控独立验证（3130 新构建）

| 检查 | 结果 |
|---|---|
| 1440 H1/用途先于素材 | pass；DOM order `identity→hero→video` |
| 1440 三卡等宽/媒体框/标题/操作行 | 卡宽差 0、媒体高 240、媒体顶/底差 0、caption/action 顶差 0 |
| 1366 | 卡宽差 0.02px、媒体高 220、顶/底差 0、无溢出；三阶段标题在首屏 |
| 1440/390 | 无横向溢出；390 单列顺序正确 |
| 首页无逐项下载/技术文字 | 无 Download/MB/px/ms/版本文字；无 1.1.0 工程段落 |
| awaiting 文案 | 仅「Campaign copy is being prepared.」 |
| 首页初始播放器 | 无 controls 的缩略 preview；完整播放器仅 Dialog |
| 视频 Dialog | 720×960、3:4 contain、10.08s、controls、paused 初始；play→pause→seek 7.56s 通过；ESC 关闭后播放器卸载/暂停 |
| CTA | Explore opportunities→`/opportunities`、Browse creative work→`/atelier` 实际跳转 |
| Deliverables 回归 | compact showcase 保留、`DEL-bilingual` 仍可用；双语 ZIP/MP4 下载测试通过 |
| 独立 E2E | `product-provided-assets.spec.ts` 7 + `product-deliverables.spec.ts` 4 = **11 passed**（Lead 在 3130 跑） |
| 冻结/内容 | scenario Schema、Tokens、场景 JSON、素材字节未变；`scenarios/scent-layering/1.1.0` 不存在、sidecar `awaiting_serenity_content` |
| 矩阵 | 119 行不变；仅更新首页预览入口的 page/scope，未删失败项 |
| 旧证据 | `evidence/m1/shell`、`evidence/poc/prototype` 未被本次修改 |

## 已知限制（不阻断本次首页修正）

- 1366×768 下卡片说明/操作行在折叠线下；媒体与标题在首屏，符合规格。如要求整卡首屏需再压缩媒体高度，建议等主控明确后再做。
- 视频 poster 复用 Hero，仅 `hero_reference`，不声称影片帧/官方封面。
- 首页下方旧 A 机会/Brief 仍是历史 OUD/PERLA 内容，未伪装 SERENITY；内容未绑定前不改变这一点。
- 首页下载入口已按要求集中到 Library/Deliverables。

## 证据与报告

- DSH 报告：`docs/reviews/AS-004-DSH.md`；对齐原始数据：`evidence/product/assets/home-correction/alignment.json`
- 本会话 E2E/typecheck/build 日志：`evidence/product/assets/home-correction-{typecheck,build,e2e,deliverables-e2e}.log`
- 主控复跑：3130 端口当前构建（BUILD_ID `iZx-V2pwKCI-lrlF4Y9It`）上 11 tests passed；本轮无新增已持久化截图（复用上面 6 张，均经主控实际打开）。

## 首页修正后的回归修复（FIX-02 / FIX-03）

主控复跑发现两处**测试过期**（非产品缺陷），已由 DSH 仅改测试修复：

1. **FIX-02**：`product-navigation.spec.ts` 与 `poc-prototype.spec.ts` 仍断言旧 H1「Marketing opportunities for Lavish」及旧「Video deferred」徽标。已更新为新 H1/当前状态，核心断言保留；3130 上 navigation 5/5、poc-prototype 10/10、provided-assets 7/7。
2. **FIX-03**：`product-as-audit.spec.ts` 仍假设首页直接存在完整播放器；新首页初始只有缩略预览，完整播放器在 Dialog。已改为打开 `home-preview-dialog` 后断言 controls/720×960/10.08s，并保留 AS 控件收集与 NOT_RUN 项；AS 控件 10/10 来自 DOM、`missingFromDom=[]`。

**主控最终全量复跑（3130 新构建）：39 passed / 0 failed**（11 个 product spec，2.6m），覆盖 IP 原链路、首页修正、AS 资产、双语 ZIP、独立 MP4、矩阵 DOM 与 AS 审计。

## 批次状态

仍等待 SERENITY A 1.1.0 网页内容，之后按 `AS-003-INTAKE-CHECKLIST.md` 完成 AS-003/AS-004 剩余/AS-005/AS-006；只有主控实际看图与试路径后才可 accepted。首页修正本身视觉/交互通过，FAST_06 整体仍未 accepted。
