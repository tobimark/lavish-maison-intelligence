# SERENITY · 15秒概念脚本 vs 已提供10.08秒预览视频

## 两个不同的交付对象
| 对象 | 时间、画幅 | 现状 | 可作何用途 |
|---|---|---|---|
| 冻结核心 `video.json` `scn-scent-layering.video.en-v2` | **15000ms、1080×1920、9:16、30fps为目标** | 只有四镜头脚本、VTT和规划中的媒体条目，**MP4与poster不存在** | 后续单独制作/审核时的方案；当前不可播放或声称已完成 |
| Provided preview，sidecar `provided.scent-layering.final-preview` | **10080ms、720×960、3:4、24fps，H.264/yuv420p，AAC轨道** | 用户已提供真实文件；此包原字节保留；上游制作方式未确认 | 首页、Creative Atelier 和 Deliverables 的**独立已有创意预览**，独立下载，不伪称按15秒脚本生成 |

- 核心 `video.json` 的 15s 概念媒体位与 sidecar 中的 Provided preview **不能互相替代**。
- EN/AR VTT 是新15秒概念脚本字幕，不作为10.08秒视频字幕轨；没有经核对的该片字幕文件。
- 不对10.08秒文件做裁切、拉伸、改帧、补帧或转码；也不把3:4标为9:16。
- 如现有 UI 曾显示“Video deferred”，可以改为“Provided preview available · 10.08s”，同时保持“15-second planned concept film not produced”。

## 只读观察基础
附件提供 nine sampled frames：`frame-0000.png, frame-0030.png, …, frame-0240.png`（0、30、60……240帧）。另有输入视频的 `video-probe.json`、`browser-probe.json` 和 `ffmpeg-input-info.txt`。我查看了这些抽样帧拼图，未逐帧审看全片，也未听取音轨。

观察到：
- 初期抽样帧呈暖琥珀灯光、石板/岩块、枝条与单支 SERENITY 香水瓶。
- 中段抽样帧放大瓶身和印有 `Serenity / LAVISH` 的黑色圆形标签，产品细节成为视觉焦点。
- 后段抽样帧又回到较宽的 SERENITY 单品环境构图；背景与道具保持相近。
- 这些观察只能支持**近景/广景的视觉运动与单品氛围**，不能证明有四个清晰分镜切点、正式脚本文案、真人拍摄、具体调香原料或来源国家。
- AAC 音频轨道存在的事实不代表音轨内容已听审；不声称配乐、旁白或版权已验证。

## 四个可以向营销人员解释的叙事 Beat（概念性，不是影片剪辑时码）
1. **Atmosphere / 起意**：暖色光、自然质感的搭景建立安静奢华的视觉调性。
2. **Identity / 识别**：镜头将注意力转向 SERENITY 瓶身和标签。
3. **Detail / 细节**：特写突出瓶身光影及品牌字标，并没有展示可验证的香调物质。
4. **Signature / 回归**：构图回到单支产品与静物环境，形成清楚的单品记忆。

以上四个 Beat 只是基于选取画帧的**叙事阅读方式**，不是声称影片剪出了四镜头或对应 `script.json` 的 0–3.2s、3.2–7.0s 等新概念时码。

## 展示建议
- Creative Studio 同时展示：**15s Proposed Script (EN/AR)** 与 **10.08s Provided Video Preview (independent)**，不可合并标题。
- 播放器以实测3:4 `object-fit:contain` 呈现；不自动放音，不添加不匹配的 VTT。
- 使用已提供 HERO 作为静态封面时标记是 Campaign hero reference，不宣称视频帧截屏或官方 poster。
- Deliverables 可以分别提供真实 MP4/HERO/白底原图下载，以及独立的15s脚本/字幕；README 明确二者并非严格匹配。
- 当前不能把 `video.available` 的未来回放预设事件当作实际15秒成片已渲染。所有 delivery.records 也是完全模拟的未来示例。

## 源文件原字节验证
- `provided-assets/scent-layering/1.0.0/final-preview.mp4` = 1,315,394 bytes，SHA-256 `15d3756a0e93f591fc767998d84911ed425e3394554272f62120d61f0e31e10e`
- `provided-assets/scent-layering/1.0.0/hero-serenity.png` = 2,513,070 bytes，SHA-256 `1c4e337ba0bed4c2fab0da2cd7fd2fa8d3e8929015923ba23c8353caa0b37499`
- `provided-assets/scent-layering/1.0.0/product-serenity.png` = 538,290 bytes，SHA-256 `f75fa10b2d4fc33df4beb6391895bb8c60cfafc1091de28b1f49f7e9d026af62`
