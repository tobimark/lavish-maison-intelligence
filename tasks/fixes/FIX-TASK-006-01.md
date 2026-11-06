> CLOSED：2026-11-04主控独立复查通过，见 docs/reviews/TASK-006-ACCEPTANCE.md。下文保留修复原始规格。

# FIX-TASK-006-01 · AR整页排版与Token导入

### Goal
补齐TASK-006的双语排版，按主控已验证的方向采用标准Token引入；不扩大为新阶段开发。

### Dependencies / Context
TASK-006交付已完成主控审查，当前changes_requested。先读：

- `docs/reviews/TASK-006-MAIN.md`
- `docs/FRONTEND_DEMO_SCOPE.md`
- `docs/DESIGN_SYSTEM.md`、`design/tokens.css`（只读）
- `evidence/reviews/TASK-006/browser-probe.json`
- `tasks/DSH_HANDOFF_M1_01.md`

### Allowed Files

- `apps/web/styles/globals.css`
- `apps/web/styles/design-lab.module.css`
- `apps/web/app/layout.tsx`
- `apps/web/app/design-lab/design-lab-page.tsx`：仅语言样例元信息/Token加载说明与必要lang/bdi标记。
- `apps/web/tests/theme.spec.ts`
- `docs/reviews/TASK-006-DSH.md`
- `evidence/m1/theme/**`

不改Token、Next配置、tsconfig、依赖版本、业务页面或门禁；不建立packages/tokens。

### Functional / Visual Requirements

1. AR状态下所有真正阿文标题、区域标题、普通标签、正文保持零字距。正文与长说明使用1.8行高；标题保留独立标题行高，不要求全部改为1.8。
2. 保留EN排版规则；显式英文片段、SKU、Token名称与bdi方向正确，不粗暴对所有后代设RTL/阿文字体。按实际渲染修正CSS层叠覆盖。
3. AR下字号样例的元信息反映真实语言规则：不能仍显示`.16em`/`-.04em`是阿文实际字距，或把1.6当作阿文正文行高。
4. 从 `apps/web/app/layout.tsx` 使用 `import '../../../design/tokens.css'`，保留globals一次加载。实际build通过后删除loadDesignTokens、fs/path读取、turbopackIgnore与style内联。
5. 更新页面footer和报告，避免残留“Token由layout原样内联”的旧说明。Token源仍只有根文件。
6. 在dev中核验根CSS变化可被观察到。只在隔离副本或临时可恢复环境做实验，不提交Token改动；报告准确记录是否需刷新/重启。生产修改要求重建，不能声称刷新静态成品会重读源文件。

### Data / API Contract
无业务API，无后端；沿用静态示例与本地状态。

### Acceptance Criteria / Tests

```powershell
npm run typecheck
npm run build
npm run test:e2e -- theme.spec.ts
```

新增或扩展有意义的断言：**切换AR之后**读取h1、区域标题、type-sample-0/2/5、内容正文的computed styles。字距为normal/0，正文16px/28.8px；再切EN确认原排版正常。不能只测专用arabic-sample块。

保留字体离线、四尺寸双语无溢出、真实控件、焦点与Reduced Motion检查。重拍8张双语/尺寸截图及焦点图并实际查看。若正确CSS路径在原应用仍失败，报告精确路径/错误/复现，等待主控决定，不恢复为未经说明的新变通架构。

### Expected Deliverables / Definition of Done
修复代码、实际命令与exit code、新截图、交付报告中逐项回应主控发现。状态提交review，主控复查后才能accepted。不要开始TASK-007、不要自动改任务状态。

### Copyable DSH Prompt
请执行 `tasks/fixes/FIX-TASK-006-01.md`。这是TASK-006主控复核后的限定修复：修复AR整页子元素覆盖导致的非零字距与正文1.6行高；在真实layout使用正确根路径标准导入Token，并删除fs内联变通及旧说明；补整页AR的computed-style断言、重跑三条命令并重拍截图。严格按Allowed Files，不改全局Token/配置/依赖、不建设新workspace、不开发下一页。完成后交主控review。
