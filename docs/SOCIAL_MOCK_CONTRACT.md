# 连贯案例投影及社媒Mock契约

2026-11-05主控定义，供FLOW-001..004实施。原场景Schema、AgentEvent、Replay和邮件API不改。新增接口放独立flow-contract.ts，以组合类型扩展原AssetAwareMockApi，不在旧接口强加必填字段。

## 内容sidecar

作者交付`presentation/scent-layering/1.1.0/campaign-presentation.json`，主控接收后DSH发布到`public/campaign-presentation/scent-layering/1.1.0.json`。通过同一个MockApi加载，不允许页面各自fetch或硬编码营销内容。内容验证是FLOW-001内的一项小检查，无需重写原validator。

```typescript
interface CampaignPresentation {
  schemaVersion: '1.0.0';
  scenarioId: 'scn-scent-layering';
  scenarioVersion: '1.1.0';
  packageHash: string; // 实际新manifest字节SHA-256
  campaignId: 'scn-scent-layering.brief.main';
  productIds: ['scn-scent-layering.product.serenity'];
  mode: 'mock';
  insight: { title: string; takeaway: string; signalIds: string[]; trendIds: string[]; evidenceIds: string[] };
  strategy: { analysisId: string; briefId: string; whyThisProduct: string };
  creative: {
    title: string;
    scriptVersionIds: string[]; // 实际en-v2/ar-v2，非占位ID
    steps: [
      { role: 'product_identity'; assetId: string; explanation: string },
      { role: 'hero'; assetId: string; explanation: string },
      { role: 'final_preview'; assetId: string; explanation: string }
    ];
    relationship: 'illustrative_workflow_with_provided_assets';
  };
  socialPosts: Array<{
    id: string;
    channel: 'instagram';
    placement: 'video_post'; // 本地Mock产品选项，不是平台API字段
    accountLabel: 'Lavish Perfumes · Demo account';
    language: 'en' | 'ar';
    sourceScriptVersionId: string;
    videoAssetId: string;
    caption: string;
    cta: string;
    hashtags: string[];
  }>; // A必须有EN与AR两项
}
```

原图/Hero/视频assetId使用现有Provided sidecar ID，不把10秒片塞进冻结15秒VideoEntry。所有summary/explanation为网页端内容作者生产且指向已有依据；禁止引入无法追溯的增长率或真实采集声称。必须校验Campaign/产品/版本、packageHash、所有内部引用、语言与脚本一致、三个资产role及真实视频hash可解析。侧车缺失时getJourney返回诚实pending及可用段落，不编默认文案；旧包仍可在旧工作区浏览。

## Journey只读投影

`getCampaignJourney({campaignId,scenarioVersion}) → ApiResult<{ campaign, contentStatus:'pending'|'ready', presentation:CampaignPresentation|null, opportunity, selectedVersions, providedAssets, socialDrafts, attempts }>`。

复用现有getOpportunity/getCampaign/getProvidedAssets，显式版本查找，保留旧包历史。不为浏览、切stage、查看创作演示或视频播放创建工作session、社会稿或发布记录。页面URL stage只控制阅读位置，不能当阶段完成状态。深链到Atelier/Brief/Library/Deliverables带准确Campaign和版本；旧路由如果未支持scenarioVersion，在既有AS-003版本接线范围补齐，不能回退到不同产品。

## 社媒草稿与动作

新增本地SocialDraft：`id,campaignId,scenarioVersion,packageHash,sourceScript:{campaignId,versionId,sessionId,scenarioVersion},video:{assetSetId,assetId,sha256},language,channel,placement,accountLabel,caption,cta,hashtags,revision,status,createdAt,updatedAt`。

status=`draft|ready|published_simulated`。草稿正文随Save持久化，未保存编辑由现有NavigationGuard保护；修改稿不直接改preset或已发布记录。引用失效或素材未bound不得进入ready。

