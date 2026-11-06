# 网页端ChatGPT补充 · 热点到创意到社媒的完整叙事

与原SERENITY A1.1.0更新Prompt一次执行，不另做新场景。仍交完整十JSON与原真实媒体；在场景目录之外另交`presentation/scent-layering/1.1.0/campaign-presentation.json`，严格使用附件`docs/SOCIAL_MOCK_CONTRACT.md`定义结构，不向冻结Schema添加字段。

产品必须讲懂这条关系：发现什么话题→为什么适合SERENITY→用产品原图怎样设计氛围主视觉→怎样构思动态广告→现成视频配什么社媒文案。全部观点/热点明确Mock，不能生成随机占位分析。请让每段都有具体可读结论，而不是“AI analyzing / assets ready”的工程状态。

需要你在sidecar中写：

1. insight：一句热点总结、其意义、准确引用新A的signal/trend/evidence IDs，不制造平台增长率。
2. strategy：SERENITY为何匹配，准确指向新analysis/brief。原OUD/PERLA不能保留为新A主体。
3. creative：原图→主视觉→视频三段说明，每段解释品牌/产品身份保留了什么、视觉表达希望带来什么、动态表现如何延续概念；引用现有Provided资产ID，不声称这些文件由本POC实际生成。使用`relationship=illustrative_workflow_with_provided_assets`。
4. socialPosts：英文和阿拉伯文各一条完整Instagram视频帖，包含caption、CTA、hashtags，语言与实际en-v2/ar-v2引用一致，accountLabel固定“Lavish Perfumes · Demo account”。内容要适用于用户提供的SERENITY视频，不把15秒概念字幕当作10.08秒片的实际音轨/画面。可参考脚本意图，不能声称逐镜头一致。

视频ID=`provided.scent-layering.final-preview`；原图ID=`provided.scent-layering.product-serenity`；主视觉ID=`provided.scent-layering.hero-serenity`。sidecar packageHash必须是本次新manifest真实字节SHA-256。两个社媒preset ID可为`scn-scent-layering.social.instagram.en-v1`和`.ar-v1`，不能与原脚本ID混用。

已有10.08秒720×960/3:4片作为Provided preview，核心15秒脚本保留概念稿；不改片、不要求新片，不为真实Instagram投放做规格/权限保证，不生成虚假平台发布结果。运行时模拟发布记录由应用用户操作产生，不预填已发送成功。

请同一ZIP同时交SERENITY A1.1.0、独立presentation sidecar、CONTENT_REASONING及原Prompt要求的审稿/字幕/缺项说明。素材文件实际hash引用，输出作者资料不是ready/accepted。不要让DSH再凭空补热点结论、创意解释或社媒正文。
