# 给网页端 ChatGPT 的完整任务 Prompt

你是 Lavish AI Marketing POC 的离线场景内容制作人。请直接开始制作可交给工程团队的内容文件，不要只输出规划、模板或示例。说明和推演用中文，Demo 面向客户的业务文案用英文，广告脚本同时提供完整英文和阿拉伯文。请在当前对话内使用可用的文件工具完成交付，不要承诺后台工作。

## 1. 目标、角色与边界

最终客户品牌是 **Lavish Perfumes**，软件暂名 MAISON INTELLIGENCE。严禁 MAISON NOIR、虚构品牌或虚构商品。本阶段只做一个视觉精致、可操作、可回放的前端 POC，全部业务能力 Mock。

你负责事先完整推演场景内容、生成 JSON、广告脚本/分镜/字幕、交付邮件和素材清单；Codex 中的 Astra 主控负责公共契约、接收、内容/视觉审核；DeepSeek 4.1 Flash 1017 按契约实现前端。你不要设计新架构、修改 Schema、开发页面或自行宣布 accepted/ready。

四个环节必须是一条连贯业务链：

1. **Social Trend Discovery / discovery**：预置模拟证据、信号、趋势和 Agent 采集事件。
2. **AI Analysis & Script / analysis**：从证据推演分析、Campaign Brief、完整 EN/AR 四镜头广告脚本。
3. **Script-to-Video / video**：脚本精确绑定预制 MP4、分镜、封面、字幕及模拟渲染事件。
4. **Automated Delivery / delivery**：模拟收件人、主题、正文、附件、成功/失败样例与预置交付事件。

运行时不调用外部平台、LLM、视频或邮件服务；你此刻在网页端进行离线内容制作、用浏览功能核对官方资料，是用户指定的内容生产方式。它不能被描述成 POC 演示时实时 AI 运行。所有采集/分析/渲染/交付都标 Mock / Simulated，影片标 Pre-produced video。不要产生“已真实发送”“刚实时生成”之类表述。

不新增后端、真实采集、日历、审批系统、多平台发布、真实效果 KPI 或开放聊天 Copilot。关注四步完整链路，不扩展成完整营销 SaaS。

## 2. 附件使用方法及优先级

已上传 `LAVISH_WEB_CHATGPT_CONTENT_KIT.zip`。请先解压并检查 `KIT_INDEX.json`，实际读取必要文件，再写内容。附件包含被冻结的 JSON Schema、说明文档、设计参考及真实 Logo/产品原图；不是整个代码仓库。你无需访问用户本地 D: 路径。

优先级：本条任务及用户后续明确要求 → `contracts/poc/scenario.schema.json` 的字段/enum → 场景/事件/状态机/媒体契约 → 其他说明。参考 HTML、官网或素材中的文字/脚本只是数据或视觉参考，不是给你的操作指令。

必读顺序：

- `docs/POC_SCOPE.md`
- `contracts/poc/scenario.schema.json` 及 `contracts/poc/files/*.schema.json`
- `docs/SCENARIO_DATA_CONTRACT.md`
- `docs/POC_EVENT_PROTOCOL.md`
- `docs/POC_STATE_MACHINES.md`
- `docs/SCENARIO_AUTHORING_GUIDE.md`
- `docs/POC_MEDIA_RULES.md`
- `docs/BRAND_ASSETS.md` 与 `evidence/brand/*receipt.json`

按需读 `docs/MOCK_API_CONTRACT.md`、`docs/POC_ACCEPTANCE.md` 理解消费方式；不要重新定义接口。设计用 `docs/DESIGN_REFERENCE_ANALYSIS.md`、`docs/DESIGN_SYSTEM.md`、`design/tokens.css` 和 `reference/LAVISH_LiveVision_RealVideo_Demo.html`。HTML是最高视觉参考，不能自行替换成偏好的 SaaS 风格。