| API（同一MockApi门面） | 规则 |
|---|---|
| prepareSocialDraft({campaignId,scenarioVersion,presetPostId,idempotencyKey}) | 显式点Edit/Prepare才建立草稿；引用真实preset/script/video，浏览不调用；复用同上下文已有稿，不能覆盖用户编辑 |
| getSocialDraft({draftId}) / listSocialPosts({campaignId,scenarioVersion}) | 只读草稿及不可变attempts；直接打开第四段能预览preset而不先建稿 |
| saveSocialDraft({draftId,expectedRevision,idempotencyKey,caption,cta,hashtags}) | 校验/保存，revision+1，status=draft，取消本稿ready；旧attempt不变 |
| reviewSocialDraft({draftId,expectedRevision,idempotencyKey}) | 用已保存精确文本、语言、视频及来源版本生成reviewHash；所选script须沿用既有确认机制confirmed_current，缺确认时显示可操作的Review creative入口，禁止静默确认；status=ready，返回最新revision和快照 |
| simulateSocialPublish({draftId,expectedRevision,reviewHash,idempotencyKey}) | 校验ready、同revision/reviewHash及当前来源仍有效；一次本地事务保存attempt、幂等receipt、draft状态；不调用外部服务 |
| getSocialPost({attemptId}) | 返回不可变帖子快照，界面内部链接，不拼造真实平台URL |

所有返回继续使用ApiResult/ApiMeta及现有INVALID_INPUT、REVISION_CONFLICT、IDEMPOTENCY_CONFLICT、INVALID_TRANSITION等错误。不新增通用Agent框架。幂等key同body重复返回原结果，key换body报冲突；保存或审阅后旧reviewHash失效，未保存文本不能用于发布确认。

用户不编辑时可点Review创建该预置稿并审阅，但这必须为明确操作。确认源script复用beginCampaignEdit与既有确认命令；社媒文案审批只影响社媒草稿，不伪称已重新批准原视频。选择EN/AR只切换所预览/编辑对象，不能覆盖另一语言。

发布的SocialAttempt：`id,draftId,draftRevision,campaignId,scenarioVersion,packageHash,mode:'mock',status:'published_simulated'|'failed_simulated',snapshot:{sourceScript,video,channel,placement,accountLabel,language,caption,cta,hashtags},reviewHash,createdAt,error:null|{code,message}`。无真实postId/url或metrics。成功反馈只能在事务提交后显示；存储失败保留稿并显示错误，不能先toast成功。Provider失败为本地可注入测试分支，不在客户首页添加失败开关；重试生成新attempt，保留失败历史。

成功后可再次编辑同稿，revision+1转draft；旧attempt永远展示发布当时文本/视频。再次审阅后可模拟再发布。即使既有script之后失去确认，过去帖子也保持历史快照，UI不重新拼当前文案。

## 存储和事件边界

继续用同一PocStorage与IndexedDB数据库`lavish-poc-content-v1`；DB_VERSION从实际2增到3，新增单个`socialWorkflows` store，按campaignId@packageHash保存聚合（drafts/attempts/receipts）。提供对应MemoryStorage实现及事务方法。既有session、workspaceLinks、productExports和receipt不删除不清库；禁止另建localStorage平行事实源。

创意演进是预置只读讲解，不写AgentEvent。社媒Save/Review/Publish为本地真实用户动作，记录在socialWorkflows；不能向冻结原AgentRun伪加平台采集/视频生成/邮件事件。原Replay引擎保留隔离，选段落或回放讲解不重置用户稿、不自动发布。

## 最低必要测试

同一Campaign/产品/版本闭合、pending不造内容；browse无写；真实视频与草稿保存刷新；只发布已审阅快照；修改稿后旧reviewHash拒绝、重复点击不重复记录、旧帖子不随编辑变化；模拟失败可恢复；DB2→3迁移不丢旧稿/导出。前端一次完整走通四段并实际看帖子预览。冻结Schema及旧Accepted基础不需要全量重测。
