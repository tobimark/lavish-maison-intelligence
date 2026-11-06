# Lavish 品牌与素材登记

截至2026-11-03核验。品牌资料与 Demo 营销假设分离。官网数据页面存在缓存/可用性差异，不硬编码库存、价格、分店数与未经证明的性能宣称。

| ID | 已核验身份 / 来源 | 当前可用性 | 处理 |
|---|---|---|---|
| brand-lavish | [Lavish 官方站](https://lavishperfumes.com/)、[官方介绍](https://lavishperfumes.com/about-us/) | 站点主页本轮直接抓取超时，搜索索引与商品详情可访问 | 品牌名使用 Lavish Perfumes；不宣称有官方 VI |
| product-lavish-oud | [LAVISH OUD](https://lavishperfumes.com/product/lavish-oud/)，SKU 6290360532790 / 101653 | 商品标题、SKU已核对；官方描述涉及 oud/spices/floral | 容量未知留null，不自编香调金字塔、功效和持香时长 |
| product-perla | [PERLA 50ML UNISEX](https://lavishperfumes.com/product/perla-50ml-unisex/)，SKU 6290360532820 / 101691 | 名称/50ml/unisex已核对；描述含 floral/fruity/musk | 可作叠喷创意候选，叠喷效果属于演示建议，不是产品官方事实 |
| product-serenity | [SERENITY](https://lavishperfumes.com/product/serenity/)，SKU 6290360533636 / 100014；简要描述涉及citrus/floral/musk | 2026-11-05用户提供Hero、白底identity和现成短片；两图标签均SERENITY，视频抽样帧同产品；原图尺寸/哈希和浏览器播放见新增receipt | 用户确认以SERENITY统一新A1.1.0，内容待网页端更新；不把旧OUD/PERLA脚本直接换图；容量未知，摆件不作配方依据 |
| logo-reference | reference/manifest.json 外链 App 宽图 | 浏览器成功读取1200×630；App Store落地页本轮404 | 仅视觉参考，不能当正式 Logo；禁止从宽图截图重做标志 |
| logo-approved | 用户 2026-11-03 会话直接提供的正式 Logo：PNG 294×294、8-bit RGB（无透明通道）、金色渐变方底、黑字（阿语字标 + LAVISH / PERFUMES） | 已入库 [assets/brand/lavish-logo-primary-294x294-rgb.png](../assets/brand/lavish-logo-primary-294x294-rgb.png)（114,691 B，sha256 f50478…3966）；回执 [evidence/brand/logo-receipt.json](../evidence/brand/logo-receipt.json) | rightsStatus=approved（内部演示；对外发布前需客户书面授权与透明/矢量母版）。保留完整比例与留白，禁止重绘/改色/裁切/拉伸/加滤镜；不透明方图仅用于方形位，294px 母版在 2× DPR 下建议显示 ≤147 CSS px |
| product-images | 与上述SKU对应官网原图 | 2026-11-05已下载并实际查看两张2000×2000原图；assets/products/；来源/字节/SHA见evidence/brand/product-images-receipt.json | 用户授权从官网取图用于本Demo；登记内部演示范围，不推导公开广告许可；不替换/重画瓶身 |

2026-11-03 补充：用户（PO/主控）在会话中直接提供正式 Logo 并声明“正式的logo是这个”。该文件为原样复制、非 App 宽图裁切、非重绘；来源指纹与回执见 [evidence/brand/logo-receipt.json](../evidence/brand/logo-receipt.json)。仍缺透明底/反色/矢量母版与品牌 VI 手册，因此不宣称拥有完整 VI；品牌成品验收仍以主控 + PO 对照 DESIGN_SYSTEM 的人工检查为准。`logo-reference`（App 商店宽图）继续仅作视觉参考。

正式素材记录字段：id、brandId/productId、kind、sourceUrl、retrievedAt、sha256、mime、width/height、localPath、rightsStatus(pending/demo_allowed/approved)、rightsEvidence、reviewedBy、altEn/altAr、usageRestrictions。`rightsStatus=approved` 只能有相应证据，不能自动从“官网可访问”推导。

原视频为商场参考录像，不是 Lavish 广告、不进入 Creative 资产库。正式Logo和两款产品图现已本地入库；用户确认广告MP4暂无、之后提供，不能据此宣称品牌视频成品已验收。产品名和营销文案阿语译文需单独审查，不把自行音译当官方产品名。

2026-11-05最新：用户已另提供SERENITY现成MP4和两张图片，见evidence/brand/provided-serenity-assets-receipt.json。文件实际10.08s、720×960、3:4、24fps、H.264/yuv420p+AAC；只作为Provided demo preview，不是旧15秒脚本匹配成片，不是本POC实时生成，也未核实为实拍。素材独立检查通过，产品页/公开投放/音轨审查未因此通过。三文件原样存assets/provided/scent-layering/1.0.0，统一映射design/presentation-assets/scent-layering.json。
