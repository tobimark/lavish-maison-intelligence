> 2026-11-05素材范围更新：用户已提供SERENITY Hero/白底原图/10.08秒MP4，并确认以SERENITY统一A案例、另补相符脚本。以docs/PRODUCT_RESCUE_ASSET_INTEGRATION.md和FAST_06为最新增量；本轮不制作视频，但允许真实提供素材预览/下载。冻结15秒核心Schema保持，Provided片走独立sidecar/API，不伪称匹配成片。

# Interactive Product · 增量数据/API契约

主控2026-11-05。实现类型源：`apps/web/demo/poc/api/product-contract.ts`。这是对同一个MockApi的增量，不另建一套页面私有业务store，不更改冻结场景Schema/JSON。类型未实现不代表当前功能存在。

## 只读业务视图

Opportunity主键=已有`analysis.id`；Campaign主键=已有`brief.id`。以brief.analysisId和manifest entry链关联，不创建第二套持久化Opportunity/Campaign，不按标题猜关系。当前每包一个主analysis/brief，共三机会/三Campaign。品牌/产品/真实图片来自brand/assets；不虚构效果或评分。

查询集中在MockApi中：`getOverview/listSignals/getSignal/listOpportunities/getOpportunity/listCampaigns/getCampaign/listCreativeAssets/getCreativeAsset/listDeliverables/getAgentActivity`，签名见类型源。都复用同一ScenarioSource、packageHash、现有Session/用户版本；既可无编辑会话读取预置内容，也可读取保存版本。返回ApiResult，未知ID为NOT_FOUND、包版本变动PACKAGE_CHANGED，不静默改选A。

所有读方法不调用createSession/executeStage/selectScript/confirm，也不写history、receipt、exports、delivery；允许初始化IndexedDB连接/读取缓存。页面只通过MockApi，不能import public JSON或直接读IndexedDB。当前`getScenario`含原始contentPackage，可由API内部复用，不需要到页面重复解析业务链。

筛选规则：campaignId限定该Brief所属包及关联对象；source限定该signal证据platform标准化后的来源；topic为原signal.topic；query大小写不敏感匹配可见标题/摘要；language/origin/kind按实际字段过滤。组合条件AND，无匹配返回空集合而不是取消筛选。可用筛选值从真实数据提取，`other`仅在确有未知platform时出现。Instagram/TikTok/Pinterest/YouTube的标准化是UI映射，不改Evidence文本。搜索/筛选不写业务状态。

OpportunityView正常阅读页必须展示analysis.insights、rationale、recommendation、assumptions、uncertainties及其证据/趋势引用，以及Brief目标/市场/受众/产品/渠道/关键消息。不能再仅展示brief三字段就称分析完成。

只读版本引用为`{campaignId,versionId,sessionId}`：preset sessionId=null；用户保存版本必须有真实owner sessionId且属于同Campaign/同packageHash。versionId不得来自别场景，不能靠最后一段ID查找。Library可汇总同Campaign下全部有效内容会话的保存版本；活动回放会话不加入工作稿来源。旧NV内容会话保留可读，不删除其用户稿。

`origin=preset|saved`和`confirmation=unconfirmed|confirmed_current`独立。confirmed_current仅依据对应工作会话activeScriptVersionId且analysis completed；不是authoring.reviewStatus，也不声称Lavish批准。未保存editor draft不进入API列表。已导出状态来自独立export记录，不能从下载按钮可见推导。

## 显式编辑上下文

`beginCampaignEdit({campaignId,versionId,sessionId,idempotencyKey})`是明确写命令，只在用户点击Edit/Use as working version或Confirm selected script时调用。它：

1. 验证当前content_only包、Campaign和所选版本所属关系；不接受原视频profile或不存在版本。
2. 如果是用户版本，使用其owner session；如果是preset，先使用已绑定的该Campaign工作session；无绑定时可选择现有同包有效内容session（updatedAt降序、id字典序打破平局），避免丢弃NV既有工作；仍无则createSession。任何候选都排除activity会话。绑定发生在此显式命令内，浏览不绑定。
3. 在需要时用既有executeStage(discovery/analysis)装载已准备内容，再用selectScript选用户指定版本；已经准备好的不重放/重建。不得自动confirm或调用video/delivery。对客户反馈“Script ready to edit”，不显示假采集/假推理等待过程。
4. 返回**最新**getSession结果；现有createSession的创建receipt会返回原创建响应，复用时不得拿旧revision继续写。幂等/并发使用既有机制，普通重复点击不产生两套工作稿。
5. 若切换工作版本撤销旧确认，UI在显式动作旁说明；仅preview版本切换完全不触发此命令。Save/Confirm继续用现有expectedRevision/idempotencyKey命令，不改领域guard或伪造completed。

