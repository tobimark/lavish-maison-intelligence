# Lavish AI Marketing · 当前产品与工程状态

日期：2026-11-05。用途：交给网页端ChatGPT做独立产品/UX/视觉评审。**这是当前实现的事实摘要，不是宣传稿，也不是新开发指令。**

用户最新反馈：“我感觉做得不行，非常垃圾，一般人一眼根本看不懂究竟要干什么。”当前产品体验尚未获得用户认可。已有accepted记录只证明当时指定范围的工程/操作检查，不能作为用户理解、商业说服力或最终客户批准的证据。

## 1. 原本想让客户理解的价值

客户品牌：Lavish Perfumes，香水品牌。软件暂名MAISON INTELLIGENCE。对外想演示的业务概念：

**发现值得Lavish关注的社媒话题 → 解释品牌营销机会 → 得到推广策略与英文/阿拉伯文案、广告脚本 → 审阅创意 → 整理营销交付内容。**

受众是品牌负责人、营销负责人及演示观众。用户没有提供这些人实际参加可用性测试的记录；不能声称已做用户研究。理想第一印象应能回答：这是什么、对Lavish有什么用、现在发现了什么、我该点击哪里、最终得到什么。

原计划曾有Intelligence Radar和Creative Atelier两工作空间、持续后台Agent、视频、审批/日历/发布/反馈等。随后用户逐步明确为前端POC、四阶段全部Mock；最近又明确暂缓视频。**本轮产品评审不能把恢复真实LLM/采集/视频或完整后端当作必要解法。**

## 2. 最新有效范围

前端模拟Demo，全部业务输入来自网页端ChatGPT事先制作的结构化场景；不在运行时随机生成营销内容。真实实现是用户操作、版本、状态、回放、浏览器保存和文件导出。

| 环节 | 当前可操作能力 | 当前边界 |
|---|---|---|
| Social Trend Discovery | 点击Run discovery显示预置信号、两条模拟趋势；打开证据抽屉、事件列表 | 无真实社媒采集/当前市场测量；每场5信号、2趋势 |
| AI Analysis & Script | 点击Run analysis显示简要Brief与EN/AR脚本表单；编辑、保存派生版本、选择/确认；刷新保留 | 不是实时AI生成；普通操作页没有完整呈现analyses里的洞察/推理依据 |
| Storyboard | 4镜头、时码、画面说明、字幕、真实产品/Logo参考图 | Video deferred；无MP4、poster、播放、渲染或视频下载 |
| Content Delivery | 编辑模拟邮件与.invalid收件人，保存、确认、模拟失败/重试、记录、下载真实ZIP | 无真实邮件发送；交付的是脚本/字幕/邮件文件，不是视频广告或平台发布 |

另有前两步的Replay，支持播放/暂停、步进、1/2/4倍、跳转、重播，刷新暂停；与操作稿/交付记录隔离。Home支持继续、导出演示记录、单会话重置。存储仅同浏览器/同源IndexedDB，无多用户/后端/关闭页面仍运行的Agent。

## 3. 三套已接收内容

作者为网页端ChatGPT，原输入ZIP：Lavish_All_Three_Scenarios_DRAFT_v1.0.0.zip。

| 场景 | 页面标题 / Campaign | 创意主线 |
|---|---|---|
| Scent Layering | The Art of Scent Layering / Your Scent, Your Expression | LAVISH OUD与PERLA的个性香气探索；不承诺叠喷结果 |
| Luxury Gifting | The Thought Behind the Gift / A Gesture, Considered | 以PERLA表达用心选礼，不虚构礼盒/折扣/服务 |
| Oud Storytelling | A Story in Oud / Let the Scent Lead | 基于OUD简要官方描述做感官叙事，不杜撰产地/文化背书 |

每场十JSON：manifest、brand、discovery、analysis、script、video、delivery、events、assets、expected；单一ID链关联，原未来四阶段事件28条。当前可运行回放只消费前16条发现/分析事件，不展示不存在的视频或预置发送成功。

