# 3–5 分钟真实点击路径（Interactive Mock Product）

2026-11-05，在真实生产构建 `http://127.0.0.1:3100` 上以 Playwright Chromium 实际执行，无 console/page error；时间约 3–5 分钟。所有截图与观察记录位于 `evidence/product/ip-009/`，原始步骤记录见 `click-path-observations.json` 与 `control-audit-observations.json`。

| # | 操作 | 可观察结果 | 证据 |
|---|---|---|---|
| 1 | 冷启动 `/` Overview | 首屏用途、主 CTA、三机会真图/推荐；Demo·Mock data；下载空态诚实 | `ip-009/01-overview-1440.png` |
| 2 | Explore opportunities → `/opportunities` | 恰三机会，无分数；View strategy 精确 | `ip-009/02-opportunities-1440.png` |
| 3 | 打开 A Gesture, Considered 策略详情 | recommendation/rationale/insights/完整 Brief/证据/假设不确定性可读；Open campaign 指向 brief.id | `ip-009/03-opportunity-detail-1440.png`、`04-...` |
| 4 | 证据 → Radar 对应 signalId | 打开精确信号 Drawer，含全部模拟证据/趋势/关联机会；关闭保留筛选 | `ip-009/05-radar-signal-drawer-1440.png` |
| 5 | Radar 筛选 Instagram → Clear | URL 变化与恢复；15 信号；趋势 0–100 示意指数 | `ip-009/06-radar-1440.png` |
| 6 | Agent activity → Step/1×2×4×/Play/Pause/Seek/Restart，Your actions | 仅显式操作创建 purpose=activity 会话；Preset 与 Your actions 分区；工作稿无变化 | `ip-009/07-radar-activity-1440.png`、`08-...` |
| 7 | Atelier B AR Storyboard → EN Copy | 默认结果预览、四镜头真实图、AR RTL、版本预览只读 | `ip-009/09-atelier-ar-storyboard-1440.png`、`10-...` |
| 8 | Edit script → 修改字段 → Close | 显式编辑上下文；脏稿 Save/Discard/Cancel 保护 | `ip-009/11-atelier-editor-1440.png`、`12-guard-dialog-1440.png` |
| 9 | View deliverables → Deliverables B AR 预置 | 内容清单 + Draft/Not confirmed 标记 | `ip-009/13-deliverables-1440.png` |
| 10 | Download content pack | 真实 ZIP 下载（`click-path-preset-export.zip`，sha256 e80b8351…），记录 download_triggered，无 session/邮件 | `ip-009/14-deliverables-export-1440.png` |
| 11 | Simulate email delivery → Confirm this script → Save draft → Simulate | 次级抽屉；确认后保存精确 revision；Simulated attempt 记录；与普通导出分区 | `ip-009/15-...`、`16-...` |
| 12 | 返回 Overview | Recent downloads 出现真实 export；点击回 Deliverables 精确详情 | `ip-009/17-...`、`18-...` |
| 13 | Creative Library → Preview | 12 项真实 EN/AR 脚本/分镜；Drawer 可读；Open in Atelier 精确版本 | `ip-009/19-...`、`20-...` |
| 14 | A 场景 AR：Edit → 改标题 → Save → Confirm | 派生不可变版本；确认只作用精确版本；刷新保留 | `ip-009/21-atelier-confirmed-ar-1440.png` |
| 15 | Library 按 Saved+AR 筛选 | 立即可见同 Campaign/version/session 保存稿 | `ip-009/22-library-saved-ar-1440.png` |
| 16 | Deliverables 选中该 saved 版本 → Download | Confirmed current 包真实下载（`click-path-saved-export.zip`）；旧导出原字节保留 | `ip-009/23-...`、`24-...` |
| 17 | 1366 / 390 复查 | 六页无横向溢出（1366 overflow 全 0；390 全 0，含 Radar 长 tag 换行修复） | `25–31-*.png`、`32–36-*.png` |

## 只读与副作用快照

- 冷启动六路由 + 任意顺序浏览：sessions=0、productExports=0（`product-cross-page.spec.ts`）。
- 显式编辑后再次全站浏览：session revision/activeBrief/activeVersion/workflow/history、exports 快照完全相同。
- 普通导出：不创建 session、不写邮件 attempt；Draft 披露正确；重复下载原 bytes sha 一致。
- Activity：打开抽屉不建会话；Play/Step 只创建 purpose=activity 会话，工作会话 revision/workflow 不变。
- Back/Forward/刷新：同 Campaign/version/session 内容保持。
