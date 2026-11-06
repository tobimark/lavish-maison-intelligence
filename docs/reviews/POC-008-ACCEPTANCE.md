# POC-008 主控验收 · 首页与空态框架 accepted

2026-11-05，按Demo快速交付规则。**本次交付范围accepted，无阻断修复**：首页、四步布局预览、缺内容/禁用/未知会话状态及已启用的导航和抽屉交互。A真实内容和媒体尚未接入，不代表A主链完成、POC-006通过或M1总视觉通过。

## 主控实际验证

| 检查 | 结果 |
|---|---|
| npm run typecheck | exit0 |
| npm run build | exit0，首页、preview、session路由构建成功 |
| npm run test:e2e -- poc-prototype.spec.ts poc-components.spec.ts | 实际Next生产模式，exit0，18 passed（30.7s）；10项当前框架+8项共享组件回归 |

实际网页验证：三套场景显示awaiting_content、Start不可用；Layout preview不创建会话；四步切换更新URL；Brief/Script、EN/AR布局入口、预览证据抽屉、Escape/回焦与未知会话错误正常；已启用操作没有阻断。测试同时检查四尺寸无document横溢及无外部请求。

主控实际打开查看首页1440/1366、分析1440/1366、视频1440和证据抽屉截图，暖白/黑侧栏/金色、排版字号、留白和共享控件与已通过设计基准一致。复查截图位于evidence/poc/prototype；下游原截图先归档于evidence/poc/reviews/POC-008/submitted，未丢弃原始证据。source-hashes.json保存本轮代码指纹。

## 内容接入时一起处理，不阻断本次框架

- 场景source目前没有loadPackage，不能启动真实会话；A到齐后补完整静态包loader和媒体引用，不只把catalog改ready。
- browser-api当前virtualNow使用Date.now。真实交付排期应接会话相对虚拟clock，避免把Unix时间当作scenario atMs让所有排期立即到期；随A主链接线验证，不为当前无会话预览另开FIX。
- 当前Stage context/Truthfulness/缺项说明适用于布局预览；有业务内容后收敛重复解释，让证据、脚本和视频成为主画面，永久Mock标记保留。
- 真实会话Continue/Export/Reset、回放播放/暂停/倍速/seek/末尾/刷新、实际视频及模拟交付仍待A包后在浏览器集中验证，不能用18项框架测试代替。

下一批是POC-006内容接收 + 已有框架的数据/媒体接线；内容未到保持awaiting_content，不继续扩张基础工具或填技术夹具。交接见tasks/DSH_HANDOFF_DEMO_FAST_03.md。