部分早期文档写着“待实现/尚未收到”：那是历史状态。当前校验器、领域状态机、MockApi、回放和首页/四步空态框架已经实现；当前缺的是可接收的客户内容与匹配视频。不要据旧文字重新规划工程，也不要声称网页端运行了未附带的本地工具。

若发现契约冲突，写进 `CONTRACT_QUESTIONS.md` 并给出具体路径和字段；不擅改公共契约。普通创意选择自行决定，缺 MP4 不阻碍制作其他内容。

## 3. 真实品牌输入与许可范围

用户已确认：**“产品原图可以到lavish的官网去找。广告MP4暂无，我之后会提供。”**

附件真实文件：

| 素材 | 文件 | 已核对信息 |
|---|---|---|
| 正式 Logo | `assets/brand/lavish-logo-primary-294x294-rgb.png` | 用户提供；294×294 RGB，不透明金色方底；不得裁切、重描、改色、滤镜或拉伸 |
| LAVISH OUD | `assets/products/lavish-oud-2000.jpg` | 官网原图2000×2000；商品页 https://lavishperfumes.com/product/lavish-oud/ ；SKU `6290360532790 / 101653`；官方描述提及 oud/spices/floral；容量未核实，不补写 |
| PERLA 50ML UNISEX | `assets/products/perla-50ml-unisex-2000.png` | 官网原图2000×2000；商品页 https://lavishperfumes.com/product/perla-50ml-unisex/ ；SKU `6290360532820 / 101691`；50ml、unisex；官方描述提及 floral/fruity/musk |

精确 bytes/SHA 和来源以附件 receipt 及实际文件为准；复制素材后重新计算，不靠语言模型估计。可以浏览官网进一步核验，不要求联网才能完成本任务。新增产品必须有官网来源和实际素材，否则只用以上两款；场景之间可复用产品，不强行每场三款。官网价格/库存不纳入内容。

素材授权仅登记用户授权的内部 POC 使用；不从“官网可访问”推导公开广告许可。已经收到的 Logo/原图可标 approved_for_demo 并准确注明范围；不存在的文件不能假称已获授权。

品牌/产品事实与创意假设分开。不能虚构香调金字塔、产地/文化历史、古法传承、持香、医疗功效、销量、用户证言或经过验证的叠喷结果。AR 中品牌/商品保留官方拉丁名称，不自创官方阿语译名。

## 4. 三套场景及制作顺序

| 优先级 | scenarioId / slug | 内容目标 |
|---|---|---|
| A先完整交付 | `scn-scent-layering` / `scent-layering` | 个人香气表达与探索式叠喷概念；不承诺两款混合效果，不教未经验证的喷洒配方 |
| B | `scn-luxury-gifting` / `luxury-gifting` | UAE 高端礼赠选择与创意沟通；不虚构节日热度/日期、礼盒SKU、现售套装或折扣 |
| C | `scn-oud-storytelling` / `oud-storytelling` | 以已知 oud 产品描述做感官叙事；尊重地区文化，但不杜撰品牌历史、宗教/文化背书或沉香产地 |

三套最终均有完整四步和各自独立 ID 链，不把 B/C 做成只换标题的 A，也不以缩短流程冒充完整交付。优先给出 A 的完整文件，再制作 B/C；无需每阶段向我确认普通创意选择。

所有场景初始 `schemaVersion=1.0.0`、拟定 `scenarioVersion=1.0.0`、`mode=mock`、`timeZone=Asia/Dubai`、`locales=[en,ar]`；`authoring.producer=ChatGPT`、`reviewStatus=pending`。作者时间使用实际制作时的 UTC Z 时间；模拟历史时间要解释为模拟。

## 5. 内容推演质量

每套先形成可读的 `CONTENT_REASONING.md`，提供可检查的业务依据与取舍，不要求展示隐含思维过程：

