# Scenario / Scene Data Contract v1.0

Scene 与 Scenario 在本项目指同一个演示场景；不是视频 shot。机器结构唯一源：`contracts/poc/scenario.schema.json`，包内每个文件的入口位于 `contracts/poc/files/*.schema.json`。Schema 不承担引用、流程、媒体解码验证，附加规则见本文与校验规范。

## 标识、文件与版本

- 三个固定 scenarioId：`scn-scent-layering`、`scn-luxury-gifting`、`scn-oud-storytelling`。
- scenarioVersion 为语义版本，schemaVersion 固定 `1.0.0`；包不可原位修改，内容变更发布新 scenarioVersion。ID 在同版本包中全局唯一，格式 `<scenarioId>.<kind>.<key>`；跨版本相同逻辑实体可保留 ID，但版本化脚本必须新 ID。
- 全部文件根含 schemaVersion、scenarioId、scenarioVersion。只有 manifest 没有 data；其他文件以 data 承载指定对象/数组。禁止无定义字段。示例 ID 只是语法说明，不是业务内容。
- 引用采用 ID 字符串，必须解析到同场景同版本的指定类型；列表不能重复。客户端不能靠标题、数组下标或文件名猜关系。
- 现实 UTC 时间为 ISO8601 Z；市场地区 `UAE/Dubai/Abu Dhabi/GCC`，UI 时区 `Asia/Dubai`；媒体与回放均整数毫秒。演示虚拟时间与历史 createdAt 分开。
- 数值序列及分析均 Mock；不得将模拟峰值作为真实市场结论。authoring 记录 producer=ChatGPT、推演方法、assumptions、limitations、reviewStatus。reviewStatus 只有主控内容审查可从 pending 改 reviewed。

## 每个场景必须交付十个 JSON 文件

目录 `scenarios/<slug>/<version>/`；媒体发布到 `apps/web/public/scenario-media/<slug>/<version>/`。

| 文件 / bundle 属性 | 必需内容及关联 |
|---|---|
| manifest.json / manifest | title、slug、mode=mock、timeZone、locales、四步顺序、entryBriefId、entryScriptVersionId、entryVideoId、entryDeliveryId、authoring、九个其余 JSON 的路径/字节数/SHA-256；完整包才可 assembly |
| brand.json / brand | 唯一 Brand：名称固定 Lavish Perfumes、logoAssetId、tone/rules/prohibitedClaims；products[]：官方名称、SKU、事实来源 URL、verifiedFacts、imageAssetIds。营销假设不得写入产品事实 |
| discovery.json / discovery | evidence[]、signals[]、trends[]；证据 sourceType=MOCK、模拟平台、摘要、说明；信号引用证据；趋势引用信号及有序 points、单位、方向、窗口；无业务依据的“增长百分比”不接受 |
| analysis.json / analysis | analyses[]：trendIds/evidenceIds、insights、rationale、assumptions、uncertainties、recommendation；briefs[]：analysisId、产品、目标、市场/受众、概念、渠道、语言、CTA、核心信息。此期不强制评分/KPI |
| script.json / script | versions[]：briefId、version、language、title、hook、message、CTA、durationMs=15000、4个 shots；每镜 start/duration、visual、voiceover、onScreenText、transition、assetIds；caption/hashtags、完整 timed subtitles；EN/AR 是不同版本 ID |
| video.json / video | videos[]：scriptVersionId、storyboardShotIds、mp4AssetId、posterAssetId、subtitleAssetIds、durationMs、width/height、frameRate、productionMode=preproduced、disclosure；必须与脚本版本一一明确对应 |
| delivery.json / delivery | recipients[]（演示身份与 .invalid 邮箱）、plans[]（scriptVersionId/videoId/recipientIds/attachmentAssetIds、subject/body、channel=email、scheduledVirtualMs）、records[]（预置模拟回执、outcome/attempt/virtualTimeMs/failureCode）。用户实际点击另存运行记录 |
| events.json / events | events[] 类型化 AgentEvent，带全包连续 sequence、有序 atMs、stage、runKey、inputRefs、outputRefs、type-specific payload，详见事件协议 |
| assets.json / assets | assets[] 真实文件清单：ID、kind、mimeType、同源 uri、文件 bytes/sha256、尺寸/时长、来源与权利、productIds。不可用临时占位图/虚假 URL 通过验收 |
| expected.json / expected | checkpoints[]：cursorSequence、四步状态、visibleEntityIds、activeScriptVersionId、activeVideoId、deliveryRecordIds；reducer 独立对照的期望投影，不是页面直接读取的结果 |

每个文件细分字段、enum、required、最小集合在 Schema 中明确。分析不新增第二套 Opportunity/Campaign 模型，Brief 就是此次 POC 的业务交接对象，避免旧全系统模型膨胀。

