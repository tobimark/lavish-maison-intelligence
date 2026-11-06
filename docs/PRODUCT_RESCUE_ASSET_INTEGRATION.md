# Lavish Product Rescue + Provided Asset Integration

> 产品主线最新要求：按`docs/CONNECTED_MARKETING_FLOW.md`将热点、产品推荐、创意演进及社媒视频帖/模拟发布串在同一案例中。保留本文件素材事实、版本隔离与已验收组件；主链终点由下载/模拟邮件扩展为社媒预览和真实可操作的模拟发布，工程增量见`docs/SOCIAL_MOCK_CONTRACT.md`和FLOW任务。

> 首页最新用户修正：产品原图identity → 营销主视觉Hero → 视频预览，表达创意演进；三阶段统一展示框、等高对齐，原素材比例保留。用途介绍优先，不能让素材接入报告占据首屏。实施规格见`tasks/assets/AS-004-HOME-CORRECTION.md`，覆盖下方冲突的首页陈列要求；此叙事不等于真实生成链路，未宣称修复或视觉通过。

2026-11-05主控产品方案。用户已选择：**以SERENITY统一Scent Layering案例，另补相符脚本**。本次只做素材接收/核对、最小映射与任务规格；未大规模改写业务页面、未宣称六工作区或新素材产品页已经验收。

## 1. 产品重组

上一已验收版本的障碍是Scenario入口、Run解锁、默认长表单、禁用的Radar/Atelier导航，以及正常页面未完整展示analysis中的理由。上一轮IP规格已经定义自由探索；本轮发现IP-BATCH-DSH报告和六路由页面/查询代码已存在，报告称已提交review，本轮未对该批作主控产品验收。资产方案在其基础上加入可见成果，合并为一个交付批次，不推翻MockApi、IndexedDB、版本和ZIP，也不覆盖已提交实现。

产品首屏表达：**Review a complete marketing concept for Lavish — from opportunity to ready-to-download creative assets.** 页面默认先看到概念/产品/成果，再按需查看证据和编辑。唯一一级导航仍是Overview、Intelligence Radar、Opportunities、Creative Atelier、Creative Library、Deliverables；Campaign Brief是独立可分享详情页，不增加重复一级菜单。

主路径：Overview的SERENITY主视觉和Explore concept → Scent Layering机会/推荐依据 → View campaign brief → Creative Atelier（双语预览/静态分镜/产品identity/Final Video Preview）→ Deliverables（真实内容包/原MP4下载）。任一步均可用侧栏自由离开；浏览和预览不写业务状态，编辑/确认沿用现有机制。Evidence/Activity/模拟邮件是次级展开，不占主画面。

## 2. 实际收到的素材与核对结果

三文件已原样复制到`assets/provided/scent-layering/1.0.0/`，真实字节/SHA及来源见`evidence/brand/provided-serenity-assets-receipt.json`。只读播放探测代码/报告在`evidence/poc/provided-assets/`。

| 素材 | 已核对属性 | 用途 |
|---|---|---|
| hero-serenity.png | 2560×1440 PNG，瓶身标SERENITY；2,513,070 bytes | Featured Opportunity / 详情Hero / creative封面 / deliverable封面 |
| product-serenity.png | 2000×2000 PNG，白底SERENITY完整瓶身；538,290 bytes | 标准产品identity / Brief / 四镜头参考 / 原始资产下载 |
| final-preview.mp4 | **10.08s、720×960、3:4、24fps，H.264 High/yuv420p、AAC**；1,315,394 bytes | 已提供的最终视觉预览、单独视频下载、内容包附件 |

浏览器独立素材探测实际读取到10.08s/720×960，静音播放时间推进、无media.error，支持Range的本地服务上seek到7.56s通过；241视频帧可解码，抽样帧显示SERENITY近景/运镜。**这只是文件可播放检查，不是新产品播放器/控件/整站视觉验收。** 音轨存在，未做听音/上游授权审查；默认不自动播放声音。

文件含AIGC元数据；上游工具/制作方式未独立确认。不称实拍、官方广告或本POC生成。用户提供用于内部Demo的授权范围已登记，不推导公开广告发布授权。

官网SERENITY身份已核实：SKU `6290360533636 / 100014`，描述提及citrus/floral/musk；容量未核实不填。来源：https://lavishperfumes.com/product/serenity/ 。场景摆件/木枝不等于配方、原料或产地证明。

## 3. 产品/脚本一致性裁决

