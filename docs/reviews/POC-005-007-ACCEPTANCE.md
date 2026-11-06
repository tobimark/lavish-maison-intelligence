# POC-005 + POC-007 集中复查 · accepted

2026-11-04，按Demo快速交付规则：**POC-005、POC-007 accepted**，不新增阻断修复。

## 主控实际验证

| 检查 | 结果 |
|---|---|
| npm run typecheck | exit0 |
| npm run test:unit -- tests/poc/replay.test.ts tests/poc/mock-api.test.ts tests/poc/storage.test.ts tests/poc/validation.test.ts | exit0，64 passed（22.12s） |
| npm run build | exit0，/poc-components实际构建 |
| npm run test:e2e -- poc-components.spec.ts | exit0，8 passed（15.9s），实际生产模式网页 |

回放关键路径、checkpoint/CLI接线、会话隔离与API回归通过。组件浏览器检查涵盖按钮pending、字段、tabs、四步指示、回放控件、Dialog/Drawer焦点/关闭/回焦、toast及AR局部样例。

主控实际打开并查看本轮重拍1440/1366页面、1440Dialog/Drawer及390Drawer截图，并与HTML标杆1440截图对照：暖白主区、黑侧栏、金色强调、正文可读性、留白和控件一致性可接受，未发现影响当前预览操作的阻断问题。原下游截图已先存至evidence/poc/reviews/POC-005-007/submitted/，本轮重拍仍在evidence/poc/components/；文件指纹在本次source-hashes.json。

## 验收边界与下一批接线备注

- 通过的是回放基础与共享控件，不是客户四步业务主链或M1总视觉门禁。
- /poc-components是中性技术页，其本地回放示意并未连接MockApi；下一批业务页必须接入POC-005真实事件投影与时钟，不能沿用组件页的固定interval示意。倍速应实际影响时间映射；暂停后停止驱动时钟，到末尾显示结束。这些随业务页接线验证，不另开基础设施FIX。
- validator的L3实际投影需要显式--replay；已同步场景接收任务命令。客户场景/媒体未到，不能宣称其L3/L5通过。
- 壳体已随组件页接受本轮桌面可用性检查；原TASK-007独立全项审查未补做，不将其历史状态伪写accepted，也不阻止继续使用。
- 没有新增全浏览器、全状态无障碍或边缘事件审计；普通微调留到真实业务页集中处理。

放行下一批POC-008首页/四步页面框架；POC-006内容接收随A包到齐接入。三场景仍awaiting_content，框架页面必须诚实显示缺项，禁止用TEST_ONLY包填客户页面。
