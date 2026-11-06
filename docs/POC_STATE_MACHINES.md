> 2026-11-05最高优先级更新：当前以 docs/INTERACTIVE_MOCK_PRODUCT.md、docs/INTERACTIVE_PRODUCT_API.md、docs/pages/INTERACTIVE_WORKSPACES.md 和 tasks/DSH_HANDOFF_DEMO_FAST_05.md 为准。六工作区可自由探索，Scenario只作数据容器；只读浏览无阶段前置。旧固定四步/唯一Home可用/导出依赖模拟邮件的要求不再用于开发。冻结场景Schema/业务JSON/Tokens不改，视频仍deferred。

> 2026-11-05范围更新：用户暂缓视频制作；当前以 docs/CONTENT_ONLY_DELIVERY.md 和 tasks/DSH_HANDOFF_DEMO_FAST_04.md 为准，视频缺失不阻塞非视频开发。旧完整视频要求保留作未来范围，不将文案Demo标为完整视频验收通过。

# 四阶段状态机与版本失效规则

阶段枚举共享：`locked | ready | running | awaiting_confirmation | completed | failed | stale`。video对用户展示的“Ready”对应阶段 completed，媒体自身 readiness 则为 available/unavailable；delivery的“Simulated delivered”对应 completed+回执 outcome=simulated_delivered。

初始 workflow：discovery ready，analysis/video/delivery locked。replay transport 独立状态 `idle | playing | paused | ended | error`，不会改变 workflow。Session状态由四步推导，不再维护另一个可矛盾的总状态。

| 命令/事件 | 允许起点 → 终点 | guard / 副作用 |
|---|---|---|
| executeStage(discovery) | ready → running | 场景ready；开始消费采集事件 |
| discovery completed | running → completed | 必需信号/趋势已展示；analysis locked→ready |
| executeStage(analysis) | ready → running | discovery completed；展示分析/Brief/script |
| script presented | running → awaiting_confirmation | 当前有效脚本存在；不可自动确认 |
| confirmScript | awaiting_confirmation/stale → completed | 当前脚本结构有效；video若有对应预置成片则ready，否则stale（说明缺成片） |
| executeStage(video) | ready → running | analysis completed；scriptId=video.scriptVersionId；全部关联文件校验通过 |
| video completed | running → completed | video.available且本机实际可播放；delivery locked/stale→ready；无真实渲染 |
| saveDeliveryDraft | ready/awaiting_confirmation/failed → awaiting_confirmation | 当前成片有效；草稿完整；编辑后撤销旧确认 |
| simulateDelivery | awaiting_confirmation → running | 人工确认精确稿件revision/video/script；地址 .invalid，附件齐；不得靠播放按钮发起 |
| delivery simulated success | running → completed | 新attempt写 outcome=simulated_delivered、mode=mock；仅本地存储 |
| 运行失败 | running → failed | 保存原因、attempt、可恢复信息；后继阶段继续locked/stale |
| retryStage | failed → running | 同输入依然有效；失败未结束不允许并行重试；新attempt且保留旧记录 |
| saveScriptDraft / selectScript | analysis awaiting_confirmation/completed/stale → awaiting_confirmation | 新/切换脚本；video、delivery→stale；清当前video指针与交付确认，历史结果保留只读 |
| resetSession | 任一 → 初始workflow | 只清此session派生数据、游标/草稿；留下reset审计，不清其他会话与壳体偏好 |

所有 running 阶段禁止修改输入版本、reset需先显式取消演示执行；v1取消可在 reset 确认内部原子完成并记录 canceled（ActionRecord outcome，不加入阶段枚举）。恢复会话时running的本地计时任务转paused transport，阶段保留running，用户继续时从已保存游标消费，不能重发。

## 版本与媒体匹配

保存脚本产生新ID，即使视觉文字只变一字也不能继续把旧 MP4 作为该稿成片。UI：展示“此稿暂无对应预置视频”，保留原视频只读历史预览；明确“选择预置脚本版本继续”后再确认、重走视频演示。禁止静默还原用户修改。

已交付记录不可改；切换版本后仍可在历史查看旧脚本、旧附件快照与 Simulated 标记。新发送文案只创建新 deliveryDraft，已交付 attempt不可覆盖。重复点击用幂等 key 去重；用户明确“再次模拟交付”创建新的草稿/attempt并保留历史。

Replay采用相同状态枚举，允许以包内 script.confirmed 和 delivery.queued 模拟用户决策；这些合成决策只能影响 replay projection。媒体运行故障属于当前环境的 UI overlay，不得篡改确定性回放状态，但会阻止下载与操作模式推进。

不可跳过：analysis未确认→video；video脚本不匹配→delivery；媒体404→completed；replay seek→用户交付记录；事件进度100%→实际视频已生成。每条 guard 都有对应负向单测和 UI 提示。