未保存稿优先使用现有编辑state/ref恢复修复。全站Link/菜单切换也触发Save/Discard/Cancel离开保护；Cancel留在原页，Discard仅丢未保存编辑，Save成功后再导航。浏览器刷新用beforeunload保护，不假称未保存稿已持久化。确认/保存失败保留编辑并给定位/重试。

## 存储增量与跨页面同步

复用`lavish-poc-content-v1`、PocStorage、MemoryStorage/IndexedDbStorage和旧Session数据。允许DB version从1升2，仅增加`workspaceLinks`和`productExports`两store，保留原store/记录/receipts。

- workspaceLinks键`campaignId@packageHash`，值`{campaignId,packageHash,sessionId}`；仅显式编辑/确认建立或切换绑定。只读默认选择可以计算，不写DB。
- productExports键exportId，内部值`{record:ProductExportRecord,download:DownloadResult}`，保留准确ZIP字节与不可变快照。列表API不返回所有大字节；getProductExport按ID读。当前规模三场景，无后台/队列/过度缓存层。
- Activity会话在创建时加可选存储字段`purpose:'activity'`；新工作会话purpose='editing'，旧缺字段按legacy内容session处理。只影响应用存储类型，不改包Schema；保留原版本检查/恢复导出。

mutation成功后在同一客户端统一invalidate相关ProductQueries，不复制一套跨页面业务数据。保存Atelier版本后Library/Deliverables能看见；刷新从真实IndexedDB恢复；普通页面URL/筛选只保存UI上下文。无需本轮实现多用户同步或高并发框架。

## 普通导出：与模拟邮件解耦

`exportScriptPack(ProductVersionRef+idempotencyKey)`：解析精确已存在preset/保存版本，不需confirm、不createSession、不simulateDelivery。写出明确Draft/Confirmed at export的只读快照；`confirmed_current`须与实际当前版本/会话一致。若保存版本已不存在/包变更，不返回其他稿。

ZIP最小固定内容：`brief.json`、`script.json`（含来源/parent/语言/版本、mode=mock）、`subtitles-<language>.vtt`、`storyboard.html`（离线可读四镜头/文本/时码）、该分镜真实引用图片的`media/`、`README.txt`、`EXPORT.json`。没有未知图片或MP4/poster；HTML只作本地静态文档，文本转义、相对媒体路径、安全文件名、不执行用户HTML。不要实时绘图或重画瓶身。

复用现有版本解析/VTT生成/ZIP writer/hash函数，扩展导出构建helper而非再写一套ZIP。EXPORT.json写导出ID、时间、版本引用、确认状态、mode/noVideo/noRealEmail、非自身的附件manifest；避免自身或archive hash循环。最终归档bytes/hash保存在外部ProductExportRecord。包内不写SIMULATED-DELIVERY.json，不伪造邮件回执。

生成并成功保存record+ZIP后返回PreparedProductExport（status=prepared）；UI真实触发下载后`markProductExportTriggered`幂等改为download_triggered。只能说Download started，不能证明用户已保存到磁盘。准备/存储失败不得写“已导出”；重新下载`getProductExport`返回原字节/原版本，不拿当前编辑稿替换历史档案。未保存新稿不导出，提示先Save或选已保存版本。

模拟邮件仍使用既有getContentDelivery/saveContentDeliveryDraft/simulateContentDelivery/exportContentPack；它有自己的attempt/确认/失败重试。未确认脚本须先显式确认，交付脏稿须先保存，保留FIX-NV-BATCH-01修复。该入口在Deliverables的次级抽屉，不是导出必经步骤。

## Activity

`getAgentActivity`不写会话：展示原发现/分析前缀、已有工作历史和已有模拟交付记录，分区明示Preset vs Your actions。事件说明可把固定type映射成人可读动作，不捏造推理结论/平台请求/墙钟耗时。

`openActivityReplay({campaignId,creationKey})`只在第一次点Play/Step/Restart时显式创建独立purpose=activity会话；每个已打开面板复用此会话。复用原replayCommand/advanceReplay前缀，原编辑会话不变。打开抽屉、读取表格无运行；Replay不能写工作确认、导出、邮件attempt。包内未来视频/交付预置事件不在本轮回放范围。

## 必要验证

read-only sweep前后对session revisions/history/active version/confirmation/exports/attempts快照比较，不把筛选URL变化当业务变更。直接访问六页均无需createSession；带ID的分享链接/刷新/返回保持对象。首个写动作才建立编辑上下文，现有未保存保护、保存版本不可变、导出引用正确、Activity不污染工作稿。测试只覆盖这些真实路径和已知缺陷，不另开大型基础设施测试工程。
