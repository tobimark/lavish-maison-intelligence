> 历史首次审查。修复后已于2026-11-04 accepted，最新结论见 [TASK-006-ACCEPTANCE.md](TASK-006-ACCEPTANCE.md)。下文保留原发现与证据。

# TASK-006 主控独立审查

结论：**changes_requested**。颜色、字号层级、字体本地化、布局、交互与证据准备总体符合本任务；AR整页排版规则仍有P2问题，修复复核前不进入TASK-007。M1总门禁未通过。

## 独立验证

- `npm run typecheck`：exit 0。
- `npm run build`：exit 0，Next 16.4.4生产构建成功。
- `npm run test:e2e -- theme.spec.ts`：exit 0，7 passed / 21.7s；重新取得8组双语/尺寸与焦点图。原提交图已保存在 `evidence/reviews/TASK-006/submitted/`。
- 主控另外启动生产网页，在Chromium 156.0.8078.4操作EN/AR切换、说明展开/收起，读取真实计算样式和字体，并保存、实际查看独立桌面与移动截图。
- Noto Sans Arabic标题字体通过CDP确认是自托管自定义字体；不是只靠font-family声明推断。390px document宽度390，无横溢；无pageerror或失败请求。
- 当前内联Token与根源文件逐字相同。没有修改产品源代码，也没有代替DSH修复问题。
- 主控运行规划结构自检时发现检查脚本把有效目录链接误报成缺文件，已修复其链接检查，并允许门禁处于in_progress而非只认not_started；重跑通过。此为主控验证工具修正，不计入DSH交付缺陷。

证据：`evidence/reviews/TASK-006/browser-probe.json`，`review-1440-en.png`、`review-1440-ar.png`、`review-390-ar.png`。探针已经关闭自己启动的服务。

## P2：整页AR样式没有完整覆盖

位置：`apps/web/styles/globals.css`的181–185行仅给带lang/dir的祖先设置字距和行高；`apps/web/styles/design-lab.module.css`的title、sampleTitle、sampleLabel、sampleBody、contentBody等子元素又显式覆盖它。

| AR实际元素 | 实测 | 规范期望 |
|---|---|---|
| 页面标题与type-sample-0 | letter-spacing -1.16px（手机-1px） | normal/0 |
| 区域标题 | letter-spacing -0.216px | normal/0 |
| type-sample-5阿文短标签 | letter-spacing 1.92px | normal/0 |
| 页面说明、内容正文、type-sample-2 | 16px / 25.6px，即1.6 | 16px / 28.8px，即1.8 |

专门的arabic-sample块正确，但不能代表AR整页正确。现有测试只检查该块，因此7 passed不构成此要求已满足的证据。修复应覆盖真正阿语标题、正文、标签，并保持显式英文/bdi技术串的字体和方向；不要用无差别全后代覆盖把英文例外也清掉。

## 主控对所提事项的裁决

1. **Token加载**：根文件仍是唯一源，这一点认可；不建立packages/tokens，也不需要先扩大Next/TS配置范围。主控在隔离目录、同版本Next、相同turbopack.root下，标准导入根CSS构建成功。当前真实layout位于apps/web/app，正确路径是 `../../../design/tokens.css`；`../../design/tokens.css`指向apps/design，不是根design。DSH应在原应用尝试正确路径并实际构建，不再概括为Next拒绝所有工作区外导入。通过后移除fs内联与turbopackIgnore，并修订文案/报告。若原应用仍失败，提交精确导入路径和完整错误，不复制Token、不建新workspace。
2. **HMR说明**：当前Token读取在模块顶层，且生产路由已静态生成；不能保证只刷新浏览器就会读取最新源文件。修复后验证dev实际更新；生产修改仍需重新build，这是正常行为。
3. **e2e启动**：新机安装浏览器、先build再跑生产模式e2e可接受，无需为此建立CI。本次主控已独立复跑。
4. **阿文文案**：作为内部布局样例可保留待本地化审查；此事项不替代CSS排版修复。
5. **Logo**：TASK-006未展示不是缺陷；授权TASK-007向 `apps/web/public/brand/` 原样复制已登记Logo并核对sha256。不得重绘、滤镜、裁切或拉伸。
6. **NOT_RUN**：如实保留；Axe、Firefox/WebKit与真实屏幕阅读器不追加为本轮阻塞。200%缩放保留到TASK-014。主控也未把这些说成通过。
7. **下游独立复核**：可作辅助证据；主控以本次实际代码与浏览器结果裁决，不采用下游PASS替代验收。

## 修复与下一步

执行 `tasks/fixes/FIX-TASK-006-01.md`，仅修AR覆盖、Token标准导入与对应验证/文案。修复后DSH提交review，由主控打开新截图复核。TASK-007和TASK-008依赖本任务accepted，目前仍不启动。