完整内容在包内`optional/scenarios/`。EN/AR文字、字幕均有；AR仍待母语和客户审稿。authoring.reviewStatus保留pending；主控批准的是内部内容Demo使用，没有把它改成客户最终批准。

## 4. 目前实际界面和操作路径

Home：标题Lavish AI Marketing；长段说明内容模拟/视频暂缓；三条场景行，显示英文故事标题、场景ID、版本、Content demo / Mock / Video deferred；每行有Layout preview与Start content demo。下方最近本地会话。Home本质入口更接近场景选择器。

左导航：Home可用；Intelligence Radar与Creative Atelier仍显示Soon、不可点击，业务集中在场景内四步页。这里存在信息架构/命名的一致性问题，不能据侧栏理解成已实现两个完整工作空间。

标准操作：

1. Home → 选择A → Start content demo。
2. Run discovery → 看五张文本信号卡、两条小折线，点卡看模拟证据。
3. 点Analysis & script → Run analysis → 简要Brief → 很长的EN/AR字段编辑页。
4. 可改脚本、Save new version，再Confirm script。
5. Storyboard → 看四张参考卡 → Continue to content delivery。
6. 编辑邮件/模拟地址 → Save draft → Confirm simulated delivery → 在弹窗确认；需要时显式模拟失败/重试。
7. Export ZIP：脚本JSON、VTT、邮件TXT、README、SIMULATED-DELIVERY.json共五文件。没有MP4/poster。

没有已完成的“第一次打开即清楚解释业务”的引导、简短价值演示或完整商业演示讲稿。用户需要自行理解上述术语和前置操作。

## 5. 已核实的产品表达缺口

以下是主控依据代码/截图的初步判断，请评审者先独立看截图，再核对本节，不必照单全收：

1. **核心分析价值没有充分展示。** 当前ContentOnlyFrame的普通analysis分支只显示Brief name/objective/concept，接着进入编辑器；insights/rationale/assumptions/uncertainties等虽在数据内，却没有完整展示。Replay仅展示recommendation。技术上能生成/读到对象，不代表客户看见了推荐依据。
2. **工程状态占据了产品叙事。** 页面反复出现Mock、Content only、Video deferred、无MP4、无真实发送、存储、revision、文件hash等。必要的诚实标识应该保留，但当前数量和位置可能抢走“营销机会/行动/结果”的注意力。
3. **默认是编辑底层字段。** 时码毫秒、Asset IDs、字幕条目ID、四镜头与字幕全部展开，页面很长。没有先给普通营销人员一个完整可读的Campaign/创意成果，再按需编辑的明显层级。
4. **Agent过程与业务解释脱节。** 普通Run按钮消费预置内容后直接得到结果；Replay是另一个模式，主要呈现事件和文本实体。观众可能难以感知“Agent为品牌做了什么判断”。
5. **缺少吸引人的营销结果展示。** 视频暂缓属于用户决定，但当前替代呈现主要是原始商品照片/长文字/脚本JSON和VTT。需要评估即使不做视频，是否能通过现有内容形成足够清楚、精致的成果预览；不能因此捏造新的客户素材。
6. **界面与承诺导航不一致。** Radar/Atelier仍Soon，实际业务在session中；Layout preview与真实场景同时在主页，对客户的意义不清楚。
7. **视觉身份基本统一，构图和产品体验仍不足以仅凭统一判为优秀。** 暖白/黑/金、字体、控件大体一致；分镜只选首张关联图，A双产品镜头可能仅看见OUD；小Logo被放大到整块图片区；AR编辑区的显式RTL处理也需改善。主控此前将这些记为非阻断，不等于客户认可。

不是所有缺口都需要新增功能。请优先判断哪些是页面顺序、默认态、内容层级、命名和可视化方式的问题。