旧A包1.0.0是OUD+PERLA，不能只换图就叫SERENITY Campaign。旧包/旧派生稿/旧导出保留为历史，不把原ID重新指向另一产品。新A内容目标为`scn-scent-layering`版本**1.1.0**，主Brief可保留逻辑ID`scn-scent-layering.brief.main`，新商品ID`scn-scent-layering.product.serenity`，新脚本ID如en-v2/ar-v2。推荐理由、Brief、双语脚本、分镜、字幕、附件及expected必须同步更新。

营销内容继续由**网页端ChatGPT**制作，具体Prompt和资料包已另备；DSH不得自行把OUD/PERLA全局字符串替换为SERENITY或编新故事。将“Scent Layering”解释为SERENITY香气层次/视觉叙事的创意方向，不声称与另款叠喷的经验证效果，不沿用“Oud meets...”文案或推断木枝=沉香。

**时长兼容策略**：被冻结核心Schema要求15秒、四镜头ScriptVersion/VideoEntry，现有编辑/确认机制以此为基础。本轮保留该概念脚本机制；用户提供的10.08秒短片作为独立Provided preview，不塞进要求15秒的原VideoEntry，不挂原15秒EN/AR VTT、不声称逐帧对应或随编辑重新生成。网页内容作者可额外交10.08秒视觉说明/分段对应表，必须标真实观察与创意建议；它不是假造另一个成片。

页面可写`15-second campaign script`和`Provided video preview · 10s`；播放器固定披露`Provided demo asset · Not generated live in this POC`。这保留真实产品身份与文件事实，不要求二次生成/拉伸/补帧。原完整15秒生成/视频工作流仍deferred；**接入和播放已提供短片已进入当前范围**。

## 4. 最小扩展：集中UI sidecar

不在冻结十JSON加未知字段。使用单一`design/presentation-assets/scent-layering.json`，发布副本由DSH放`public/presentation-assets/scent-layering.json`。机器类型为主控`api/provided-asset-contract.ts`。

顶层mappingVersion/id、scenarioId/target scenarioVersion/campaignId、contentStatus、真实product身份与assets[]。每项字段：`id/type/label/roles/uri/mimeType/bytes/sha256/productId/visibility/source/rightsScope/metadata`；metadata含实测宽高/时长/fps/codec、poster引用、scriptBinding和披露。示意：

```json
{
  "id": "provided.scent-layering.final-preview",
  "type": "final_preview_video",
  "roles": ["final_preview", "deliverable_asset"],
  "uri": "/provided-assets/scent-layering/1.0.0/final-preview.mp4",
  "productId": "scn-scent-layering.product.serenity",
  "metadata": {
    "durationMs": 10080,
    "width": 720,
    "height": 960,
    "scriptBinding": "independent_provided_preview"
  }
}
```

上面只解释关键字段；完整记录和真实hash已在实际sidecar，不从示例生成残缺记录。hero/product_original/video分别具有hero、product_identity/storyboard_source、final_preview/deliverable_asset角色。同文件供所有页面读取，组件只取MockApi的资产对象，不各自硬编码URL。

sidecar当前`contentStatus=awaiting_serenity_content`且指向新A 1.1.0。收新包、品牌/引用检查通过后才绑定为bound。**不能把SERENITY图/视频偷偷映射到旧OUD/PERLA包**。B/C无此assetSet时不显示空视频入口/Download video，不因此锁页面。

`getProvidedAssets(campaignId,scenarioVersion)`是只读；`getProvidedAssetDownload`按实际文件字节/hash下载。普通预置内容浏览仍不建session。新listLibraryItems返回脚本/分镜与三类Provided资产的判别联合，资产version=null，不伪造scriptVersion；新CampaignVersionRef显式带scenarioVersion。旧ProductMockApi/CreativeItem/ProductVersionRef保持兼容，所有增量签名在provided-asset-contract.ts，未来通过同一MockApi门面实现。原VideoEntry/replay guard不改。

## 5. 页面级改动

