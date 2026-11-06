# TASK-006 修复复查与验收

日期：2026-11-04（Asia/Shanghai）。审查者：主控工程 Agent。

结论：**TASK-006 accepted；FIX-TASK-006-01 closed；允许启动TASK-007。** 此结论仅覆盖主题、字体与design-lab，不代表M1核心工作空间视觉门禁通过。

## 实际验证

| 验证 | 结果 |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0，原应用Token标准导入成功，路由静态生成 |
| `npm run test:e2e -- theme.spec.ts` | exit 0，8 passed，26.2s；包含新增整页AR/EN排版回归 |
| 主控独立生产页面探针 | 无pageerror/请求失败；说明展开/收起正常；移动390px无横溢 |
| 根Token文件指纹 | 仍为07f8b08de74dde44ecdb6dad8b0d107233f394085d7aed3405b619aad5c01814，未改全局设计值 |
| 视觉查看 | 已打开新1440 AR、390 AR、1366 EN与焦点截图；与原参考及此前主题基线对照，未见新增阻断问题 |

生产构建与浏览器检查在授权的沙箱外运行，避免已知Windows沙箱路径/本地套接字限制。主控探针已关闭自己启动的服务。

## 已关闭问题

1. AR真实页面h1、区域标题、字号样例与短标签，computed letter-spacing均为normal/0；移动标题同样归零。
2. AR页面说明、内容正文与正文样例，computed font-size=16px、line-height=28.8px；标题仍保留1.22/1.35行高。
3. EN标题-1.16px字距、标签1.92px字距、正文25.6px行高保持；显式英文产品名和SKU未被改写或倒序。
4. `layout.tsx`使用 `import '../../../design/tokens.css'`；无fs读取与design-tokens内联节点，页面实际计算画布为#f6f5f2。没有新增Token workspace或修改Next/TS配置。
5. AR字号元信息与页面footer同步更新；测试覆盖整页AR切换与切回EN，不再只检查专用阿文样例块。

实测AR标题使用自托管Noto Sans Arabic，已通过CDP确认。详细计算值、当前源文件指纹与主控截图见 `evidence/reviews/TASK-006/recheck/browser-probe.json`。

## 保留限制

- dev修改根Token可能需要刷新，生产成品需要重建。已查看DSH的可恢复实验记录；主控未再次改写根Token重复实验，不声称独立重测HMR。
- AR文案仍是内部布局样例，保留待本地化审查。
- Axe、200%缩放、Firefox/WebKit和真实屏幕阅读器未追加执行，不报告通过；后续依原门禁安排。
- 原下游提交证据已归档在 `evidence/reviews/TASK-006/recheck/submitted/`；本轮e2e重新生成主证据目录。主控没有修改产品实现代码。

## 下一任务放行范围

仅放行TASK-007统一壳体、导航响应与正式Logo接入；完成后仍提交主控review。TASK-007不得扩展为Home/Radar/Atelier业务开发，不能擅自更改已验收主题或全局Tokens。
