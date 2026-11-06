> 当前四阶段页面规格为 [POC_WORKFLOW.md](POC_WORKFLOW.md)。下文旧业务布局仅供历史参考，不按其生成独立页面。视觉系统仍沿用HTML标杆。

# Intelligence Radar 页面规格

引用 ../DESIGN_SYSTEM.md、../UX_SPEC.md、../REPLAY_ENGINE.md。路由 `/radar`。核心工作：识别一条值得行动的机会并追溯证据。

## 桌面构图

统一暖白壳体。顶部页标题29、副标题16；右侧场景选择、地区选择（UAE/Dubai/Abu Dhabi/GCC）、“Run demo”主按钮。模式条明确 Autonomous Demo Feed / Presentation Replay，两者不能同时影响当前数据投影。

标题下只有一行文字状态“Scenario A · DEMO · last event …”，不设四张 KPI。主区1.55:1、gap18：左侧趋势图与热点列表为同一业务区域，趋势图高260–320、最多3条有意义序列；右侧仅机会摘要（标题、价值主张、统一评分、匹配商品、2条风险、证据数量、View opportunity）。事件回放为主区下方横向条，收起时64高、展开时最多240高，不围住主内容。

1440左栏约698/右448；1366使用相同比例并自然增高。≤1170辅助改下方；≤880筛选换两行、趋势图完整320宽、回放控件换两行。图表SVG布局响应尺寸，文字不随 viewBox 被压小。

## 交互与状态

- 点击热点选中，趋势、机会、证据同步基于同一trendId；筛选有加载、空结果、重试，无结果时不保留前一个机会评分。
- 评分显示“Demo opportunity score 78/100”并展开权重/缺失项/解释，不把合成分数当真实市场概率。
- “View opportunity”M1打开480px抽屉，M3支持独立详情路由。抽屉依次：机会概要、评分明细、商品、方向、风险、Evidence 列表；底部“Create Campaign”。证据项含出处、DEMO/IMPORTED/LIVE、时间、摘录、关联理由；模拟证据不得伪装真实帖子链接。
- 回放控件：Play/Pause、Step、1×/2×/4×、slider、Restart、事件列表；seek后所有可视对象重建；paused保持时间；刷新恢复；事件详情可查看输入输出摘要。M1只有限固定事件本地预览，明确“Prototype replay”，不宣称后台已运行。
- Create Campaign：显示交接摘要确认；M1写本地模拟状态并前往Atelier，M3调用幂等API。重复点击不能创建两个项目。
- Feed与Replay切换有清楚说明，暂停Replay不停止Feed；错误/无数据保持操作可恢复。

## 视觉验收

趋势/热点业务区是首要视觉主体；无连续KPI卡。标题29、正文16、证据14以上；黑侧栏+暖白内容+金曲线与参考一致。抽屉使用共享组件、一次一个、焦点可恢复；图表键盘读数可用。截图必须包含默认、选中机会、证据抽屉、loading/empty/error、展开回放、1366与390。M1通过范围不含真正Runtime或机会算法完成。
