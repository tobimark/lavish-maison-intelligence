> 2026-11-05素材范围更新：用户已提供SERENITY Hero/白底原图/10.08秒MP4，并确认以SERENITY统一A案例、另补相符脚本。以docs/PRODUCT_RESCUE_ASSET_INTEGRATION.md和FAST_06为最新增量；本轮不制作视频，但允许真实提供素材预览/下载。冻结15秒核心Schema保持，Provided片走独立sidecar/API，不伪称匹配成片。

# 六工作区页面规格 · Interactive Mock Product

2026-11-05主控。必读INTERACTIVE_MOCK_PRODUCT、INTERACTIVE_PRODUCT_API、DESIGN_SYSTEM与HTML标杆。下面布局是明确实现目标，不宣称已渲染/通过。

## 全局

1440×900为基准，1366×768保持主体空间；沿用暖白、黑侧栏、金色点缀、正文16/辅助14与本地字体，不改Tokens。Header轻量品牌与当前位置，永久单一`Demo · Mock data`；在信号/交付上下文补必要说明，删大段重复技术说明。新手首屏不放sessionId、schemaVersion、revision/hash/raw事件type、数据库/无renderer解释。

六个导航全部可点击/高亮，面包屑可返回真实列表。全站共享Button/Tabs/Drawer/Dialog/Toast与脏稿离开保护。隐藏开发用Layout preview。Loading有稳定骨架，读取失败有实际Retry，筛选无结果有Clear filters；无效对象显示返回列表，不擅自切A。按钮pending禁重复命令，禁用是具体guard且带恢复提示，不能以Soon当实现。

## Overview `/`

首屏：`Marketing opportunities for Lavish`，副文`Explore market themes, review campaign ideas, and export bilingual content.` 主CTA`Explore opportunities`到/opportunities，次Link`Browse creative work`到/atelier。Mock标签小且清楚。

主体以三个机会为大内容块，卡片含业务标题、推荐产品真图、1句Brief目标/推荐摘要、地区、`View opportunity`。不要三行技术场景ID/版本选择器，也不要虚构ROI卡。下方Prepared creative work为真实Campaign/EN-AR结果入口，Recent downloads仅真实export记录，空态用`Your downloads will appear here`不伪造历史。

首屏需看到用途、至少一条机会的实质与主入口；Sidebar的Radar/Atelier直接访问始终有效。卡片和内部CTA避免相互嵌套button产生双触发。业务卡点击读详情，不createSession。

## Intelligence Radar `/radar`

标题`Intelligence Radar`，副文`Explore fragrance signals and the opportunities they inspire.` 顶部紧凑来源chips/下拉（All+实际四来源）、Topic、Campaign、可清除筛选。信息主体约2/3信号列表+1/3选中主题趋势/对应洞察，事件轨迹不常驻挤压。初次就有15信号，无Run prerequisite。

信号卡显示平台、话题、人可读摘要、区域、`View evidence`；打开单一Drawer展示完整信号、模拟来源、证据、关联趋势和`View related opportunity`。明确`Simulated evidence`，不画假真人帖子/伪链接。多证据能逐条查看，不固定只取evidenceIds[0]。

趋势有时间范围、单位`Illustrative interest index`，0–100共同纵轴；稳定对照不要各自min-max拉伸成剧烈波动。不显示真实涨幅/采集数或预测收益。洞察直接读analysis并指向机会，不能只给折线没有结论。

`Agent activity`打开二级抽屉/面板：默认是可读事件摘要，分Preset demo与Your actions。可选Play/Pause/Step/1×/2×/4×/Seek/Restart，明确Demo replay且只发现/分析前缀；活动不阻断浏览，关闭回到原筛选/信号。回放游标不影响此工作区已准备内容的可见性或工作稿。

## Opportunities `/opportunities`与详情

列表恰为三个主要营销机会，以原analysis+brief关联为数据；显示主题、适用市场/人群、匹配产品、1句推荐，不发明机会分数。`View strategy`进入真实详情路由。

详情首屏“机会是什么”“为什么适合Lavish”“建议下一行动”；用分析的recommendation/rationale作为主内容。按需展开Supporting evidence、Assumptions & uncertainties；正常页可见主要insights，而不是全部藏入回放。产品事实与营销假设不同标签，不将合成指数包装成真实热点。

