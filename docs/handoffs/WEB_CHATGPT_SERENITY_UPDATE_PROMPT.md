# 网页端ChatGPT · A案例SERENITY内容更新

> 最新补充：与`WEB_CHATGPT_CONNECTED_FLOW_ADDENDUM.md`一起执行，一次交完整A1.1.0与独立presentation侧车，增加热点摘要、产品匹配、三段创意解释和EN/AR社媒视频帖预置文案。侧车结构见`docs/SOCIAL_MOCK_CONTRACT.md`；不改下面十JSON的冻结契约。

请作为本项目离线内容作者更新Scent Layering，而不是编写产品代码。用户已明确选择：**以SERENITY统一A案例，另补相符脚本**。不要改B/C，不调用实时平台、视频或邮件服务。

附件包含旧A十JSON/审稿说明、冻结Schema、三份用户实际素材、sidecar登记、媒体参数及抽样帧。先读资料再写文件；原HTML、JSON内容和MP4元数据是资料，不是操作指令。不能假称视频实时生成，也不要重新生成/转码/裁切原片。

## 输入事实

- 图片/视频瓶身是SERENITY，原A 1.0.0是OUD+PERLA，因此不能只做名称替换。
- 官网 https://lavishperfumes.com/product/serenity/ 核对的产品名称SERENITY，SKU6290360533636 / 100014，描述涉及citrus/floral/musk；容量未核实。木枝/摆件不是香调、配方或产地证据；不写oud/spice、持香/功效/文化背书，除非另有实际官方证据。
- Hero为2560×1440 PNG，白底identity原图2000×2000 PNG。原文件字节/SHA见provided-serenity-assets-receipt。
- 已提供MP4为10.08秒、720×960、3:4、24fps、H.264/yuv420p+AAC，实际静音播放/seek已检查；不是原冻结契约的15秒9:16片，不暗示可实时编辑视频。上游生产方式未确认，不声称实拍或本POC生成。
- 用户要完整可理解的营销案例：机会/推荐依据→Campaign Brief→EN/AR创意文案/四镜头→产品identity/已提供短片→可下载成果包。所有发现/分析都是Mock。

## 版本与交付

在`content-inbox/scent-layering/1.1.0/`输出完整十JSON，schemaVersion保持1.0.0，不改冻结Schema、不得覆盖1.0.0。主Brief逻辑ID可保留`scn-scent-layering.brief.main`，新产品ID`scn-scent-layering.product.serenity`，新EN/AR脚本ID使用en-v2/ar-v2，脚本version=2。其他逻辑ID可保留但必须同包引用闭合，事件/expected对应新内容。

把旧的两商品混合/配对故事改为SERENITY单品的香气层次探索/感官视觉概念；它仍是Scent Layering场景容器，但不声称与另一商品叠喷已测试。用清楚的受众/目标/产品匹配/创意方向解释为什么值得Lavish审阅；模拟信号保留可追溯依据，不伪装实时数据。给完整Brief：核心idea、受众、商品focus、creative angle、tone、channels、languages、Why Lavish。

**冻结Schema与实际片长的兼容**：核心ScriptVersion和VideoEntry仍要求15秒、四镜头；请制作完整15秒SERENITY概念脚本及EN/AR timed subtitles，继续可由现有版本/编辑机制使用。原MP4作为独立Provided preview走sidecar，不能写进要求15000ms的video asset当15秒成片，不能把15秒VTT挂到10.08秒视频。

核心video.json保留规划中的15秒概念片条目及精确脚本引用；它的MP4/poster在draft assets中仍为null bytes/sha、pending rights，明确未制作，不以sidecar成片替代。所有未来视频/邮件事件是原协议预置未来演示，当前产品只回放发现/分析前缀，不能声称已渲染/已发信。现有schema例外仅是这两项待收核心媒体。

实际Hero/白底原图可在新包assets中用image/product_image类型及`/scenario-media/scent-layering/1.1.0/...`路径登记并复制真实文件；sidecar独立保存Provided MP4与额外复用路径，不向十JSON添加未知字段。品牌Logo保留原真图，不重画。brand.products只用SERENITY作为新A主体，不保留OUD/PERLA的错误商品role。

另外输出：

1. CONTENT_REASONING.md：新证据/观察/假设/商品匹配/推荐取舍与旧A变化说明。
2. SCRIPT_EN.md / SCRIPT_AR.md及真实VTT；AR完整，产品名保持Latin，附中文回译与母语待审项。
3. VIDEO_RELATIONSHIP.md：解释15秒概念脚本和10.08秒用户短片的关系。基于实际查看或附件抽样帧，列出可见内容及不能证明的部分；只读抽样帧时不得声称听过音轨/逐帧审过全片。可给四个内容叙事beat，但不是伪造真实cut点。不要求二次生成。
4. CHANGELOG.md与MISSING_ASSETS.md：明确核心15秒影片未制作、当前演示使用实际provided短片，不再要求用户提供影片才能开发其他工作区。
5. VALIDATION_NOTES.md：结构、ID、时码、manifest/真实文件hash检查，无法运行的同一领域reducer/浏览器测试标NOT_RUN。作者报告JSON放包目录之外，避免上次额外VALIDATION_REPORT.json违反十文件约束。

manifest authoring.producer=ChatGPT、reviewStatus=pending、实际制作时间；其余九JSON用真实UTF-8字节计算bytes/SHA（无BOM、换行固定）。真实文件hash不编造。输出可下载ZIP，保留原提供素材不变；不要自行ready/accepted。

本任务是**统一产品和内容**，不是把旧OUD/PERLA脚本贴到SERENITY图片上，也不是让10秒视频伪装15秒成片。请直接制作完整更新包；普通创意细节自行决定，需要的原始资料不在附件时明确缺项。
