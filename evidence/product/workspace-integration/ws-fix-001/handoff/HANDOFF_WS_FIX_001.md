# 转交 DeepSeek：WS-FIX-001，仅修 Library Campaign 上下文

项目：D:\workspace\maison-intelligence。执行者沿用原 DSH。状态：Ready。完成后只标 Submitted 并停止，等待主控复审。不能自行宣称 WS 最终结项。

## 问题已复现

主控在现有生产构建 Qn1edGDBs90rcVr7YkDrq 实测：从 A 1.1.0 / EN Library 通过 Campaign select 改为 B，列表和 URL 变成 B，侧栏 Atelier / Deliverables href 仍带 A；点击 Atelier 实际进入 A，刷新仍为 A。切换后的 URL 也残留 A 的 scenarioVersion=1.1.0。

请先阅读同包 REVIEW.md、results.json、截图及外部报告；不要再以“只有静态风险”结束。用户认可当前演示效果，仅修实际缺陷，不重做页面。

## 必须修复

1. Shell 在 pathname **及 query** 变化时反映当前上下文。不得通过定时轮询、第二套 localStorage/DB 或修改浏览器历史原型解决。可用 Next 响应式 search params / 局部 Suspense 等正常方式，避免破坏静态构建和 hydration。
2. Library 显式切换 Campaign 时清理上一案例的 versionId/sessionId/无效精确预览引用，并为新 Campaign 解析其真实合法场景版本。language 保留合法 en/ar；类型与来源筛选如有意义可保留。
3. 不要只删除 scenarioVersion 就结束：共享 helper 当前会填 A 的 1.1.0。必须证明 B/C 最终用自己的合法版本，A 返回当前公开 1.1.0；读取已有公开索引/只读 API，避免在各页新增散落的版本硬编码。
4. 手工输入显式未知 Campaign/非法版本继续诚实报错，不静默回退 A。合法旧历史版本及同 Campaign 下明确精确版本不能被一律强制改为最新。
5. Clear filters 不能遗留已清除案例的 scenarioVersion、versionId/sessionId；All campaigns 的导航按既有冷入口语义解析，不能继续用已取消选择的旧案例。若打开旧预览，切 Campaign 后也不得继续展示旧案例预览。
6. 保持六菜单、高亮、NavigationGuard、EN/AR 独立、只读浏览零写入、旧帖快照/导出不变。B/C 不能借 A 的视频或文案；不新增假发布入口。

## 修改范围

- 优先 `apps/web/components/shell/AppShell.tsx`、`apps/web/components/product/library/LibraryPage.tsx`。
- 必要的既有共享上下文/路由 helper、必要局部 Suspense 包装（限明确解决本问题，报告原因）。
- 新增定点测试，或扩充 `apps/web/tests/product-workspace-integration.spec.ts` 中相关断言。
- 新证据/报告仅 `evidence/product/workspace-integration/ws-fix-001/<全新run目录>/**`、`docs/reviews/WS-FIX-001-DSH.md`。
- 不修改设计系统/Tokens/内容 JSON/媒体、状态机/数据库契约，不做 P2 排版整理，不改审批文件、历史报告或既有证据。

改动前保存本卡起点源码与 SHA256，含相关 helper；另记录内容、视频/资产 receipt、Schema/Tokens 的保护 hash。交付本卡增量 diff，不混用其他阶段起点。

## 最小实际浏览器复验

使用干净 context，现有 A 1.1.0 / EN URL 入场，**真实操作** Library Campaign select（不能用 goto(B)替代）：

1. A → B：URL、可见素材、左栏 Atelier / Deliverables href 在点击前已一致指向 B 合法版本。保留 EN。
2. 点左栏 Atelier，核对 B；刷新仍 B；返回 Library，仍 B；再点 Deliverables，仍 B 且诚实缺项、不借 A。
3. 补 B→C→A、AR 语言同路径更改，以及 All campaigns/Clear filters 的 query 清理断言。回到 A 时为合法当前版本。
4. 带 A 精确 versionId/sessionId 的 Library URL 换到 B，旧引用消失，不自动打开 A 预览；同 Campaign 正常精确引用不被误删。
5. 显式未知 Campaign/非法版本不悄悄回退；六菜单高亮唯一正确。
6. 操作前后 sessions / social draft / attempts / exports 数量不因上述只读浏览增加。只读 source 查询不写业务状态。

至少交 A 起点、切 B 后（日志含 href）、B Atelier、B Deliverables、回 A 的 1440 截图和完整 URL/有效版本记录；小屏与 P2 不新增验收范围。

## 验证与证据隔离

- 运行 typecheck、build；运行新增定点测试及必要的六工作区/旧 URL 回归；涉及共享版本解析的已有单测也需通过。无需为了凑数重跑整套历史脚本。
- 所有脚本先确认输出路径。每次设置 EVIDENCE_ROOT 到本卡全新 run 目录，Playwright outputDir/截图/日志/下载均隔离；不要运行会写 accepted 目录的旧脚本，不覆盖上次 run。
- 若 spec 不读取 EVIDENCE_ROOT，先使**该新增测试**支持隔离，再运行；不得依赖设置环境变量就假定所有脚本已隔离。
- 报告实际命令/退出码/测试数量、新构建 ID、源码/截图 hash、每步 Campaign/scenarioVersion/language、全部关键 href、只读业务计数、已知限制、实际模型标签。不得把 build 成功当作交互复验。
- 保留历史证据事故披露，不伪造恢复；失败/Retry UI、390 AR、真实平台与15秒片仍维持原状态。

提交 `docs/reviews/WS-FIX-001-DSH.md`，只标 Submitted。完成后停止，由主控实测复审通过再结项。
