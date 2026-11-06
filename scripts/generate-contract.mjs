// Architecture-owned source for the design-stage API baseline. Not a running server.
import {writeFile} from 'node:fs/promises';
const str={type:'string'},id={type:'string',format:'uuid'},integer={type:'integer',minimum:0},time={type:'string',format:'date-time'};
const ref=n=>({$ref:`#/components/schemas/${n}`}),arr=x=>({type:'array',items:x}),enm=(...v)=>({type:'string',enum:v});
const obj=(properties,required=Object.keys(properties))=>({type:'object',additionalProperties:false,properties,required});
const json={type:'object',additionalProperties:true,description:'Versioned payload; per-kind schema is validated by the domain, never arbitrary state commands.'};
const source=enm('LIVE','IMPORTED','DEMO'),gen=enm('preset','live_model');
const schemas={
  Error:obj({code:str,message:str,requestId:str,details:json}),
  Scenario:obj({id,slug:str,version:integer,title:str,durationMs:integer,sourceType:enm('DEMO'),eventsHash:str}),
  AgentRun:obj({id,agentType:enm('intelligence','creative'),mode:enm('autonomous_demo','presentation_replay'),status:enm('queued','running','succeeded','failed','cancelled'),attempt:integer,inputRef:str,outputRef:{type:'string',nullable:true},error:{...ref('Error'),nullable:true}}),
  AgentEvent:obj({id,runId:id,schemaVersion:integer,sequence:integer,virtualTimeMs:integer,type:enm('run.started','signal.ingested','signal.normalized','signal.deduplicated','trend.clustered','trend.scored','opportunity.created','opportunity.explained','run.succeeded','run.failed','brief.created','concept.selected','asset.version_created','render.queued','render.completed','render.failed','post.simulated_published','post.failed'),sourceType:source,payload:json,inputRef:str,outputRef:str,causationId:{...id,nullable:true}}),
  ReplaySession:obj({id,scenarioId:id,scenarioVersion:integer,status:enm('paused','playing','completed'),cursorMs:integer,speed:{type:'integer',enum:[1,2,4]},revision:integer,anchorRealTime:time}),
  ReplayState:obj({session:ref('ReplaySession'),stateHash:str,lastSequence:integer,signals:arr(ref('Signal')),trends:arr(ref('Trend')),opportunities:arr(ref('MarketingOpportunity'))}),
  Signal:obj({id,sourceType:source,sourceId:str,externalId:{type:'string',nullable:true},topic:str,region:str,observedAt:time,evidenceIds:arr(id),fingerprint:str}),
  Evidence:obj({id,sourceType:source,title:str,excerpt:str,sourceUrl:{type:'string',format:'uri',nullable:true},observedAt:time,retrievedAt:time,checksum:str}),
  Trend:obj({id,version:integer,topic:str,region:str,signalIds:arr(id),series:arr(obj({at:time,value:{type:'number'}})),methodVersion:str}),
  Score:obj({value:{type:'integer',minimum:0,maximum:100,nullable:true},methodVersion:str,incomplete:{type:'boolean'},components:arr(obj({name:enm('momentum','brandFit','regionalRelevance','evidenceQuality'),value:{type:'number',minimum:0,maximum:100,nullable:true},weight:{type:'number',minimum:0,maximum:1},explanation:str,evidenceIds:arr(id)}))}),
  MarketingOpportunity:obj({id,version:integer,title:str,summary:str,trendIds:arr(id),evidenceIds:arr(id),regions:arr(str),score:ref('Score'),brandFit:{type:'number',minimum:0,maximum:100,nullable:true},productIds:arr(id),channels:arr(str),directions:arr(str),risks:arr(str),sourceType:source,createdAt:time,updatedAt:time}),
  Brand:obj({id,name:str,logoAssetId:{...id,nullable:true},guidelinesVersion:integer,allowedClaims:arr(str),forbiddenClaims:arr(str),languageRules:json}),
  Product:obj({id,brandId:id,name:str,sku:str,volumeMl:{type:'number',nullable:true},notes:arr(str),sourceUrl:{type:'string',format:'uri'},imageAssetIds:arr(id),verificationStatus:enm('draft','verified','retired')}),
  CampaignBrief:obj({name:str,theme:str,objective:str,markets:arr(str),audience:str,productIds:arr(id),concept:str,tone:str,channels:arr(str),contentPlan:arr(str),languages:arr(enm('en','ar')),suggestedSchedule:arr(obj({at:time,timezone:str}))}),
  Campaign:obj({id,opportunityId:id,opportunityVersion:integer,originReplaySessionId:{...id,nullable:true},brandId:id,status:enm('draft','active','completed','archived'),revision:integer,briefVersion:integer,brief:ref('CampaignBrief'),projectId:id}),
  CreativeProject:obj({id,campaignId:id,selectedConcept:{type:'string',nullable:true},revision:integer}),
  CreativeAsset:obj({id,projectId:id,kind:enm('copy','image','video','cover'),channel:str,locale:enm('en','ar'),currentVersionId:id}),
  AssetVersion:obj({id,assetId:id,version:integer,parentVersionId:{...id,nullable:true},schemaVersion:integer,payload:json,fileId:{...id,nullable:true},sha256:str,generationMode:gen,createdAt:time}),
  Approval:obj({id,assetVersionId:id,status:enm('draft','in_review','changes_requested','approved','rejected'),revision:integer,reviewer:{type:'string',nullable:true},reason:{type:'string',nullable:true}}),
  ScheduledPost:obj({id,campaignId:id,assetVersionId:id,approvalId:id,channel:str,scheduledAt:time,timezone:str,status:enm('scheduled','dispatching','simulated_published','failed','cancelled'),revision:integer,sourceType:enm('DEMO')}),
  Storyboard:obj({projectId:id,version:integer,locale:enm('en','ar'),width:{type:'integer',enum:[1080]},height:{type:'integer',enum:[1920]},fps:{type:'integer',enum:[30]},durationMs:{type:'integer',enum:[15000]},shots:{type:'array',minItems:4,maxItems:4,items:obj({assetVersionId:id,durationMs:{type:'integer',minimum:1},captionEn:str,captionAr:str,transition:str})},brandOutroAssetId:id}),
  RenderJob:obj({id,projectId:id,storyboardVersion:integer,status:enm('queued','running','succeeded','failed','cancelled'),progress:{type:'number',minimum:0,maximum:1,nullable:true},outputFileId:{...id,nullable:true},coverFileId:{...id,nullable:true},error:{type:'string',nullable:true},attempt:integer}),
  MetricSnapshot:obj({id,campaignId:id,scheduledPostId:id,windowStart:time,windowEnd:time,impressions:integer,clicks:integer,engagements:integer,conversions:integer,sourceType:enm('DEMO'),seed:integer}),
  Job:obj({id,status:enm('queued','running','succeeded','failed','cancelled'),resultRef:{type:'string',nullable:true},error:{type:'string',nullable:true}}),
  DemoSession:obj({id,demoNamespaceId:id,generation:integer}),
  FileMetadata:obj({id,mime:str,bytes:integer,sha256:str,status:enm('validated','rejected'),sourceType:source}),
  ReplayCommand:obj({action:enm('play','pause','step','seek','restart','set_speed'),expectedRevision:integer,cursorMs:integer,speed:{type:'integer',enum:[1,2,4]}},['action','expectedRevision']),
  CreateCampaign:obj({opportunityId:id,opportunityVersion:integer,replaySessionId:{...id,nullable:true},scenarioVersion:{type:'integer',nullable:true},brandId:id}),
  UpdateBrief:obj({expectedRevision:integer,brief:ref('CampaignBrief')}),
  Generate:obj({projectId:id,briefVersion:integer,target:enm('concept','copy','image','storyboard'),locale:enm('en','ar'),channel:str,mode:gen,instruction:str}),
  VersionEdit:obj({baseVersionId:id,payload:json,instruction:str}),
  CopilotRequest:obj({targetType:enm('brief','asset_version','storyboard'),targetId:id,baseVersion:integer,instruction:str,mode:gen}),
  CopilotProposal:obj({id,targetType:str,targetId:id,baseVersion:integer,patch:arr(obj({op:enm('add','replace','remove'),path:str,value:{}},['op','path'])),summary:str}),
  ScheduleRequest:obj({campaignId:id,assetVersionId:id,approvalId:id,channel:str,scheduledAt:time,timezone:str}),
  ResetResult:obj({generation:integer,deletedCounts:obj({sessions:integer,runs:integer,campaigns:integer,jobs:integer}),preservedBrandAssets:integer})
};
const paths={};
function endpoint(method,path,operationId,response,body,code=200,description=''){
  const parameters=[...path.matchAll(/\{(\w+)\}/g)].map(m=>({name:m[1],in:'path',required:true,schema:id}));
  if(method!=='get') parameters.push({name:'Idempotency-Key',in:'header',required:true,schema:{type:'string',minLength:8,maxLength:128}});
  const op={operationId,description:description||'Namespace comes from the server demo session. State transitions and cross-object constraints are mandatory.',parameters,responses:{[code]:{description:code===202?'Accepted; poll job or subscribe to SSE.':'Success',content:{'application/json':{schema:response}}}}};
  for(const [status,desc] of [[400,'Invalid parameter combination'],[401,'Missing demo session'],[403,'Outside namespace'],[404,'Object not found'],[409,'Revision, idempotency or lifecycle conflict'],[422,'Validation failed'],[503,'Provider or worker unavailable']])op.responses[status]={description:desc,content:{'application/json':{schema:ref('Error')}}};
  if(body)op.requestBody={required:true,content:{'application/json':{schema:body}}};
  (paths[path]??={})[method]=op;
  return op;
}
const list=n=>obj({items:arr(ref(n)),nextCursor:{type:'string',nullable:true}});
endpoint('post','/demo-sessions','createDemoSession',ref('DemoSession'),obj({}),201,'Creates server-issued namespace and HttpOnly demo_session cookie. Local/private demo only.').security=[];
endpoint('get','/scenarios','listScenarios',list('Scenario'));
endpoint('post','/replay-sessions','createReplaySession',ref('ReplaySession'),obj({scenarioId:id,scenarioVersion:integer}),201);
endpoint('get','/replay-sessions/{sessionId}','getReplaySession',ref('ReplaySession'));
endpoint('post','/replay-sessions/{sessionId}/commands','controlReplay',ref('ReplayState'),ref('ReplayCommand'),200,'seek requires cursorMs; set_speed requires speed. Revision conflicts return409; all other action-irrelevant fields rejected.');
endpoint('get','/replay-sessions/{sessionId}/state','getReplayState',ref('ReplayState'));
endpoint('get','/runs','listRuns',list('AgentRun'));
endpoint('get','/runs/{runId}','getRun',ref('AgentRun'));
endpoint('get','/runs/{runId}/events','listRunEvents',list('AgentEvent'));
endpoint('get','/events/{eventId}','getEvent',ref('AgentEvent'));
endpoint('post','/runs/{runId}/retry','retryRun',ref('AgentRun'),obj({}),202);
endpoint('post','/feeds/commands','controlFeed',ref('Job'),obj({action:enm('start','pause','resume'),scenarioId:id,scenarioVersion:integer}),202);
endpoint('get','/signals','listSignals',list('Signal'));
endpoint('get','/trends','listTrends',list('Trend'));
endpoint('get','/opportunities','listOpportunities',list('MarketingOpportunity'));
endpoint('get','/opportunities/{opportunityId}','getOpportunity',ref('MarketingOpportunity'));
endpoint('get','/opportunities/{opportunityId}/history','getOpportunityHistory',list('MarketingOpportunity'));
endpoint('get','/evidence/{evidenceId}','getEvidence',ref('Evidence'));
endpoint('get','/brands/{brandId}','getBrand',ref('Brand'));
endpoint('get','/products','listProducts',list('Product'));
endpoint('post','/imports','importSignals',ref('Job'),obj({manifestFileId:id}),202);
const upload=endpoint('post','/files','uploadImportedFile',ref('FileMetadata'),undefined,201,'Accept JSON/CSV/image/video allowlist with size limits and content sniffing; server creates opaque fileId in namespace. No user filesystem paths.');
upload.requestBody={required:true,content:{'multipart/form-data':{schema:obj({file:{type:'string',format:'binary'},sourceType:enm('IMPORTED'),purpose:enm('signal_manifest','brand_asset','creative_input')})}}};
endpoint('post','/campaigns','createCampaign',ref('Campaign'),ref('CreateCampaign'),201);
endpoint('get','/campaigns','listCampaigns',list('Campaign'));
endpoint('get','/campaigns/{campaignId}','getCampaign',ref('Campaign'));
endpoint('patch','/campaigns/{campaignId}','updateCampaignBrief',ref('Campaign'),ref('UpdateBrief'));
endpoint('get','/projects/{projectId}','getCreativeProject',ref('CreativeProject'));
endpoint('post','/creative/generations','generateCreative',ref('Job'),ref('Generate'),202);
endpoint('get','/assets','listAssets',list('CreativeAsset'));
endpoint('get','/assets/{assetId}/versions','listAssetVersions',list('AssetVersion'));
endpoint('post','/assets/{assetId}/versions','editAssetVersion',ref('AssetVersion'),ref('VersionEdit'),201);
endpoint('get','/asset-versions/{versionId}','getAssetVersion',ref('AssetVersion'));
endpoint('post','/assets/{assetId}/restore','restoreAssetVersion',ref('AssetVersion'),obj({sourceVersionId:id,baseVersionId:id}),201);
endpoint('post','/copilot/proposals','proposeCopilotEdit',ref('CopilotProposal'),ref('CopilotRequest'));
endpoint('post','/copilot/proposals/{proposalId}/apply','applyCopilotEdit',ref('Job'),obj({expectedBaseVersion:integer}),202);
endpoint('post','/approvals','submitForReview',ref('Approval'),obj({assetVersionId:id}),201);
endpoint('get','/approvals','listApprovals',list('Approval'));
endpoint('post','/approvals/{approvalId}/decisions','decideApproval',ref('Approval'),obj({expectedRevision:integer,decision:enm('approved','changes_requested','rejected'),reason:str}));
endpoint('get','/scheduled-posts','listScheduledPosts',list('ScheduledPost'));
endpoint('post','/scheduled-posts','schedulePost',ref('ScheduledPost'),ref('ScheduleRequest'),201);
endpoint('patch','/scheduled-posts/{postId}','updateSchedule',ref('ScheduledPost'),obj({expectedRevision:integer,scheduledAt:time,timezone:str,status:enm('scheduled','cancelled')}));
endpoint('post','/scheduled-posts/{postId}/simulate','simulatePublish',ref('Job'),obj({expectedRevision:integer}),202);
endpoint('get','/campaigns/{campaignId}/metrics','getCampaignMetrics',list('MetricSnapshot'));
endpoint('post','/projects/{projectId}/storyboards','createStoryboardVersion',ref('Storyboard'),ref('Storyboard'),201);
endpoint('get','/projects/{projectId}/storyboards','listStoryboards',list('Storyboard'));
endpoint('post','/render-jobs','startRender',ref('RenderJob'),obj({projectId:id,storyboardVersion:integer}),202);
endpoint('get','/render-jobs/{jobId}','getRenderJob',ref('RenderJob'));
endpoint('post','/render-jobs/{jobId}/commands','controlRender',ref('RenderJob'),obj({action:enm('retry','cancel')}),202);
endpoint('get','/jobs/{jobId}','getJob',ref('Job'));
const download=endpoint('get','/files/{fileId}/download','downloadFile',str);
download.responses[200]={description:'Authorized, checksum-verified version file; Content-Disposition attachment.',headers:{'Content-Disposition':{schema:str},ETag:{schema:str}},content:{'application/octet-stream':{schema:{type:'string',format:'binary'}}}};
endpoint('post','/demo/reset','resetDemoNamespace',ref('ResetResult'),obj({expectedGeneration:integer,confirm:enm('RESET_DEMO')}));
const stream=endpoint('get','/events/stream','streamEvents',str);
stream.parameters.push({name:'Last-Event-ID',in:'header',schema:str});
stream.responses[200]={description:'SSE events, monotonic cursor, heartbeat, reconnect via Last-Event-ID.',content:{'text/event-stream':{schema:str}}};
stream.responses[410]={description:'Cursor expired; details.snapshotUrl points to recovery.',content:{'application/json':{schema:ref('Error')}}};
for(const [p,methods] of Object.entries(paths))for(const [m,op]of Object.entries(methods)){
  if(m==='get'&&op.operationId.startsWith('list'))op.parameters.push({name:'cursor',in:'query',schema:str},{name:'limit',in:'query',schema:{type:'integer',minimum:1,maximum:100,default:25}});
  if(['/signals','/trends','/opportunities'].includes(p))op.parameters.push({name:'region',in:'query',schema:str},{name:'topic',in:'query',schema:str},{name:'sourceType',in:'query',schema:source});
  if(p==='/scheduled-posts'&&m==='get')op.parameters.push({name:'from',in:'query',schema:time},{name:'to',in:'query',schema:time},{name:'channel',in:'query',schema:str});
  if(p==='/assets'&&m==='get')op.parameters.push({name:'projectId',in:'query',schema:id});
}
const api={openapi:'3.0.3',info:{title:'MAISON INTELLIGENCE · Lavish Demo API',version:'0.1.0',description:'Design baseline; no endpoints implemented yet. See docs/API_CONTRACT.md for invariants.'},servers:[{url:'/api/v1'}],security:[{demoSession:[]}],paths,components:{securitySchemes:{demoSession:{type:'apiKey',in:'cookie',name:'demo_session'}},schemas}};
await writeFile('contracts/openapi.json',JSON.stringify(api,null,2)+'\n');
console.log(`${Object.keys(paths).length} paths, ${Object.keys(schemas).length} schemas generated`);
