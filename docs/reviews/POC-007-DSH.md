# POC-007 交付报告：四步共享交互组件

- 任务：[tasks/poc/POC-007.md](../../tasks/poc/POC-007.md)；同批交付 POC-005；依据 [DEMO_DELIVERY_POLICY](../../docs/DEMO_DELIVERY_POLICY.md)。
- 执行模型：DeepSeek 4.1 Flash 1017（本会话执行者）。
- 状态：**review，未 accepted**；复用 TASK-007 已提交壳体，不等待独立壳体验收；未开发业务四步页面、未改 Tokens/DESIGN_SYSTEM/shell/design-lab/依赖/配置。
- 页面仅为中性技术预览，不调用业务 API、不写客户内容。

## 1. 交付内容

| 文件 | 内容 |
|---|---|
| [components/poc/Button.tsx](../../apps/web/components/poc/Button.tsx) | primary/secondary/ghost、default/primary/small、pending（保留内容宽度、aria-busy、防双击）、disabled、icon |
| [components/poc/FormFields.tsx](../../apps/web/components/poc/FormFields.tsx) | Input/Select/Textarea：label 在上、required、hint、inline error、aria-invalid/aria-describedby、disabled |
| [components/poc/Tabs.tsx](../../apps/web/components/poc/Tabs.tsx) | role=tablist/tab/tabpanel；Arrow/Home/End；单行可横滚 |
| [components/poc/Badge.tsx](../../apps/web/components/poc/Badge.tsx) | neutral/mock/success/error/info；圆点+文字，不只靠颜色 |
| [components/poc/Stepper.tsx](../../apps/web/components/poc/Stepper.tsx) | 四步完成/当前/未来状态、aria-current；手机内部横滚 |
| [components/poc/Overlay.tsx](../../apps/web/components/poc/Overlay.tsx) | Dialog/Drawer 共用 overlay：Portal、aria-modal、Escape、Tab/Shift+Tab focus trap、回焦、滚动锁、背景 inert |
| [components/poc/Toast.tsx](../../apps/web/components/poc/Toast.tsx) | role=status、最多3条、可关闭、error 持续 |
| [components/poc/StateBlock.tsx](../../apps/web/components/poc/StateBlock.tsx) | Empty/Error/Loading skeleton、原因+一个行动、aria-live/aria-busy |
| [components/poc/ReplayControls.tsx](../../apps/web/components/poc/ReplayControls.tsx) | 共享 Play/Pause/Step/1×2×4×/seek/restart，用于后续页面接线 |
| [components/poc/poc.module.css](../../apps/web/components/poc/poc.module.css) | 只消费 design/tokens.css；桌面/1366/390 适配 |
| [app/poc-components/page.tsx](../../apps/web/app/poc-components/page.tsx) + [components-demo.tsx](../../apps/web/app/poc-components/components-demo.tsx) + [page.module.css](../../apps/web/app/poc-components/page.module.css) | `/poc-components` 内部预览页：控件、字段、tabs、stepper、replay、dialog/drawer/toast/empty/error、AR 样例 |
| [tests/poc-components.spec.ts](../../apps/web/tests/poc-components.spec.ts) | 8 项浏览器交互/尺寸/无障碍/截图测试 |

## 2. 实际验证

- `npm run typecheck`：exit **0**
- `npm run build`：exit **0**（`/poc-components` 静态路由生成）
- `npm run test:e2e -- theme.spec.ts shell.spec.ts poc-components.spec.ts`：**24 passed**（8 新增 + 16 既有 theme/shell），exit **0**
- 真机 Chromium `156.0.8078.4`，1440/1366/1920/390 四尺寸截图实际打开查看；Dialog/Drawer 打开截图查看；AR 样例、loading/empty/error、dialog close focus ring 均已查看。
- 无 console error、无外部请求；所有尺寸无 document 横向溢出。

证据目录：[evidence/poc/components/](../../evidence/poc/components/)；入口（生产 start / dev）：`http://127.0.0.1:3100/poc-components` 或 `http://127.0.0.1:3000/poc-components`。

## 3. 视觉与交互检查摘要

- 1440/1366/1920：shell 内容容器、卡片 r12、hairline、暖白底与金色强调一致；侧栏/头部沿用 TASK-007。
- 390：字段、按钮、tabs、empty/error 单列；stepper/replay 内部横滚，document 无横溢；Drawer 全宽。
- Dialog：560px 浅底表单，打开聚焦关闭按钮（金色 focus ring），背景 inert/滚动锁，Escape 关闭并回焦触发器；Tab 循环留在 panel。
- Drawer：桌面 480px、390 全宽；loading skeleton 保持布局；Escape/回焦/滚动锁同 Dialog。
- 状态不只靠颜色：Badge 有文字+圆点；Stepper 有数字/对勾/aria-current；pending 有 aria-busy；toast 有 role=status。
- EN/AR：AR 区块 `lang=ar dir=rtl`、16/1.8、零 tracking；`bdi` 保持技术 ID LTR。未把局部样例冒充完整阿语页面。

## 4. 关键指纹

| 文件 | Bytes | SHA-256 |
|---|---:|---|
| `components/poc/poc.module.css` | 16,306 | `c62a6c4ff4a395b6bfc7b0fd8925e12978c9964eff4a2dbc2112e8f82dcce546` |
| `components/poc/Overlay.tsx` | 4,593 | `22376bf25fba30cafbdba045b90f7a06f81529658e5f1fc4d30638b77fd539b8` |
| `components/poc/FormFields.tsx` | 3,977 | `7e0f306b516f28204f5a0f351351bc89aedffac50ca6fdbd170d058149250cd3` |
| `components/poc/Button.tsx` | 1,222 | `07cb0fd011031aa24aa4cbb87c8a8a52316b45dd9dfba48c2bf2571a2c649b60` |
| `app/poc-components/components-demo.tsx` | 13,337 | `2b4c529fb8f23f6915538f0da1eb2778d47496b3bb6639bee1ddfeba302b4a00` |
| `app/poc-components/page.tsx` | 1,527 | `488c4e37d819a9cfe805b7e46477ffa17453ca8ee885a5575ae929e90e02544e` |
| `tests/poc-components.spec.ts` | 8,958 | `8731f844723230424213c3765c76a6b1f7004e7f056b8aa57f42cbb9005043a5` |

## 5. NOT_RUN / 已知限制

- 未做完整组件库、完整 a11y 状态矩阵/所有浏览器；只验证核心 8 项与 4 尺寸。
- TASK-007 壳体仍待主控集中复核；本报告不声称壳体或视觉已 accepted。
- 未接业务 API/四步页面；POC-006/008 后续集中接线。
- 无客户场景/媒体；页面中所有文案为中性技术示例，不冒充客户内容。
- 未宣称 M1 视觉通过；桌面为主，其他尺寸按实际查看补查。
- 未自行 accepted，未启动下一任务。
