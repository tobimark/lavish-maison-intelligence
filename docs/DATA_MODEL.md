> 2026-11-04 范围更新：当前实施以 [Fully Mocked POC](POC_SCOPE.md) 为准。下文旧业务流程/后端/实时服务要求为历史，不能用于派发；当前数据/API/事件/状态机及验收见新POC文档。设计原则仍有效，具体四步布局见 pages/POC_WORKFLOW.md。本次未重做或撤销历史验收。

> 当前生效范围为[前端 Demo](FRONTEND_DEMO_SCOPE.md)。下文涉及后端、数据库、API与服务端任务的内容保留作未来参考，不是本期实施或验收条件。

# 数据模型与一致性

所有ID UUID；公开API可不透明字符串，禁止用数组索引关联。时间ISO8601 UTC；排期额外保存IANA timezone（默认Asia/Dubai）与用户本地墙钟输入。不可变内容版本存JSONB+schemaVersion+sha256。所有可变聚合有revision整数，PATCH带expectedRevision，冲突409。DEMO实体带demoNamespaceId/seedVersion；LIVE不允许进入演示重置。

| 实体 | 关键字段 / 外键 / 约束 | 生命周期 |
|---|---|---|
| DemoScenario | id,slug唯一,version,seed,eventsHash,manifest,sourceType=DEMO | draft→published；发布版本不可变 |
| AgentRun | id,namespace,agentType,intelligence/creative,mode,scenarioId,inputRef,outputRef,attempt,maxAttempts,error | queued→running→succeeded/failed/cancelled；重试新attempt保留记录 |
| AgentEvent | id,runId,sequence,virtualTimeMs,eventType,payload,schemaVersion,causationId | append-only；unique(runId,sequence)；事件不乱序覆盖 |
| ReplaySession | id,namespace,scenarioId/version,status,cursorMs,speed,revision,anchorRealTime,snapshotRef | paused/playing/completed；speed∈1,2,4；不写Feed对象 |
| Signal | id,namespace,sourceType,sourceId,externalId,fingerprint,region,topic,observedAt,evidenceIds | normalized/deduplicated/clustered；unique namespace/source/fingerprint |
| Evidence | id,namespace,sourceType,sourceUrl nullable,title,excerpt,observedAt,retrievedAt,checksum,assetRef | immutable；DEMO链接用本地证据ID |
| Trend | id,namespace,version,topic,signalIds,series,region,window,methodVersion | versioned；增长下降都合法 |
| MarketingOpportunity | id,namespace,version,title,summary,trendIds,evidenceIds,regions,scoreBreakdown,brandFit,productIds,channels,directions,risks,sourceType | proposed/qualified/archived；历史append-only |
| Brand | id,name,logoAssetId nullable,guidelinesVersion,allowedClaims,forbiddenClaims,languageRules | 来源核验后使用 |
| Product | id,brandId,name,sku唯一(brandId,sku),notes,volumeMl nullable,sourceUrl,imageAssetIds,verificationStatus | draft/verified/retired；未知字段null |
| OpportunitySnapshot | id,namespace,sourceOpportunityId/version,originReplaySessionId nullable,payload,sha256 | 不可变持久快照；保存商品与证据引用和必要证据摘要；Replay重置不破坏Campaign证据 |
| Campaign | id,namespace,opportunitySnapshotId,opportunityId/version,originReplaySessionId,brandId,currentBriefVersion,revision | draft/active/completed/archived；不是Approval状态；FK指向Snapshot，不要求临时Replay机会在业务机会表存在 |
| CampaignBrief | id,campaignId,version,name,theme,objective,markets,audience,productIds,concept,tone,channels,contentPlan,languages,suggestedSchedule | immutable版本；unique(campaignId,version) |
| CreativeProject | id,campaignId唯一,selectedConcept,currentStoryboardVersion,revision | active/archived |
| CreativeAsset | id,projectId,kind,channel,locale,currentVersionId | kind=copy/image/video/cover；只存身份 |
| AssetVersion | id,assetId,version,parentVersionId,payload,fileRef,sha256,generationMode,providerRunId,createdBy | immutable；unique(assetId,version)；restore新版本 |
| Approval | id,assetVersionId,status,reviewer,reason,revision | draft→in_review→approved/changes_requested/rejected；重提新review attempt |
| ScheduledPost | id,campaignId,assetVersionId,approvalId,channel,scheduledAt,timezone,status,revision | scheduled→dispatching→simulated_published/failed/cancelled |
| RenderJob | id,projectId,storyboardVersion,assetVersionIds,status,progress nullable,outputRef,error,attempt | queued/running/succeeded/failed/cancelled；输出绑定输入哈希 |
| MetricSnapshot | id,campaignId,scheduledPostId,windowStart/End,impressions,clicks,engagements,conversions,sourceType=DEMO,seed | unique(postId,windowEnd,seedVersion)；rates统一派生 |
| StoryboardVersion | id,projectId,version,shots[4],locale,brandOutro,captionStyle | 4镜头总和15000ms，字幕时段不越界 |
| Job / Outbox | id,namespace,kind,dueAt,leaseOwner,leaseUntil,attempt,idempotencyKey,payload | 租约重领，最多执行一次可观察效果 |

关系：Signal→Evidence，Trend↔Signal，Opportunity↔Trend/Evidence/Product；Campaign→Opportunity snapshot；Project→Campaign；Asset→Project；Version→Asset；Approval→Version；Schedule→Version+Approval；Metrics→Schedule；Render→StoryboardVersion+Version。

数据库以外键、check、唯一索引保证边界。JSONB载荷仍必须Pydantic schema验证；不能把所有实体塞一个无约束JSON blob。批准只接受in_review；拒绝/退回必须reason。排期要求approval.status=approved且approval.assetVersionId等于post.assetVersionId；生成新版本不自动换排期。

幂等：POST带Idempotency-Key，以namespace+operation+key唯一并保存requestHash/response；相同key不同body=409。Create Campaign事务一次创建Campaign+Brief v1+Project；关联replayOpportunitySnapshot且不把它改成LIVE。

Reset：仅重置指定namespace的演示会话/运行/业务演示数据；先取消或栅栏化旧job generation，租约完成时校验generation防旧结果复活；持久品牌资产不删，其他命名空间/LIVE不受影响；明确返回删除计数。
