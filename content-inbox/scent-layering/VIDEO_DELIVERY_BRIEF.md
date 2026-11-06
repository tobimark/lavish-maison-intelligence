# Lavish · Scent Layering · 英文成片交付说明

用途：Fully Mocked POC 的预制广告示例。用户后续提供 MP4；本说明不代表视频已存在，也不触发实时生成。对应 `scn-scent-layering.script.en-v1`、`scn-scent-layering.video.en-v1`。

**15秒 / 1080×1920 / 9:16 / H.264 MP4 / 30fps。** 建议 yuv420p 与 faststart 便于浏览器播放；无旁白、无需音乐，避免引入无关音轨。若提供带音乐版本，请同时说明音轨来源及 Demo 使用范围。不能用变形拉伸填满画面。

## 四镜头与精确文案

| 时间 | 画面 | EN 画面文案及对应字幕 | AR 对照草稿（独立版本，非英文片字幕） |
|---|---|---|---|
| 0.000–3.000s | 两款官方原图在留白中出现，完整保留瓶身；PERLA 包装保留 | One signature. More than one note. | بصمتك العطرية، بطريقتك. |
| 3.000–7.000s | LAVISH OUD 单品特写，保留完整标签；可轻微平移整个原图 | Begin with LAVISH OUD. | ابدأ مع LAVISH OUD. |
| 7.000–11.000s | PERLA 原图为主，再过渡到两款并置；不演示喷洒或混合液体 | Explore a pairing with PERLA 50ML UNISEX. | اكتشف تنسيقاً مع PERLA 50ML UNISEX. |
| 11.000–15.000s | 完整金色方底 Logo 品牌片尾，CTA 独立排版并保持至片尾 | Make it yours. Discover Lavish Perfumes. | اختر بصمتك. اكتشف Lavish Perfumes. |

以 JSON `script.json` 与 `media/signature-en.vtt` 为逐字/时码来源。四镜头起点0/3000/7000/11000ms，时长3000/4000/4000/4000ms。轻切或约180ms交叉淡化包含在每个镜头区间内，不额外增加总时长。

文字导向的片子中 on-screen text 与 VTT 相同属有意设计：成片保留画面文案，播放器默认关闭字幕轨，避免重复显示；需要时可打开 EN 轨。不要把尚未审稿的 AR 字幕附到 EN scriptVersionId，也不要将播放器语言选择解释为已有阿语成片。

## 画面与品牌

- 遵循 `reference/LAVISH_LiveVision_RealVideo_Demo.html`、`docs/DESIGN_SYSTEM.md`：温暖白底、黑色字、克制金色点缀、无衬线排版，大面积留白；不另设蓝紫科技风。
- 文字与商品分区，字体清楚；建议1080输出正文不小于44px，画面文字控制在两三行。左右留白至少80px；核心商品/文字远离竖屏平台顶部180px、底部300px的常见遮挡区。这是本片构图建议，不声称任何平台固定规范。
- 产品图按原比例 contain；不要裁瓶、改标签、抠图重绘、添加未知容量或用其他品牌替代。两瓶并列是图像排版，不宣称物理大小相同。
- Logo 为现有294×294不透明方图，输出建议180–220px完整显示，禁止放大铺屏、重描、裁切或改色。
- 不添加价格、库存、优惠、持香时长、销量、官方叠喷效果保证、文化/产地背书。创意是探索邀请；产品组合未做感官测试。

## 已有真实输入

| 文件 | 来源 | SHA-256 |
|---|---|---|
| `1.0.0/media/lavish-oud.jpg` | https://lavishperfumes.com/product/lavish-oud/ → 原图1-22.jpg；2000×2000 | d23108087a08aa9b90edee8b432b98b85b45eed5e4468464fef4880e328423c3 |
| `1.0.0/media/perla-50ml-unisex.png` | https://lavishperfumes.com/product/perla-50ml-unisex/ → 原图3-30.png；2000×2000 | 5ba6a97c07081ce03c89acd7b7ca4ae701c1ee65e3b5cd4f96c873104830b724 |
| `1.0.0/media/lavish-logo.png` | 用户提供 Logo；294×294 | f504781a6a6bbfd7f0f9a51ac077dc37e54c41dba96060667f38992d136f3966 |

精确来源、字节及使用范围见 `evidence/brand/product-images-receipt.json` 与 `assets.json`；本说明中的原图哈希以 JSON 回执为准。图片仅登记用户授权的内部 Demo 使用，不推导公开广告许可。

## 待交文件

1. `signature-en.mp4`：上述英文四镜头成片。
2. `signature-en-poster.jpg`：1080×1920、来自实际成片的清晰封面；也可由主控在收片后提取。
3. 文件来源、制作方及 Demo 使用说明；有额外素材/音轨时说明其来源。现成广告若与脚本不同，请一并提供，主控可适配场景脚本后重新绑定，不要求为了命名假装匹配。

VTT 已交付，无需另外制作。AR 仅完成脚本/字幕草稿，需本地化审稿；本轮英文主链不要求额外 AR MP4。
