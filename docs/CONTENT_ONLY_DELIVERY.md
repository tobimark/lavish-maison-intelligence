> 2026-11-05最高优先级更新：当前以 docs/INTERACTIVE_MOCK_PRODUCT.md、docs/INTERACTIVE_PRODUCT_API.md、docs/pages/INTERACTIVE_WORKSPACES.md 和 tasks/DSH_HANDOFF_DEMO_FAST_05.md 为准。六工作区可自由探索，Scenario只作数据容器；只读浏览无阶段前置。旧固定四步/唯一Home可用/导出依赖模拟邮件的要求不再用于开发。冻结场景Schema/业务JSON/Tokens不改，视频仍deferred。

# 当前交付范围：暂缓视频，完成内容与前端 Demo

2026-11-05主控裁决，依据用户“现在先放弃视频制作，完成其他工作”。本文件覆盖旧POC_SCOPE、状态/API/页面/任务中的“必须收到MP4才能启动任何工作”要求；旧完整视频能力保留作未来范围。不是放宽为假视频通过，不要求用户现在再提供素材。

## 本轮成果

主页三套场景都能开始/继续。A先打通后复用同一页面接B/C，不同时重做三套页面。展示网页端ChatGPT真实交付的模拟证据、趋势、分析/Brief、EN/AR脚本、商品图和分镜；支持真实编辑/版本保存、刷新恢复、前两步回放、文案包模拟交付/失败重试、真实文件导出与本地演示记录。没有后台服务、实时模型或邮件发送。

四步导航保留：

1. Social Trend Discovery：完整信号/趋势/证据与事件。
2. AI Analysis & Script：完整依据、Brief、双语脚本编辑、保存/选择/确认。
3. Storyboard / Video deferred：四镜头与真实产品图、时码/字幕。永久“视频制作暂缓”标记；无视频播放、渲染进度、MP4/封面下载按钮。可以直接前往文案交付；这不把原video workflow置completed。
4. Content Delivery / Simulated：交付**文案包**，包括当前所选脚本JSON、该稿VTT、邮件TXT、SIMULATED-DELIVERY.json、README；可附实际品牌/产品图，不带不存在MP4/poster。主题/正文/收件信息可编辑，.invalid地址、明确确认、模拟成功/显式失败/重试、只读attempt历史。

Mock标记仍永久显示。文案包的完成不等于影片完成或旧完整四阶段场景ready。用户不必先回到预置EN版本才能交文案包：完整且已确认的EN/AR派生稿均可交，附件必须从所选版本实际生成。

## 输入和接收契约

主控已阅读网页端三套内容并核对实际媒体，本轮批准其用于内部内容Demo；不是AR母语批准或广告视频成片批准。来源：`content-inbox/web-chatgpt-prepared/be3d777ab2e2/<slug>/1.0.0/`。原样归档及旧本地草案不改。十份JSON与来源hash保留，authoring.reviewStatus=pending不由开发者改成reviewed。

完整视频输入仍使用冻结 `contracts/poc/scenario.schema.json`。本轮增加主控维护的 `contracts/poc/content-only.schema.json`，唯一差异：Asset可为原有效资产，或kind=video/poster、bytes=null、sha256=null、rightsStatus=pending的待收资产；其余字段/规则保持。缺失图片/Logo/VTT不享受例外，仍须真实文件/hash。

使用显式 `profile='content_only'` 的loader/catalog和新类型，禁止双重断言或假哈希强转旧ScenarioPackage。新类型从附加Schema生成；领域reducer包参数可扩展为两种输入的结构联合，媒体操作必须区分。`build-content-only-contract.mjs`只生成附加Schema，原Schema和其生成文件不改。

发布到独立 `public/content-scenarios/` 和实际 `public/scenario-media/`；旧完整包catalog仍非ready。新catalog条目结构固定：`{scenarioId,title,scenarioVersion,packageHash,packagePath,profile:'content_only',readiness:'content_ready',mediaStatus:'deferred',reviewRef}`，外层`{schemaVersion:'1.0.0',profile:'content_only',items:[]}`。reviewRef指向本主控裁决；packageHash仍是原manifest真实字节哈希。只发布已接收的十JSON和实际媒体，不复制未知文件/作者工具/辅助JSON进包。

内容接收报告明确`profile=content_only`、`contentRunnable`与`mediaStatus=deferred`，独立列Schema/引用/回放/本地实际媒体检查。旧验证报告中的runnable=false/L5 NOT_RUN继续保留，不能重写为完整媒体PASS。缺文件用能力状态解释，不从Home禁用所有场景。

## API、状态与存储：批准的增量