## 关键关系与约束

`Evidence ← Signal ← Trend ← Analysis ← Brief ← ScriptVersion ← Video ← DeliveryPlan ← DeliveryRecord`；Brand/Product/Asset 与这条主链共享场景。manifest 的四个 entry ID 必须沿此链匹配；脚本 briefId 与选定 Brief 一致，delivery 的脚本必须是 video 绑定版本，附件含其 MP4。

一个版本可对应多个语言/格式视频，但每个 Video 精确绑定一个 ScriptVersion。v1 要求至少 EN 和 AR 脚本文案，至少 entryScript 的一个真实 15 秒、1080×1920、9:16、四镜头 MP4；没有对应 AR 成片时 AR 脚本可读可编辑但不能进入视频/交付。不得自动给另一个语言的视频改标签。

用户编辑只创建 session 内 `usr.<sessionId>.<kind>.<counter>` 派生版本，保存 parentVersionId、revision、content、createdAt。不可覆盖包内脚本。编辑结果没有匹配预置 Video 时显示“此版本暂无对应预置视频”，禁止自动渲染与交付；可明确选择回原始脚本继续黄金路径，派生稿仍保留。

派生版本另存sourceScriptVersionId（最初包内脚本ID），content是ScriptEditable而非再次声明包内实体：content.shots中的原shot.id及subtitle.id是来源锚点，只在该版本内部解析，不重新加入全包实体ID索引。v1只能编辑既有4镜头及既有字幕条目，保留这些来源ID/次序，不允许通过保存稿件新增/删除镜头或字幕条目；需新增内容结构由后续契约升级。counter在会话内按kind单调分配并与保存原子提交，重试不能换新ID。

packageHash = SHA-256(manifest.json实际UTF-8字节)，manifest绑定其余九文件的实际字节/hash，assets.json再绑定媒体hash；因此包指纹覆盖内容和资产，不包含自身hash循环。JSON使用UTF-8无BOM，结尾换行固定；任何重排/改写后重新计算hash并发布新版本。

收件人仅使用 `.invalid` 保留域；用户修改模拟地址也仅接受此域，不建立真实地址簿。交付正文、Subject、回执与导出日志均显式 Simulated。资产路径不来自收件表单或用户输入。

## 校验程序契约

DeepSeek POC-001 实现 `scripts/poc/validate-scenario.mjs`，采用标准 JSON Schema 2020-12 validator；不自写残缺 Schema 解释器。入口命令：

```powershell
node scripts/poc/validate-scenario.mjs --dir scenarios/scent-layering/1.0.0 --strict --report evidence/poc/scenario-a-validation.json
node scripts/poc/validate-scenario.mjs --catalog scenarios/catalog.json --strict --report evidence/poc/catalog-validation.json
```

上述是待实现命令，不表示当前已有验证器或完整数据。分五层：L1 文件清单/JSON/schema；L2 ID/typed refs/同版本/entry关系；L3 时间线/状态机/脚本时长/预期 checkpoints；L4 路径安全/文件bytes/hash；L5 实际浏览器 HTTP 与媒体解码/seek/download（POC-002）。只有五层全通过且内容 reviewed 才能进入 runnable catalog。

实现次序：POC-001先完成L1/L2/L4、L3静态顺序/时码/guard检查；L3中checkpoint实际投影比对必须调用POC-003/005的同一领域reducer，接入前该层仍NOT_RUN。POC-006内容接收依赖POC-005，避免尚未验证确定性就把场景标ready。L5由POC-002生成报告，最终装配必须核对两报告的scenarioVersion/packageHash一致，不能把旧包媒体PASS套给新包。

必须拒绝：文件漏项/多余未登记 JSON、坏哈希、重复 ID、悬空或跨类型/跨场景引用、版本不一致、事件乱序/重复/不可达、脚本镜头空洞/重叠/总长错误、不匹配交付附件、未来结果提前泄漏、非法状态跳转、非 .invalid 收件人、外链/越界路径、不存在或解码失败 MP4、权利未确认、TEST_ONLY 内容进入生产 catalog。

report 固定 `{schemaVersion, checkedAt, scope, scenarioId, scenarioVersion, packageHash, layers:[{name,status}], errors:[{code,file,jsonPointer,message}], warnings:[], runnable}`；status 为 pass/fail/not_run；runnable 只有五层 pass 且内容审查通过才 true。exit 0=请求层全部通过，1=验证失败或strict要求层未执行，2=用法/IO/环境错误。缺包/没有待验证包不能以“0 个通过”伪装成功。低层 pass 不等于场景 ready。默认strict校验L1-L4；显式`--media-report <path>`合并L5报告后可判runnable，无该参数始终runnable=false。内容接收的报告必须最终追加此参数复跑。
