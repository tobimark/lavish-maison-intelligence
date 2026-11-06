> 2026-11-05：主控accepted/closed，见docs/reviews/FIX-NV-BATCH-01-ACCEPTANCE.md。以下为历史修复规格，不重新执行。

# FIX-NV-BATCH-01 · 交付快照与脚本丢弃一致性

Status：ready；主控复查已真实复现，非要求扩展边缘测试。只修本批，不开始新功能。

## Goal / Dependencies

消除普通编辑路径的两处数据不一致，完成NV批次验收前必要小修。依赖现有NV-001/002/003提交；无需视频或新内容，也不要求这些任务先accepted。

## Context

必读docs/reviews/NV-BATCH-MAIN-REVIEW.md（R1/R2）、docs/CONTENT_ONLY_DELIVERY.md、tasks/DSH_HANDOFF_DEMO_FAST_04.md、docs/DESIGN_SYSTEM.md、docs/pages/POC_WORKFLOW.md；复查主控evidence/poc/nv-main-review/recheck-results.json与recheck.cjs。原DSH报告和主控证据只读。

## Allowed Files

- apps/web/components/poc/ContentOnlyFrame.tsx；content.module.css（仅相关控件/非阻断小修）。
- apps/web/demo/poc/domain/content-only.ts；api/scenario-source.ts（仅移除双重断言/修正输入边界与误导注释）；必要复用的同目录小型解析helper。
- apps/web/tests/poc-content-only.spec.ts；poc-content-delivery.spec.ts；tests/poc/content-only.test.ts。
- 新报告docs/reviews/FIX-NV-BATCH-01-DSH.md；新证据evidence/poc/fix-nv-batch-01/**。

禁止改公共Schema/类型生成产物/Tokens/DESIGN_SYSTEM/客户JSON/作者内容、依赖配置；不要绕过视频guard、覆盖旧报告证据或引入新页面状态机。若确实需API改动，先列具体原因供主控审查；按现有API即可修复两条主路径。

## Functional Specification

1. **R1交付**：保存邮件后，任一主题/正文/收件信息变更必须撤销可确认状态。成功/失败按钮都应阻止提交旧稿，清楚提示“先保存修改”。允许显式丢弃恢复已保存稿；不得静默自动丢掉用户输入。确认弹窗显示已保存revision的主题、收件人、正文摘要与附件，传给现有API相同draftRevision；有任何新编辑必须重新保存/确认。邮件预览、确认对象、attempt与导出ZIP一致。改成普通地址时不能靠原已存.invalid稿继续“成功”。
2. **R2丢弃**：统一当前脚本输入快照；Discard edits同步恢复画面和提交输入。丢弃后保存的新稿只能含恢复后的值，不能含已丢弃标题/镜头/字幕。检查Discard and leave后返回、脏稿切换版本的继续动作，明确保存/丢弃对象；不出现dirty=false但命令仍用旧ref。禁止用强制重载来掩盖状态错误。
3. **小范围类型清理**：去掉content-only.ts对realAssets的双重断言，用可证明的有效分支类型；source loader从unknown到ContentPackageInput必须有真实输入检查，不直接`as unknown as`。优先复用生成Schema/现有验证规则，或适当结构守卫；明确所做检查范围，不自称未做的完整验证。现有pending资产依然只允许video/poster，不把完整原包硬伪装有效。

## Visual / Data & API Contract

沿用HTML/DESIGN_SYSTEM、既有Dialog/Button/提示；脏稿状态可用一句提示，不新增技术面板。正常已保存路径保持一处主操作。冻结API/ContentDeliveryDraft/Attempt按CONTENT_ONLY_DELIVERY，不改签名或填虚假hash。attempt只读历史不改，编辑撤销待发确认。

主控非阻断备注可顺手改善：Logo约147CSS px以内、双产品分镜展示全部关联商品参考、AR字段dir/lang/Latin隔离、精简重复视频声明；这些不另设大规模视觉重做门槛。

## Acceptance Criteria / Tests

- 测试保存旧邮件→编辑主题/正文/收件人但未保存→不能确认；保存后弹窗/记录/解压ZIP均为新值与新地址；成功和失败模拟都覆盖。至少验证一次取消确认不产生attempt。
- 测试修改标题/一项镜头或字幕→Discard edits→保存→刷新→读取的值仍是丢弃后值；通过离开弹窗丢弃后返回也不会复活旧稿。
- 相关类型边界检查拒绝缺失实际Logo/非法pending资产；三套正常包仍能开始。不要扩展成防所有恶意输入的基础设施任务。
- 稳定截图：保存/未保存按钮状态与确认弹窗（1440）、必要一张1366；等待字体/动画稳定，避免滚动拼接或半透明转场截图被误判为视觉缺陷。

```powershell
npm run typecheck
npm run test:unit -- tests/poc/content-only.test.ts tests/poc/content-delivery.test.ts
npm run build
npm run test:e2e -- poc-content-only.spec.ts poc-content-delivery.spec.ts
```

浏览器证据必须写新FIX目录；可让测试截图目录使用环境变量或仅给新增用例新输出路径，保留原DSH/主控证据。主控recheck.cjs只供复现；修好后不能只以其exit0宣称通过，因为它打印观察值、故意不对已知错误抛断言。

## Expected Deliverables / Failure Conditions / Definition of Done

交付代码变更、抓住实际错误的必要回归测试、截图与解压ZIP核对结果、新报告（命令exitcode及NOT_RUN）。任一R1/R2仍复现、旧数据被覆盖、视频造假、未实际浏览器复查或把探针exit0当功能通过，都未完成。主控复查通过后才accepted；不自行改任务状态、不进入新任务。

## DeepSeek Execution Prompt

> 执行tasks/poc/fixes/FIX-NV-BATCH-01.md。主控已确认两条普通路径错误：邮件保存后再编辑仍能确认旧稿，确认框显示新地址但ZIP装旧地址；脚本Discard edits仅恢复state，Save却读旧ref，导致丢弃内容复活。仅按白名单修这两条并清理相关双重类型断言，补真实浏览器回归，保留作者内容/契约/Tokens/旧证据；不等视频、不做新架构、不扩大边缘测试。运行任务规定的类型/构建/相关内容测试，截图和ZIP证据写新FIX目录，提交docs/reviews/FIX-NV-BATCH-01-DSH.md供主控集中review；不自行accepted或启动下一任务。