Campaign Brief包含目标、市场/受众、产品、主题/语气、渠道/语言、关键消息/CTA；默认结构化阅读不塞大表单。主CTA`Open campaign`到/atelier?campaignId=准确briefId；关联证据链接回Radar带signalId；用户可随时点Sidebar离开。无Create Campaign强制动作，三Campaign已预置。

## Creative Atelier `/atelier`

首屏有真实Campaign选择器（3项）、Brief/Copy/Storyboard tab及EN/AR切换。无query可默认A阅读，切换B/C完整换内容。标题为Campaign名和`Campaign workspace`，不会话标识。用户未执行任何Discovery也能看完整内容。

默认Campaign结果：结构化Brief+产品图、推荐理由摘要、双语可读文案预览。Copy tab按标题/Hook/Caption/CTA/Hashtags及四镜头阅读卡组织；Storyboard用真实关联产品图、时码/画面文字，双产品镜头展示全部相关产品而非只取首张，Logo完整小尺寸（建议≤147CSS px）、无拉伸。小标`Static storyboard · Video deferred`，不做播放器/进度条/MP4下载。

版本选择默认只预览（Preset EN/AR及Saved versions），不选工作稿、不撤销确认。清楚显示Preset/Saved、Unconfirmed/Confirmed、已有导出记录。所有短文案取真实版本；AR内容区dir=rtl/lang=ar，Latin品牌名/ID隔离；编辑器字段语言也正确。

主CTA`Edit script`按需打开编辑Drawer或独立编辑区，内部复用ContentOnlyFrame已修复的编辑/Save/Discard/Confirm逻辑；不把整个ContentOnlyFrame四步壳体原封嵌回新页面。默认只开放营销人员常改的标题/Hook/Message/Caption/CTA，镜头/字幕时码折叠为Advanced。不默认展示Asset IDs/raw字幕ID。语言/版本切换脏稿有Save/Discard/Cancel，导航同样保护。

Save new version产生不可变派生稿并跨页刷新；Confirm script是显式本地确认，不声称Lavish正式审批。导出当前保存/预置版本到Deliverables或直接调用普通导出，无模拟邮件前置。若有未保存改动，清楚要求保存，不静默导出旧稿。预览别版本不应替换工作稿。

## Creative Library `/library`

集中浏览三Campaign的EN/AR脚本与静态分镜、真实保存版本。Campaign/Language/Type(Script/Storyboard)/Origin(Preset/Saved)筛选组合有效并反映URL；空结果可清除，不添加无数据占位分类如视频/AI图。

内容卡/行显示Campaign、语言、标题、类型、来源/确认状态、真实缩略图或文本摘录；不是满屏内部ID。点击Preview开可读Drawer；Open in Atelier带campaign/version/session精确引用；Export content pack生成该版本真实包。无需先进入/运行Scenario。Library只读筛选/预览不创建工作稿，新增保存版本来自同一API立即可见。

## Deliverables `/deliverables`

标题`Deliverables`，副文`Download campaign briefs, scripts, subtitles and static storyboards.` 默认看到三Campaign的可交付内容（EN/AR均可选），可筛Campaign/语言。选择一个版本后显示包含内容的可读清单、Preset/Saved与Draft/Confirmed标记。

主CTA`Download content pack`直接导出ZIP；不先Run或模拟邮件，不为了下载把未确认稿伪造为已确认。成功提示`Download started`，记录版本、时间、真实文件名；内部hash放Details，不作主界面。Recent exports可查看原版本详情/重新下载原字节。异常无下载成功toast，有Retry；准备记录与下载已触发状态诚实区分。

次级`Simulate email delivery`抽屉复用旧邮件/确认/attempt。未确认版本给`Confirm this script to simulate delivery`及真实确认入口；普通下载依然可用。邮件编辑先保存，dirty时成功/失败模拟都禁用并说明；确认框完整绑定保存revision，回执只称Simulated。失败测试开关/按钮置次级演示菜单，不和主导出争抢注意力。普通export记录与邮件attempt分区，不互相冒充。

## 实际验收视点

主控先看Overview/Radar/机会/Atelier预览首屏截图，能否用一句话说出用途、机会、理由、结果与下一操作；不能以统一颜色或表单能保存代替通过。再完整点六页/筛选/详情/编辑/版本/确认/导出/活动，核对跨页同一对象。新手无说明走Radar→机会→Campaign→改AR→保存确认→Library找到→Deliverables导出→返回Radar；期间无Scenario启动要求。
