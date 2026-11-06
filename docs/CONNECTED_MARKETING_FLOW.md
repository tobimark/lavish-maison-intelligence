# Lavish · 连贯营销案例与模拟社媒发布

2026-11-05，用户最新产品裁决。本文覆盖旧方案中以素材浏览、下载或模拟邮件作为主链终点的要求；复用FAST_06工程，属于当前POC收敛，不新建后端、不制作新视频。

## 产品主线

普通营销人员需要看懂一个完整案例：**发现值得关注的话题 → 判断Lavish可以怎样参与 → 用产品原图形成广告创意与视频 → 将视频和发布文案组合成社媒帖子，审阅并模拟发布。**

之前六工作区解决了可访问性，三素材排序解决了局部展示，仍缺跨环节的因果解释、统一案例上下文及社媒最终形态。文件下载和邮件记录无法代替社媒内容预览。工程测试通过不等于这条产品叙事已成立。

## 入口和自由浏览

首页首屏标题改为“From social trends to your next Lavish campaign.”，说明“Explore a market insight, review the creative, and preview a simulated social post.” 默认重点案例SERENITY，一个主操作“Explore the campaign”；实际指向`/campaigns/scn-scent-layering.brief.main/journey?scenarioVersion=1.1.0`。

同一Journey页面有四个可直接选择的业务段落，URL `stage=insight|strategy|creative|social`，默认insight。任一步可直接进入、返回或去现有六工作区，不能用Run/上一阶段完成解锁浏览。段落标题导航下保留Campaign名称、SERENITY小图及一句核心创意，用户不会因换段落失去上下文。底部有具体下一步操作，顶部可随时跳转。

| 段落 | 先回答什么 | 主内容 | 实际操作 / 下一步 |
|---|---|---|---|
| 1 Market insight | 看到了什么话题，为什么值得关注？ | 一句热点总结、2–3条关键观察、对应模拟信号；来源与证据次级展开 | View evidence；Review the campaign idea |
| 2 Campaign idea | 为什么推荐SERENITY，准备怎样营销？ | 关联产品原图、推荐依据、受众、核心idea、主张、渠道，引用同一Brief/analysis | Open full brief；Explore the creative |
| 3 Creative development | 产品资料如何转化为广告创意和动态成果？ | 原图→主视觉→视频的三段演进；各段下面说明保留的产品身份、视觉方向与动态表现；可展开EN/AR脚本及四镜头 | 对比原图/主视觉；真实播放视频；Review social post |
| 4 Social post | 广告将以怎样的视频＋文案展示，准备发到哪里？ | 同页显示视频、EN/AR可切换发布文案、hashtags/CTA、模拟账号与渠道；右侧社媒帖子外观预览 | Edit / Save post；Review；Simulate publish；View simulated post；Download pack |

内容由统一数据提供，每段明确承接前段：热点ID→analysis/Brief→产品与素材ID→所选脚本/发布文案版本→不可变模拟发布快照。不能在各页重新写一套热点或文案。社媒第一条黄金路径选Instagram视频帖的本地预览；其它平台保留未来范围，不显示不可用按钮。本POC不承诺该预览满足真实平台广告投放规格。

## 创意制作与真实性

第三段讲清“产品身份输入、视觉概念、动态预览”之间的创意关系。仅将三图排在一起不够；需要有由网页内容作者给出的每一步意图、保留要素及变化说明。四镜头是15秒概念脚本，现有10.08秒3:4文件是独立Provided视频，不能显示逐镜头真实渲染对应或随改稿更新成片。

主动作是“View demo creation process”，打开可逐项查看的预置创作解释；如有自动演示，只高亮当前讲解段落，不写业务状态，不造渲染job、不显示实际运算百分比或“Generated just now”。可以明确说“Demo creative workflow”，素材附近保留“Provided demo asset · Not generated live”。这是完整Mock业务概念的展示，运行时无真实图片/视频生成服务。

首页已通过的原图→主视觉→视频顺序与对齐复用到创意段落；不把该模块与另一套大型Hero重复铺在首屏。主页只保留紧凑案例入口和四段摘要，Journey承担完整解释。

## 社媒末端

模拟发布是本轮必须补的可操作末端。邮件移入Deliverables次级历史，下载为辅助成果。第一条主链不包含排期日历、广告预算、真实账号连接或模拟效果KPI。

社媒预览标“Instagram · Demo account”，显示账号名Lavish Perfumes（不捏造官方handle）、原MP4、实际所选发布文案、CTA与hashtags。用户可以修改文案并保存，切换EN/AR的真实草稿，播放视频，再审阅及模拟发布。产品原图和Hero可在创意段落对照，无需重复作为社媒视频帖的多附件。

发布按钮为“Simulate publish”。成功显示“Simulated post created”，紧邻“No content was sent to Instagram.”，并显示内部模拟帖子卡和本地记录入口。禁止伪造平台URL、真实API响应、播放量或邮件成功。记录包含确切视频hash与已审阅文案版本；刷新可查看，之后修改文案不改变旧帖子，重新审阅后可产生新模拟帖子。

## 当前内容约束

新A SERENITY 1.1.0未到，旧A OUD/PERLA不能挂SERENITY视频假装整链完成。工程可先完成Journey投影、交互、社媒状态/预览；客户可见内容只用已接收的真实预置数据，测试用夹具留在tests。最终A主链等待网页内容更新。

在既有十JSON之外增加一个独立内容sidecar `campaign-presentation.json`（规范见SOCIAL_MOCK_CONTRACT.md），由网页端ChatGPT同批制作，用于热点摘要、创意步骤解释和EN/AR社媒发布预置文案。不更改冻结十文件Schema；这不是额外平台集成或另一套Scenario。

## 视觉与产品验收

沿用DESIGN_SYSTEM/HTML暖白黑金、统一按钮/弹窗，正文16px、辅助14px。四段导航是可操作段落，不显示技术文件名、版本hash、毫秒事件或开发进度。桌面展示一个当前主体，侧面最多一个简短摘要/下一步；不把业务主画面包围在统计面板中。社媒段采用编辑/预览两栏，视频保留3:4完整比例，控件在正常屏幕可见。

主控实际打开1440及1366页面检查：新用户能沿热点→推荐→创意→社媒走通并说清输入与成果；六侧栏自由访问；保存/刷新/回到前段不丢已保存稿；发布的确切文案/语言/视频与预览一致；原MP4播放和下载、包内附件一致；所有外部动作明确Simulated。一次集中验收，不反复对已通过基础造新门禁。

实施入口：tasks/DSH_HANDOFF_CONNECTED_FLOW.md。本文仅为产品/工程规格，尚未实现或通过新主链验收。