| 页面 | 主展示/增加 | 删除或降级 | 次级内容 |
|---|---|---|---|
| Overview `/` | SERENITY 16:9 Hero、Featured Scent Layering、一句话价值、Explore concept；列出Brief/EN-AR/Storyboard/Video/Pack | 场景ID/版本和Layout preview入口；大段无MP4说明 | B/C机会入口、真实近期导出 |
| Radar `/radar` | 推荐结论/产品/创意方向在上；真实可用来源筛选、预置信号/趋势 | 不以raw事件日志开场、不要求Run | Supporting evidence默认折叠，Agent Activity次级抽屉 |
| Opportunities `/opportunities`及详情 | 三机会价值/产品/实际成果类型；A Hero+推荐依据；View campaign brief | 任意评分/虚构实时热度；模板式技术卡 | 假设/不确定性及证据 |
| Brief `/campaigns/[campaignId]/brief` | name/core idea/audience/product focus/creative angle/tone/channels/languages/Why Lavish；SERENITY白底identity | 只显示Brief名称或默认全字段编辑 | Hero作视觉补充，事实来源按需 |
| Atelier `/atelier` | 结果优先；Script EN/AR预览、四镜头、identity panel、真实Final Video Preview | 大编辑表单、默认毫秒/asset ID、假渲染进度 | Edit Script按需；高级时码、版本/匹配说明 |
| Library `/library` | 场景/Campaign及类型筛选；脚本/分镜/Hero/白底原图/实际视频 | 空视频类目、Soon、虚假图片生成入口 | 版本来源/详情、Open in Atelier |
| Deliverables `/deliverables` | 内容清单、EN/AR选定版本、Hero/产品原图/Provided MP4；Download content pack / Download video | 发送日志占据主屏；把普通导出绑到邮件 | Simulated handoff/email记录折叠 |

## 6. 图片/视频视觉规则

Hero可在横向容器内responsive呈现，裁图位置保护瓶身标签和主要主体；白底identity图始终contain，不用氛围图冒充产品原图。不得改画标签或瓶身比例。Serenity原图是该商品identity，旧OUD/PERLA仍各自保持原图。

视频按**3:4**真实比例contain，desktop建议不超过约480–560px高，原生controls/playsInline/preload=metadata、不autoplay。Poster可引用Hero，但标内部posterRole=hero_reference，不声称影片帧/官方封面。图片损坏/视频读取失败显示实际错误与Retry，不展示假播放成功。关闭或切Campaign时暂停旧播放器。

保持HTML暖白/黑/金设计语言、正文可读、克制信息量。统一Mock主标识加素材局部Provided标签；不需要每块都堆长技术免责声明。原图/视频来源不能被误写成系统新生成。

## 7. 导出扩展

新增`exportCampaignPack`，复用现有版本解析/ZIP writer/hash/IndexedDB导出历史。Scent Layering默认让用户明确选择EN+AR脚本版本（展示实际版本名）；可导出单版本但不能假称双语都在包里。

完整包含Brief、实际选定EN/AR脚本及各自15秒概念字幕、四镜头静态HTML/真实引用图、Hero、SERENITY原图、**原字节MP4**、README及EXPORT.json。写清provided视频10.08s独立预览，不称由所选脚本实时生成/自动同步。没有对齐的10秒字幕就不往视频挂轨；包内概念字幕文件名和说明标清用途。

新CampaignPackRecord的noVideo按实际条目计算，记录includedVersions/providedAssetSetId/providedAssetIds及准确文件manifest/归档hash；它与旧ProductExportRecord判别区分，旧脚本文案包noVideo=true继续有效。用listCampaignPackExports/getCampaignPackExport/markCampaignPackExportTriggered管理新包，复用原productExports存储并兼容旧记录类型，不新增后台。B/C无MP4仍可导出各自脚本成果。历史重新下载必须是原字节，不能用当前资产/脚本重建覆盖。

独立Download video走真实Blob/download文件，不调用旧视频executeStage或模拟邮件，不记假delivery成功。模拟邮件保持已验收脚本文案交付模式，若本轮不增加视频附件就准确注明，不混淆两类包。

## 8. 任务与验收

现有IP-001–009继续作为基础导航/业务重组，资产增量AS-001–006见`tasks/assets/INDEX.md`，统一执行入口FAST_06。AS-001及IP基础可立即进行，页面/查询可并行推进；A的最终SERENITY内容绑定等网页包，不要求为它停住B/C和导航。

最终必须实际通过：六菜单冷进入/自由切换；首页一眼看懂用途+成果；A整条概念/Brief/双语/四镜头/白底identity/视频/下载；播放器实际play/pause/seek/重播、真实尺寸、无错误；content ZIP和MP4字节/hash；跨页对象/版本、保存刷新/脏稿/回放隔离。No Dead Controls原88行继续执行并追加媒体/Brief控件，新规格表不等于已测试通过。

本轮素材独立检查通过；主站截图、主站视频播放器交互、SERENITY新内容和最终产品验收均尚未完成。不为视频时长不同要求二次生成，也不按旧完整15秒Schema伪标PASS。
