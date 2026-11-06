# 视频及素材引用规则 v1.0

所有可运行场景使用同源本地静态文件：URI `/scenario-media/<slug>/<scenarioVersion>/<filename>`。拒绝http(s)外链、data/blob作为包内URI、绝对磁盘路径、反斜杠、`..`、百分号编码绕过、query与fragment。导出时的临时Blob URL只允许由MockApi生成，并在使用后释放。

Asset必须记录：id、kind、mimeType、uri、bytes、sha256、width/height（非图像/视频为null）、durationMs（非音视频为null）、sourceUrl或来源说明、rightsStatus=approved_for_demo、rightsNote、productIds。Logo必须保持已核实原图；产品图不变形，不重绘包装。技术测试素材只能在tests目录，不进入客户场景。

视频：真实MP4容器、浏览器支持的视频编码，v1验收要求H.264、yuv420p，若带音频用AAC；1080×1920、9:16、15000ms（容器探测容差100ms），脚本逻辑总长严格15000ms；4镜头、完整品牌片尾。metadata duration/尺寸应与文件和脚本相符。清单中的frameRate是实际结果而非强制伪填。poster必需，EN/AR字幕文件与对应脚本版本分别关联；AR未有成片不伪造匹配。

不允许直接把reference目录MP4登记为任意场景的广告；只有核对脚本、品牌、素材权限、实看视频并记录匹配依据后才可复用。所有视频卡、模拟渲染进度、下载上下文都显示 Pre-produced / Mock，不展示“模型刚生成”的暗示。

## 媒体验证程序（POC-002）

`node scripts/poc/verify-media.mjs --dir scenarios/scent-layering/1.0.0 --base-url http://127.0.0.1:3100 --report evidence/poc/media-a.json`。

程序先跑文件bytes/hash/MIME签名，再通过 Playwright 检查每个必需URI HTTP200、无重定向外域、loadedmetadata、canplay、至少实际播放一段、seek到镜头点和片尾前、无media.error、封面naturalWidth/Height；验证响应内容而非只发HEAD。ffprobe（本地只读探测工具，不是渲染服务）检查编码/像素格式/时长/尺寸，缺工具标NOT_RUN，不能PASS。PNG/JPEG需实际解码，VTT时码必须在范围内，字幕文本/语言与script一致。

媒体报告使用Scene Data Contract相同report envelope，包含manifest实际packageHash，L1-L4标not_run、L5实际结果。先完成静态验证和媒体探测，再运行validate-scenario加`--media-report`合并，只有包指纹相同且内容reviewed才runnable=true；不能仅按文件名复用旧报告。

POC运行时媒体断网/404/无法解码：展示 Asset unavailable、保持文案与版本，阻止视频完成/交付；不能以模拟进度覆盖实际错误。下载网络错误同理，不创建假的完成日志。

## 下载规则

- MP4/封面：下载真实静态文件字节，filename安全去路径，包含slug/version/scriptVersion/language；核对bytes/hash。未进入该阶段不能绕过API获取下载操作。
- 脚本：当前版本UTF-8 JSON，包括mode=mock、parentVersionId、完整四镜头及时码；支持派生稿导出，不能导出成假MP4。
- 交付包：真实 ZIP，含对应脚本JSON、预置MP4、封面、附件、邮件预览TXT、`SIMULATED-DELIVERY.json`及README明确未发送邮件。打包失败提示错误、不记完成；允许按预算选择浏览器ZIP库，不能修改媒体内容。
- 演示记录：真实JSON，包含包版本/hash、操作日志、模拟交付attempt及Mock声明，不包含秘密/真实邮箱。
- 每个可见Download必须保存真实可打开文件；E2E比较哈希/解压条目，不只断言触发click或出现toast。预置回放可查看文件，但导出记录仍注明preset，不能冒充用户刚发送。
