import type {
  DeliveryAttempt,
  DomainState,
  Event,
  PendingDeliveryAttempt,
  ScenarioPackage,
  ScriptEditable,
  StageName,
  StageStatus,
  UserScriptVersion,
  DeliveryDraft,
} from '../domain/types';
import type {
  ContentAttachment,
  ContentDeliveryAttempt,
  ContentDeliveryDraft,
  ContentDeliveryRecipient,
  ContentDeliveryState,
  ContentPackageInput,
  ContentProfile,
} from '../domain/content-only';
import type { PersistedSession, ReplaySpeed, SessionSummary, StorageMode } from '../storage/types';

export type { DeliveryAttempt, Event, PendingDeliveryAttempt, ScenarioPackage, ScriptEditable, StageName, StageStatus, UserScriptVersion, DeliveryDraft };
export type { ContentAttachment, ContentDeliveryAttempt, ContentDeliveryDraft, ContentDeliveryRecipient, ContentDeliveryState, ContentPackageInput, ContentProfile, PersistedSession, ReplaySpeed, SessionSummary, StorageMode };

export type ApiErrorCode =
  | 'SCENARIO_NOT_READY'
  | 'SCHEMA_UNSUPPORTED'
  | 'PACKAGE_CHANGED'
  | 'NOT_FOUND'
  | 'ENTITY_NOT_REACHED'
  | 'INVALID_INPUT'
  | 'INVALID_TRANSITION'
  | 'REVISION_CONFLICT'
  | 'IDEMPOTENCY_CONFLICT'
  | 'VIDEO_VERSION_MISMATCH'
  | 'ASSET_UNAVAILABLE'
  | 'STORAGE_UNAVAILABLE'
  | 'STORAGE_QUOTA'
  | 'SESSION_NOT_FOUND'
  | 'CORRUPT_SESSION'
  | 'MOCK_FAILURE'
  | 'CONFIRMATION_REQUIRED'
  | 'STALE_VERSION'
  | 'IDEMPOTENT_REPLAY';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  fieldErrors: Array<{ path: string; message: string }>;
  retryable: boolean;
}

export interface ApiMeta {
  mode: 'mock';
  schemaVersion: '1.0.0';
  requestId: string;
  sessionId: string | null;
  revision: number | null;
}

export type ApiResult<T> =
  | { ok: true; data: T; meta: ApiMeta }
  | { ok: false; error: ApiError; meta: ApiMeta };

export interface CommandContext {
  sessionId: string;
  expectedRevision: number;
  idempotencyKey: string;
}

export interface WorkflowPlaybackView {
  stage: StageName | null;
  cursorSequence: number;
  virtualMs: number;
  transport: 'idle' | 'playing' | 'paused';
}

export interface ReplayView extends Omit<DomainState['replay'], never> {
  speed: ReplaySpeed;
  virtualMs: number;
}

export interface SessionView {
  id: string;
  scenarioId: string;
  scenarioVersion: string;
  packageHash: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  mode: 'mock';
  storageMode: StorageMode;
  profile: ContentProfile;
  workflow: DomainState['workflow'];
  workflowPlayback: WorkflowPlaybackView;
  contentDelivery?: ContentDeliveryState;
  activeBriefId: string | null;
  activeScriptVersionId: string | null;
  activeVideoId: string | null;
  userVersions: UserScriptVersion[];
  deliveryDrafts: DeliveryDraft[];
  deliveryAttempts: DeliveryAttempt[];
  stageAttempts: DomainState['stageAttempts'];
  replay: ReplayView;
  history: DomainState['history'];
}

export interface ScenarioListItem {
  scenarioId: string;
  title: string;
  scenarioVersion: string | null;
  readiness: 'awaiting_content' | 'invalid' | 'ready' | 'content_ready';
  profile?: ContentProfile;
  mediaStatus?: 'deferred' | 'available' | 'missing';
  issues: Array<{ path: string; message: string }>;
}

export interface ScenarioView {
  scenarioId: string;
  scenarioVersion: string;
  packageHash: string;
  manifest: ScenarioPackage['manifest'];
  brand: ScenarioPackage['brand'];
  assets: ScenarioPackage['assets']['data']['assets'];
  profile?: ContentProfile;
  contentPackage?: ContentPackageInput;
}

export interface LoadedScenario {
  scenarioId: string;
  scenarioVersion: string;
  packageHash: string;
  package: ScenarioPackage;
  media: Record<string, Uint8Array>;
  profile?: ContentProfile;
  contentPackage?: ContentPackageInput;
}

export interface ScenarioSource {
  list(): Promise<ScenarioListItem[]>;
  get(scenarioId: string, scenarioVersion: string): Promise<LoadedScenario | null>;
}

export interface StageData {
  stage: StageName;
  view: 'workflow' | 'replay';
  entities: Array<{ id: string; kind: string; value: unknown }>;
}

export interface EntityData {
  id: string;
  kind: string;
  value: unknown;
}

export interface DownloadResult {
  blob: Uint8Array;
  filename: string;
  mimeType: string;
  bytes: number;
  sha256: string;
}

export interface ContentDeliveryView {
  delivery: ContentDeliveryState;
  sourcePlan: {
    id: string;
    scriptVersionId: string;
    recipients: ContentDeliveryRecipient[];
  } | null;
  scripts: Array<{ id: string; language: 'en' | 'ar'; title: string; versionLabel: string; isUserVersion: boolean }>;
}

