> 2026-11-05素材范围更新：用户已提供SERENITY Hero/白底原图/10.08秒MP4，并确认以SERENITY统一A案例、另补相符脚本。以docs/PRODUCT_RESCUE_ASSET_INTEGRATION.md和FAST_06为最新增量；本轮不制作视频，但允许真实提供素材预览/下载。冻结15秒核心Schema保持，Provided片走独立sidecar/API，不伪称匹配成片。

# Interactive Mock Product · 当前最高范围与路由裁决

2026-11-05，用户最新要求优先。**自由浏览真实工作区；Scenario仅作数据容器。** 本文件取代旧“必须Home→Scenario→Run discovery→Run analysis才能查看内容”的页面约束。工程accepted历史保留，不作为本轮产品体验通过的结论。

## 目标与范围

首屏让Lavish营销人员理解：**Explore marketing opportunities and turn them into campaign-ready content.** 六个工作区都有真实内容、路由与操作。无后端/实时LLM/采集/邮件、无MP4依赖；所有业务外部能力Mock，界面与下载真实实现。不新增虚构指标、热度百分比、产品效果或占位业务故事。

继续使用网页端三套JSON、原冻结Schema与content-only Schema、已有MockApi/IndexedDB/版本/确认/ZIP。分析观点和依据必须在正常阅读页面展示；不能只在回放或原始JSON里存在。默认成果预览优先，时码/Asset ID/哈希等收进按需详情；原始ID不作客户的主标题。

## 路由和导航（主控冻结）

| 菜单 | 路由 | 直接进入时必须出现 |
|---|---|---|
| Overview | `/` | 三个营销机会、已有创意/可导出成果、真实近期导出；首要CTA Explore opportunities |
| Intelligence Radar | `/radar` | 全部15条模拟信号、来源/主题筛选、两类趋势、可打开的热点/证据、Agent Activity入口 |
| Opportunities | `/opportunities` | 三个机会及品牌匹配/推荐产品，选择进入策略详情 |
| 机会详情 | `/opportunities/[opportunityId]` | 推荐理由、证据链、假设/不确定性、Brief摘要与Open campaign |
| Creative Atelier | `/atelier` | 三Campaign选择器与默认结果预览；`?campaignId=&language=&versionId=&sessionId=&tab=`支持直达 |
| Creative Library | `/library` | 预置EN/AR脚本、静态分镜、所有已保存派生版本；筛选/预览/打开/导出 |
| Deliverables | `/deliverables` | 六份预置脚本版本及保存版本的可交付包，导出与历史；模拟邮件置次级抽屉 |

`/radar?source=&topic=&campaignId=&signalId=&activity=1`可分享选中信号/活动视图；`/library?campaignId=&language=&kind=&origin=&versionId=&sessionId=`；`/deliverables?campaignId=&language=&versionId=&sessionId=`。不支持的枚举给可恢复提示，未知ID明确Not found并可返回列表；不能静默换成A。清除筛选不清用户稿。

一级菜单均为真实Link，无Soon/空壳/disabled占位。路由高亮与breadcrumb一致，移动导航关闭/焦点/返回保留既有行为。Agent Activity为Radar抽屉，无独立一级菜单。开发工具/design-lab、/poc-components、/poc/preview不进入客户导航。旧`/poc/[sessionId]`只保留兼容/历史恢复，不作产品主路径，不强制迁移或删旧会话。

跨工作区上下文：URL中的campaignId/版本引用最优先。看过某机会后去Atelier/Library/Deliverables，Link携带该campaignId；直接访问无query的页面仍展示完整列表或默认可读A结果，不要求先选择。可用UI偏好记住最近Campaign，但不得覆盖显式URL、自动改工作稿或将单个Campaign强行塞入Radar全局列表。

## 只读浏览与写入动作

**浏览不改变业务状态。** 路由进入、卡片详情、来源筛选、语言tab、版本预览、抽屉、返回/前进、刷新都只读，不createSession/executeStage/selectScript/confirm，不记导出/交付。URL/UI筛选偏好可变化，但不能冒充业务事件。

数据/API裁决见`INTERACTIVE_PRODUCT_API.md`及类型唯一源`apps/web/demo/poc/api/product-contract.ts`（主控已给出，无实现）。查询旁路是授权的“预置内容浏览视图”，不放宽旧getEntity/replay游标规则；原回放仍只暴露游标前内容。

显式写动作：Edit this script、Save new version、Use as working version、Confirm script、Export content pack、模拟交付确认。版本预览切换不等于Use as working version，不得把用户确认状态静默撤销。保存/确认继续调用既有命令与guard；首次显式编辑/确认可由API初始化编辑上下文，用户无需先Run两个阶段。初始化说明是装载已准备的Mock内容，不宣称刚采集/生成。

状态用两条轴呈现：来源Preset / Saved version；确认Unconfirmed / Confirmed current；导出历史独立显示。正在编辑的未保存稿仅属于编辑器，有脏稿保护；不当作保存版本出现在Library/Deliverables。更改输入必须重新确认，但原版本和已导出快照保留。仅浏览不得产生确认或导出徽章。

## 导出和邮件分离

预置稿和已保存稿都能直接导出内容包，无需先模拟发邮件。未确认版本可导出，包内明确Draft / Not confirmed；不会因此确认它。未保存编辑要先保存，或显式选择已保存版本导出，不能导出错误旧稿。

新导出复用已有ZIP/字节/hash/版本解析；包包含可读Brief、脚本JSON、VTT、静态storyboard.html、真实关联产品/Logo文件、README、EXPORT.json。分镜是静态参考，不伪称广告成片。无MP4/poster/假发送回执。模拟邮件可复用已验收ContentDelivery，仅在已确认工作版本下开放且先保存稿、明确确认；不是普通导出的前置。

浏览器只能知道已准备/已触发下载，不能证明用户保存到磁盘。导出记录状态prepared/download_triggered，界面可写“Download started”，不得当作邮件送达。点击普通导出不调用simulateContentDelivery。

## 演示回放与实际操作

Activity打开只读原discovery/analysis前缀及已有编辑操作日志，标签区分“Preset Agent demo / Your actions”。第一次点Play才显式创建独立activity会话，用已有ReplayControls和prefix；不绑定工作稿。回放不确认脚本、不创建交付/导出，不播放尚不存在的视频/发送事件。无需Play就能读全部预置内容。

## 产品验收

在干净浏览器直接访问六个主路由都有可阅读成果。用户可按Radar→机会→Atelier→Library→Deliverables→Overview任意切换，关联同Campaign/版本且刷新可恢复保存内容。以交互矩阵逐一检查所有核心控件；guard禁用必须有具体理由与恢复方式，不是Soon入口。

首屏主信息必须是机会、理由、产品、成果与下一行动；永久但克制的全局“Demo · Mock data”足够配合来源/交付上下文披露。不要反复铺无MP4/无renderer/无外部请求的技术说明，不隐藏模拟本质。1440/1366实际截图；主要语言结果预览和一个移动布局检查。检查字体、留白、品牌真图、默认阅读路径，不以测试全绿替代产品可理解性判断。

开发节奏：先统一读视图/写入桥接，再做可操作页面，复用同一A版布局到B/C，最后统一接导航与完整点击审计。相关任务可连续实现，不为每个控件停工；首批Radar/机会/Atelier的A结果预览先给主控看实际截图，避免六页同时退化为技术表单。未实现/未实测不能标passed。本次仅冻结规格与任务，当前界面尚未完成这些新要求。