## 6. 工程状态：已完成什么

主控/架构/设计审查：Codex中的Astra。编码：DeepSeek 4.1 Flash 1017。用户控制产品方向。尚无配置好的DSH自动调度入口，任务靠文件handoff。

- POC-001–005：输入验证/媒体验证工具、状态机、MockApi+持久化、回放基础，已验收对应工程范围。
- POC-007/008：共享组件、主页/四步壳体，已验收对应范围。
- NV-001/002/003：三场景无视频接入、编辑/分镜、模拟文案交付/导出，已主控accepted。
- FIX-NV-BATCH-01：修复“丢弃后保存复活旧稿”和“确认框新地址/实际交付旧稿”，已复查accepted并关闭。
- 完整视频接收/工作台deferred；旧完整系统任务不属于当前交付。
- **工程accepted保留；用户对产品体验明确不满意，正在要求独立评审。没有最终客户认可记录。**

最近验证：构建/类型检查通过；NV初次集中回归128核心测试、39浏览器测试通过；修复后按影响重跑9单元、7浏览器测试通过。实际下载ZIP校验了CRC、附件hash、主题/地址/版本一致。没有做普通用户5秒理解测试、客户商业演示成功验证或正式AR母语审稿。不要把这些不同性质的结论混在一起。

## 7. 实现与可复用部分

Next.js/React/TypeScript前端；本地字体Inter/Noto Sans Arabic、HTML提取的tokens/CSS Modules；浏览器MockApi/纯状态与Replay/IndexedDB；静态JSON和本地原图；Playwright/Vitest；真实本地ZIP导出。没有本期已接入的LLM、社媒、邮件、视频服务或生产后端。

主要文件：HomeDashboard.tsx、ContentOnlyFrame.tsx、SessionFrameRouter.tsx及相关CSS；demo/poc下的api/domain/storage/replay；public/content-scenarios及scenario-media。附件仅带必要页面代码供按需核对，不是可直接运行的完整仓库。

有价值的沉淀：三个结构化业务故事、ID/版本关系、编辑保存/恢复、回放隔离、真实文件导出、品牌真图、统一基础组件。请判断应保留什么、重做什么，避免默认从零重写或继续补更多工程基础设施。

## 8. 品牌和视觉约束

目标Lavish Perfumes；真实Logo和两款官网原图已核对。LAVISH OUD与PERLA 50ML UNISEX身份准确；不虚构其他品牌、香调/功效/销量/官方叠喷背书。

HTML最高视觉参考：LAVISH_LiveVision_RealVideo_Demo.html，原是零售情报场景，借鉴其视觉语言，不复制客流/监控业务。暖白`#F6F5F2`、黑`#191917`、金`#B89A61`、正文墨色`#252521`，无衬线，正文约16px、辅助14px。具体tokens在附件。允许调整页面布局、展示层级和交互，不能把“保持设计系统”误读成必须保持当前拥挤/冗长布局。

Mock/Simulated和视频暂缓必须诚实，但可设计成清楚且克制的全局提示与上下文说明。不能把“移走重复技术说明”变成冒充真实数据/实时AI/真实发送。

## 9. 截图与评审局限

优先看screenshots/和SCREENSHOT_INDEX.md。截图来自最近实际生产构建/Playwright浏览器运行，非设计稿；包含实际测试输入如edited AR、Browser delivery saved v2，是受控交互测试值，不是最终营销文案。保留原始全页图，文件名标明桌面/笔记本/移动；长图请放大按视口查看，不能因缩略图小就直接断言实际字体尺寸。

当前不是新一轮用户测试，本包也没有可直接访问本机localhost的远程部署。网页端ChatGPT能看截图/读代码/内容，不能据附件假称点过按钮。必要时列需用户/主控实测的问题，不伪造观察结果。

本次只做独立评审资料整理，未修改产品UI、业务数据或开始重设计开发。