export interface ContentDeliverySaveInput {
  sourcePlanId: string;
  scriptVersionId: string;
  recipientSnapshot: ContentDeliveryRecipient[];
  subject: string;
  body: string;
}

export interface ContentDeliverySimulateInput {
  draftRevision: number;
  confirmed: true;
  failureCase?: 'delivery_failed';
}

export interface ReplayCommandBase {
  action: 'play' | 'pause' | 'step' | 'restart' | 'seek' | 'setSpeed';
  cursorSequence?: number;
  speed?: ReplaySpeed;
}

export interface MockApiOptions {
  scenarioSource: ScenarioSource;
  storage: import('../storage/types').PocStorage;
  now?: () => string;
  virtualNow?: () => number;
  /** AS-002 additive read-only provided assets; absence means no asset set. */
  providedAssetSource?: import('./provided-asset-source').ProvidedAssetSource;
  /** FLOW-001 additive presentation sidecar source; absence means an honest pending journey. */
  presentationSource?: import('./flow-source').CampaignPresentationSource;
  /** FLOW-001 TEST ONLY local simulated-publish failure branch; not a customer toggle. */
  socialSimulateFailure?: import('./flow-commands').SocialCommandDeps['simulateFailure'];
}

export interface MockApi {
  listScenarios(): Promise<ApiResult<{ items: ScenarioListItem[] }>>;
  getScenario(input: { scenarioId: string; scenarioVersion: string }): Promise<ApiResult<ScenarioView>>;
  createSession(input: { scenarioId: string; scenarioVersion: string; creationKey: string }): Promise<ApiResult<SessionView>>;
  listSessions(input?: { scenarioId?: string }): Promise<ApiResult<{ items: SessionSummary[] }>>;
  getSession(input: { sessionId: string }): Promise<ApiResult<SessionView>>;
  getStageData(input: { sessionId: string; stage: StageName; view: 'workflow' | 'replay' }): Promise<ApiResult<StageData>>;
  getEntity(input: { sessionId: string; entityId: string; view: 'workflow' | 'replay' }): Promise<ApiResult<EntityData>>;
  executeStage(ctx: CommandContext, input: { stage: 'discovery' | 'analysis' | 'video' }): Promise<ApiResult<SessionView>>;
  workflowCommand(ctx: CommandContext, input: { action: 'pause' | 'resume' }): Promise<ApiResult<SessionView>>;
  selectScript(ctx: CommandContext, input: { scriptVersionId: string }): Promise<ApiResult<SessionView>>;
  saveScriptDraft(ctx: CommandContext, input: { baseVersionId: string; content: ScriptEditable }): Promise<ApiResult<{ session: SessionView; version: UserScriptVersion }>>;
  confirmScript(ctx: CommandContext, input: { scriptVersionId: string }): Promise<ApiResult<SessionView>>;
  saveDeliveryDraft(
    ctx: CommandContext,
    input: {
      planId: string;
      recipientIds?: string[];
      recipientsOverride?: Array<{ id: string; displayName: string; email: string }>;
      subject: string;
      body: string;
      scheduledVirtualMs: number;
    },
  ): Promise<ApiResult<{ session: SessionView; draft: DeliveryDraft }>>;
  simulateDelivery(
    ctx: CommandContext,
    input: { draftId: string; confirmedVideoId: string; failureCase: null | 'delivery_failed' },
  ): Promise<ApiResult<{ session: SessionView; attempt: DeliveryAttempt | PendingDeliveryAttempt | null }>>;
  retryStage(ctx: CommandContext, input: { stage: StageName; failedAttemptId: string }): Promise<ApiResult<SessionView>>;
  replayCommand(ctx: CommandContext, input: ReplayCommandBase): Promise<ApiResult<{ session: SessionView; projection: SessionView['replay']['projection'] }>>;
  /** Advance the deterministic replay cursor by virtual time (already speed-mapped by the caller). */
  advanceReplay(ctx: CommandContext, input: { targetVirtualMs: number }): Promise<ApiResult<{ session: SessionView; projection: SessionView['replay']['projection'] }>>;
  getEvents(input: { sessionId: string; afterSequence: number; limit: number }): Promise<ApiResult<{ items: Event[]; nextSequence: number | null }>>;
  getHistory(input: { sessionId: string }): Promise<ApiResult<{ items: DomainState['history'] }>>;
  getDownload(input: { sessionId: string; kind: 'video' | 'poster' | 'script' | 'delivery_bundle' | 'run_record'; entityId: string }): Promise<ApiResult<DownloadResult>>;
  getContentDelivery(sessionId: string): Promise<ApiResult<ContentDeliveryView>>;
  saveContentDeliveryDraft(ctx: CommandContext, input: ContentDeliverySaveInput): Promise<ApiResult<{ session: SessionView; draft: ContentDeliveryDraft }>>;
  simulateContentDelivery(ctx: CommandContext, input: ContentDeliverySimulateInput): Promise<ApiResult<{ session: SessionView; attempt: ContentDeliveryAttempt }>>;
  exportContentPack(ctx: CommandContext, input: { attemptId: string }): Promise<ApiResult<DownloadResult>>;
  resetSession(ctx: CommandContext, input: { confirmation: 'RESET_THIS_SESSION' }): Promise<ApiResult<SessionView>>;
}