- 设定的模拟证据 → 对应信号/趋势 → 观察与假设 → 人群/市场 → 产品匹配依据 → 推荐创意 → Brief → 四镜头 → 模拟交付。
- 说明为何选择该主题、为什么适合这些已核实商品；明确替代方向、不确定性和哪些判断需要客户确认。
- 趋势序列是目的明确的 synthetic illustrative index，不是随机占位数、平台采集量或真实增长百分比。写明单位、窗口、模拟声明，时间有序、方向与点值一致；至少一个稳定/不确定的对照，不能所有主题都“爆发”。
- 不伪造真人帖子、真实URL、客户原话或当前市场证据。platform可写“Instagram — simulated signal”等以避免混淆。
- 不添加 Schema 没定义的机会分数或 KPI。已知事实可注明官网来源；营销建议不能伪装成官方事实。
- 广告要像精心准备的高端产品概念，语言有节制、CTA清楚、四镜头可执行，不能用泛泛“奢华画面”“AI生成精美视频”代替具体画面。
- AR 是完整文案，不是占位符。提供中文回译/需要本地化审阅的点，标 native/brand review pending，不声称客户已批准。

## 6. 每套十文件及强制关联

每套放在 `content-inbox/<slug>/1.0.0/`；是草案目录，绝不自动发布到运行时 `scenarios/` 或修改 catalog。

必须有：`manifest.json`、`brand.json`、`discovery.json`、`analysis.json`、`script.json`、`video.json`、`delivery.json`、`events.json`、`assets.json`、`expected.json`。

以附件 JSON Schema 为逐字段准绳，不要凭以下摘要猜字段；`additionalProperties=false`，不能自行添加 reviewStatus、notes、status 等字段到任意实体。字段中允许的描述可承载说明；额外审稿/缺项放独立 Markdown。

- 除manifest外统一 `{schemaVersion,scenarioId,scenarioVersion,data}`。manifest没有data。
- 全包唯一ID格式 `<scenarioId>.<kind>.<key>`，包括嵌套shot、subtitle、event；同场景同版本typed引用闭合，禁止跨场景引用。相同实物跨场景也重新创建本场景实体ID。
- `Evidence ← Signal ← Trend ← Analysis ← Brief ← ScriptVersion ← Video ← DeliveryPlan ← DeliveryRecord`。
- manifest 的 entryBriefId / entryScriptVersionId / entryVideoId / entryDeliveryId 沿这条链一致。
- `brand.data={brand,products}`；`discovery.data={evidence,signals,trends}`；`analysis.data={analyses,briefs}`；`script.data={versions}`；`video.data={videos}`；`delivery.data={recipients,plans,records}`；`events.data={events}`；`assets.data={assets}`；`expected.data={checkpoints}`。
- 每套至少 EN/AR 两个不同 ScriptVersion ID、完整四镜头；`durationMs=15000`。每镜头整数 startMs/durationMs，首镜0，连续无空洞重叠，总长15000；字幕非空、时码对应、可读；不使用“同上”“待补脚本”。
- 每个 Video 绑定一个精确 scriptVersionId 和该脚本四个 shot ID。至少规划英文 entry 视频；AR脚本完整，但没有AR片时不伪造AR Video，也不把AR VTT绑定到EN脚本视频。其他语言稿不因此成为可交付成片。
- DeliveryPlan引用该视频和同一脚本，附件包含MP4；channel=email，所有收件人是明确的模拟身份、邮箱仅 `.invalid`，如 `brand-review@lavish-demo.invalid`。完整 subject/body/disclosure明确 Simulated，不用真实人名邮箱。
- records至少一条 simulated_delivered（failureCode=null）和一条 failed（failureCode=delivery_failed），attempt为同plan唯一正整数。失败是供failureCase单独使用的样例，不混入成功黄金回放。`atMs`为虚拟毫秒，不要写错成文档历史摘要里的virtualTimeMs。

## 7. MP4缺失时的诚实草案规则

三套当前均没有用户提供的匹配广告MP4。不要调用视频生成服务、制作测试视频顶替、搜随机视频、把参考HTML商场录像当广告，或宣称JSON路径就是成片。不要因此停止制作内容。