- 复用既有MockApi、IndexedDB适配、discovery/analysis命令、脚本版本与领域reducer，不在页面写业务状态机/直接读JSON。ScenarioSource/LoadedScenario/SessionView增加显式profile，ScenarioListItem新增content_ready；旧ready只用于完整视频包。
- content_only只允许原workflow执行discovery/analysis；executeStage(video/delivery)及旧视频包simulateDelivery依然拒绝缺媒体。界面第三步以profile能力标记“Deferred”，不新增伪造video.completed事件或改原expected。原workflow.video/delivery的ready/locked/stale不当作文案交付状态。
- 内容回放只使用原events中discovery/analysis的连续前缀（当前三套到sequence16、67000ms），保留原ID/sequence/时间。到此结束/seek限此前缀，文案“情报与脚本回放”。未发生的video/delivery事件不播放、不展示预设交付成功。刷新paused，速度1/2/4×、步进/重播复用既有引擎；不能把回放的script.confirmed当用户确认。
- 为content_only会话增加独立字段`contentDelivery`，仅承担**文案交付**，不重写另一套信号/脚本状态机。形状：`{draft:null|ContentDeliveryDraft,attempts:ContentDeliveryAttempt[],status:'draft'|'awaiting_confirmation'|'running'|'completed'|'failed'}`。新会话初始draft=null、attempts=[]、status=draft。
- ContentDeliveryDraft：`{id,revision,sourcePlanId,scriptVersionId,recipientSnapshot:[{id,displayName,email}],subject,body,attachmentManifest:[{filename,mimeType,bytes,sha256}],confirmedRevision:null|number}`；不含videoId，sourcePlanId只追溯网页预置计划，不把该计划原MP4附件拿来发送。默认收件人来自网页包；默认主题前缀`[SIMULATED · CONTENT ONLY]`，正文是清楚的文案审阅说明，并注明“未附视频、不会真实发送”。允许适配这些工程状态语句，不能重写网页端分析/创意故事。
- ContentDeliveryAttempt：`{id,attempt,draftId,draftRevision,scriptVersionId,recipientSnapshot,subject,body,attachmentManifest,outcome:'simulated_delivered'|'failed',failureCode:null|'delivery_failed',mode:'mock',deliveryKind:'script_pack',createdAt}`。成功failureCode=null，失败delivery_failed；终态快照不可改，无videoId/假附件。attempt在本会话从1单调分配，不复制作者record的attempt编号。
- MockApi新增异步`getContentDelivery(sessionId)`、`saveContentDeliveryDraft({...CommandContext,sourcePlanId,scriptVersionId,recipientSnapshot,subject,body})`、`simulateContentDelivery({...CommandContext,draftRevision,confirmed:true,failureCase?:'delivery_failed'})`、`exportContentPack({...CommandContext,attemptId})`，沿用ApiResult/DownloadResult。save由API生成真实附件manifest并清旧确认；simulate验证已确认的当前脚本、地址、稿件revision和实际附件，原子记一次终态attempt。失败后显式重试使用新幂等key，保留历史；不需要假计时器进度或调度后台。
- 保存/切换脚本使contentDelivery待发draft失效并需要重建、重确认；旧attempt只读保留。存储失败不能toast已保存，重复点击/重试沿用CAS与幂等语义。ContentDelivery记录与Replay完全隔离。
- 为增量会话使用IndexedDB命名空间`lavish-poc-content-v1`，会话本体标profile；无需迁移/破坏已验收旧会话，首页可标历史演示来自旧模式。封装扩展PersistedSession类型与存储校验，不用any绕过字段检查；reset只清本会话业务/内容交付/回放数据，保留reset审计。旧存储适配可复用新dbName。
- UI虚拟时间从会话相对时间出发，不能把Date.now直接作为场景毫秒。文案交付命令本轮即时本地记模拟结果，无视频排期依赖。

## 导出契约

下载必须为可打开的实际文件。脚本JSON含选定版本及parent/source关系、profile=content_only、mode=mock；VTT由该稿实际字幕生成，保留AR字形；ZIP包括上述文件、邮件文本、对应实际attempt快照和README明确未发送/无视频。文件名安全，manifest中的bytes/SHA与最终字节一致。视频/poster不进附件manifest、ZIP或成功说明。失败attempt可导出错误演示记录，但不能伪装成成功交付包。

## 验收与节奏

先A通用页面完成一次集中浏览器复查，再仅扩展B/C内容，无需每个控件停工。1440×900及1366×768实际查看；关注留白/字体/产品比例/阿语RTL/按钮可操作。类型、构建与相关核心测试通过；主测编辑保存刷新、回放隔离、下载真实文件、模拟交付重试与reset。暂不要求任何MP4/媒体解码/完整视频门禁，不为此停工；也不宣称它们已通过。