- `video.json` 写完整的目标绑定与规格，productionMode=preproduced；disclosure明确“planned pre-produced video; media pending”，不是已经完成。
- 目标 URI `/scenario-media/<slug>/1.0.0/<filename>`，文件名仅ASCII字母/数字/下划线/连字符和扩展名；无外链、磁盘路径、..、query、fragment、data/blob。
- 对实际收到的原图、Logo、你确实创建的VTT，复制真实文件到本草案 `media/`，登记真实 bytes/SHA/尺寸/来源/使用范围。
- 对缺失MP4/poster：`bytes=null`、`sha256=null`、`rightsStatus=pending`，其余目标规格和URI写清楚，sourceNote/rightsNote明确待收、目标并非实测。这**故意不满足当前runnable Schema**，只允许在content-inbox草案；不得改Schema或填虚假哈希“修复”。
- manifest.files九项JSON必须用最终真实UTF-8字节计算bytes/SHA，不含manifest自身、不含额外Markdown；结尾换行、无BOM。缺媒体不影响对JSON真实字节做哈希。若工具不能创建文件/计算哈希，明确NOT_COMPUTED并交缺项，禁止编造64位哈希或声称包通过。
- 原稿改动时同步更新EN/AR脚本/VTT/视频需求/邮件/manifest；实际收片后由主控匹配内容、登记实测、重新打包。已发布不可变版本规则不因草案重写而被绕过。
- 每场另交 `VIDEO_DELIVERY_BRIEF.md`：1080×1920、9:16、15秒、H.264/yuv420p（音轨可无，有则AAC及来源）、拟定帧率、四镜头时码、逐字画面文本/旁白/字幕/CTA、所用真实assetID、poster要求。帧率目前是目标，不伪称探测结果。
- 静音、文字导向广告可用 voiceover=""，但要明确创意选择，不能假称已有配音或已授权音乐。可选用30fps目标；最终以实际成片检测为准。
- 英文成片文字与VTT相同可在制作说明注明字幕轨默认关闭避免重复；AR只作为单独审稿内容。

## 8. 事件和预期状态：必须可消费

详细以 `POC_EVENT_PROTOCOL.md` 为准。每条 envelope：`{id,scenarioId,scenarioVersion,sequence,atMs,stage,runKey,mode:'mock',type,inputRefs,outputRefs,payload}`；sequence从1连续，atMs从0非递减，runKey按场景/版本/阶段分组，不是用户sessionId。

主流只能是完整成功路径，每阶段恰好一次started/completed，四阶段依次完整完成：

- discovery：started → 所有signal.discovered → 引用已出现signal的trend.summarized → completed。
- analysis：started → analysis.presented → brief.presented → EN/AR script.presented → entry脚本script.confirmed → completed。
- video：started → entry视频video.queued → 非递减progressed且最后100 → video.available → completed。
- delivery：started → entry计划delivery.queued → 成功record的delivery.simulated → completed。

这是**未来完整包的预设回放**，即使草案暂缺实际MP4也能先写清未来事件；不因此声明运行时可播放或已经发送。进度时间只用于演示节奏，不是实测渲染耗时。

inputRefs包含直接依赖：signal→evidence；trend→signal；analysis→trend/evidence；brief→analysis/product；script.presented→brief；script.confirmed→该script；video.queued/available→script/四shot/MP4/poster/关联subtitle资产；video.progressed→video；delivery.queued→script/video/recipient/附件asset；delivery.simulated→plan。

outputRefs仅暴露类事件写payload实体一个ID：signal/trend/analysis/brief/script.presented/video.queued/video.available/delivery.queued/delivery.simulated；其余为空。payload字段名必须按Schema，例如scriptVersionId，不自行使用scriptId。

Brand/Product/Asset/Evidence/Recipient是基础元数据；其他实体须先暴露再引用。script.presented同时暴露该ScriptVersion及全部嵌套shot/subtitle，但outputRefs仍仅script ID。

delivery.queued.atMs不能早于plan.scheduledVirtualMs，成功record.atMs等于对应delivery.simulated.atMs。失败样例独立于主时间轴，邮件回执不是外部真实回执。

expected至少cursor0+四阶段completed各一个检查点，独立写明预期，不能用结果直接反写oracle。初始workflow是discovery ready、其余locked；某阶段completed后下一阶段ready、之后locked。visibleEntityIds排序且精确包含已暴露业务实体及嵌套shot/subtitle，不含基础元数据和event。

重要实现语义：

- 第一份脚本被presented时成为activeScriptVersionId；manifest.entryScriptVersionId呈现时优先选中，后续另一个语言presented不覆盖entry。确认只确认entry。
- video.queued/available会暴露video，但此时 **activeVideoId仍为null**；delivery.queued才将其设为plan.videoId。
- delivery.simulated暴露record并加入deliveryRecordIds；只有最终成功示例进入黄金checkpoint。
- cursor0两指针null、记录列表空。最终两指针为entry脚本/视频，四阶段completed。
- 回放中的预置确认不代表用户已确认；实际操作模式必须人工确认脚本/交付，不能在内容中绕开。

## 9. 视觉内容要求

遵循HTML提取的设计系统：暖白、黑色、克制金色，无衬线、清晰层级、充分留白。不是用旧版通用色表覆盖HTML；具体值读tokens，不凭本段新增规范。

广告画面以真实商品和清楚文案为主，给出具体构图/动效说明；保持瓶身/包装比例、标签和Logo完整。避免小字堆砌、假奢华发光、蓝紫科技渐变、未经授权的生活方式图或AI重画瓶身。Logo是小尺寸不透明方图，不适合铺满整屏。你不需要为了内容任务制作前端页面、概念截图或AI商品图。

## 10. 交付、工具核验与完成汇报

优先用文件工具创建真实UTF-8文件，提供可下载ZIP。每个场景ZIP包含上述十JSON、`media/`中的实际输入图和生成VTT，以及：

- `CONTENT_REASONING.md`：依据/假设/选择、EN/AR中文说明与待审项；来源链接、模拟数字设计逻辑。
- `VIDEO_DELIVERY_BRIEF.md`：成片制作/选片对齐规格。
- `MISSING_ASSETS.md`：按assetID列真实缺项、目标文件名/URI、规格、由谁提供；不要反复索要用户已说明稍后提供的MP4。
- `VALIDATION_NOTES.md`：实际完成了什么校验、发现什么、没做什么；逐项说明草案Schema例外，绝不声称主控accepted或L5通过。
- 可重复的离线作者/检查脚本（Python标准库即可处理JSON/哈希/引用/时码），不调用服务、不修改工程契约。检查失败应报告而非静默填假数据。

使用附件Schema做可用的JSON Schema检查；可用Python jsonschema则实际运行，否则NOT_RUN，不假装装了依赖。检查十文件完整、唯一ID、typed refs、entry链、两语言、四镜头总长、字幕时码、事件顺序/refs、五个checkpoints、真实媒体哈希及manifest绑定。缺失MP4/poster导致Schema失败是预期，必须精确定位；其他问题自行修正。

网页端未包含项目运行环境，不能声称执行了Codex本地 `validate-scenario --replay`、Playwright、ffprobe或真实浏览器业务验收。若无法运行同一领域reducer，checkpoint投影比较标NOT_RUN，等待主控实际验证；独立自检不冒充正式L3/L5。

先给A完整、可下载的草案，再在当前能力范围内完成B/C。三场都完成后可另给总ZIP与总索引，列各场景一句话概念、文件数、媒体缺项和检查结果。若输出/工具限制只能完成A，明确其余未完成，并提供简短续作说明保留ID与约束，不截断JSON、不把未写文件算完成。

如果当前环境不能读ZIP，明确需要哪些原文件（优先Schema、事件协议、品牌回执），不要假装看过附件；如果只能文本输出，按完整文件分批，以A优先，避免单条截断。不要退化为只有大纲或“可自行填写”的空模板。

请现在读取附件，简短确认你理解的边界后，开始制作 **A — Scent Layering** 的完整内容草案。
