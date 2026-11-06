import type {
  DeliveryPlan,
  DeliveryRecord,
  Event,
  ScenarioPackage,
  ScriptVersion,
  Shot,
  Subtitle,
  VideoEntry,
} from '../generated/scenario.types';

export type { DeliveryPlan, DeliveryRecord, Event, ScenarioPackage, ScriptVersion, Shot, Subtitle, VideoEntry };

export type StageName = 'discovery' | 'analysis' | 'video' | 'delivery';

export type StageStatus =
  | 'locked'
  | 'ready'
  | 'running'
  | 'awaiting_confirmation'
  | 'completed'
  | 'failed'
  | 'stale';

export type ReplayTransport = 'idle' | 'playing' | 'paused' | 'ended' | 'error';

export interface WorkflowState {
  discovery: StageStatus;
  analysis: StageStatus;
  video: StageStatus;
  delivery: StageStatus;
}

export interface ScriptEditable {
  title: string;
  hook: string;
  message: string;
  cta: string;
  shots: Shot[];
  subtitles: Subtitle[];
  caption: string;
  hashtags: string[];
}

export interface UserScriptVersion {
  id: string;
  briefId: string;
  language: 'en' | 'ar';
  sourceScriptVersionId: string;
  parentVersionId: string;
  revision: number;
  content: ScriptEditable;
  createdAt: string;
}

export interface DeliveryRecipientSnapshot {
  id: string;
  displayName: string;
  email: string;
}

export interface DeliveryDraft {
  id: string;
  planId: string;
  revision: number;
  scriptVersionId: string;
  videoId: string;
  recipientSnapshot: DeliveryRecipientSnapshot[];
  subject: string;
  body: string;
  attachmentAssetIds: string[];
  scheduledVirtualMs: number;
  confirmedRevision: number | null;
}

export interface StageAttempt {
  id: string;
  stage: StageName;
  ordinal: number;
  inputRefs: string[];
  status: 'running' | 'completed' | 'failed' | 'canceled';
  lastSequence: number;
  sourceStartSequence: number;
  sourceEndSequence: number;
  lastEventJson: string | null;
  lastAtMs: number;
  startedAt: string;
  finishedAt: string | null;
  errorCode: string | null;
}

export type DeliveryOutcome = 'simulated_delivered' | 'failed';

/**
 * Internal pending delivery snapshot. `simulateDelivery`/`retryStage` only
 * create this while the attempt is running; terminal DeliveryAttempt/record is
 * written once by advanceDeliveryAttempt at/after scheduledVirtualMs.
 */
export interface PendingDeliveryAttempt {
  id: string;
  stageAttemptId: string;
  draftId: string;
  planId: string;
  scriptVersionId: string;
  videoId: string;
  attachmentAssetIds: string[];
  recipientIds: string[];
  subject: string;
  body: string;
  scheduledVirtualMs: number;
  failureCase: null | 'delivery_failed';
  status: 'running' | 'settled';
  outcome: DeliveryOutcome | null;
  startedAt: string;
  settledAt: string | null;
}

export interface DeliveryAttempt {
  id: string;
  stageAttemptId: string;
  draftId: string;
  planId: string;
  scriptVersionId: string;
  videoId: string;
  attachmentAssetIds: string[];
  recipientIds: string[];
  subject: string;
  body: string;
  outcome: DeliveryOutcome;
  failureCode: 'delivery_failed' | null;
  attempt: number;
  virtualTimeMs: number;
  mode: 'mock';
}

export interface SimulatedDeliveryRecord {
  id: string;
  planId: string;
  scriptVersionId: string;
  videoId: string;
  attachmentAssetIds: string[];
  recipientIds: string[];
  subject: string;
  body: string;
  outcome: 'simulated_delivered';
  attempt: number;
  virtualTimeMs: number;
  mode: 'mock';
}

export interface ActionRecord {
  id: string;
  sequence: number;
  action: string;
  entityIds: string[];
  occurredAt: string;
  outcome: 'applied' | 'failed' | 'reset' | 'canceled';
  mode: 'mock';
}

export interface ReplayProjection {
  workflow: WorkflowState;
  visibleEntityIds: string[];
  activeScriptVersionId: string | null;
  activeVideoId: string | null;
  deliveryRecordIds: string[];
  confirmedScriptVersionId: string | null;
  videoAvailability: Record<string, 'queued' | 'available'>;
  videoProgress: Record<string, number>;
}

export interface ReplayState {
  cursorSequence: number;
  transport: ReplayTransport;
  projection: ReplayProjection;
  lastAtMs: number;
  lastEventId: string | null;
  lastEventJson: string | null;
}

export interface DomainState {
  sessionId: string;
  scenarioId: string;
  scenarioVersion: string;
  packageHash: string;
  revision: number;
  createdAt: string;
  workflow: WorkflowState;
  activeBriefId: string | null;
  activeScriptVersionId: string | null;
  activeVideoId: string | null;
  deliveryDraftId: string | null;
  userVersions: UserScriptVersion[];
  deliveryDrafts: DeliveryDraft[];
  stageAttempts: StageAttempt[];
  deliveryAttempts: DeliveryAttempt[];
  pendingDeliveryAttempts: PendingDeliveryAttempt[];
  deliveryRecords: SimulatedDeliveryRecord[];
  workflowCursor: number;
  workflowVisibleEntityIds: string[];
  lastWorkflowEventId: string | null;
  lastWorkflowEventJson: string | null;
  lastWorkflowAtMs: number;
  videoAvailability: Record<string, 'queued' | 'available'>;
  videoProgress: Record<string, number>;
  history: ActionRecord[];
  replay: ReplayState;
}

export type DomainErrorCode =
  | 'INVALID_TRANSITION'
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'VIDEO_VERSION_MISMATCH'
  | 'SCRIPT_NOT_CONFIRMED'
  | 'DELIVERY_ATTACHMENT_MISMATCH'
  | 'CONFIRMATION_REQUIRED'
  | 'STALE_VERSION'
  | 'DUPLICATE_EVENT'
  | 'CORRUPT_EVENT'
  | 'REPLAY_ONLY_EVENT'
  | 'ATTEMPT_NOT_FOUND';

export interface DomainError {
  code: DomainErrorCode;
  message: string;
  fieldErrors?: Array<{ path: string; message: string }>;
}

export interface DomainSuccess<T> {
  ok: true;
  value: T;
  warnings?: string[];
}

export interface DomainFailure {
  ok: false;
  error: DomainError;
}

export type DomainResult<T> = DomainSuccess<T> | DomainFailure;

export interface CreateStateOptions {
  sessionId: string;
  packageHash: string;
  createdAt: string;
}

export interface StageCommandContext {
  nowIso: string;
  virtualMs: number;
  runKey?: string;
}

export interface ExecuteStageInput extends StageCommandContext {
  stage: 'discovery' | 'analysis' | 'video';
}

export interface SaveScriptDraftInput {
  baseVersionId: string;
  content: ScriptEditable;
  nowIso: string;
}

export interface SelectScriptInput {
  scriptVersionId: string;
  nowIso: string;
}

export interface ConfirmScriptInput {
  scriptVersionId: string;
  nowIso: string;
}

export interface SaveDeliveryDraftInput {
  planId: string;
  recipientIds?: string[];
  recipientsOverride?: Array<{ id: string; displayName: string; email: string }>;
  subject: string;
  body: string;
  scheduledVirtualMs: number;
  nowIso: string;
}

export interface SimulateDeliveryInput {
  draftId: string;
  confirmedVideoId: string;
  failureCase: null | 'delivery_failed';
  nowIso: string;
  virtualTimeMs: number;
}

export interface AdvanceDeliveryAttemptInput {
  attemptId: string;
  virtualTimeMs: number;
  nowIso: string;
}

export interface FailStageInput {
  stage: StageName;
  errorCode: string;
  nowIso: string;
}

export interface RetryStageInput {
  stage: StageName;
  failedAttemptId: string;
  nowIso: string;
  virtualMs: number;
  failureCase?: null | 'delivery_failed';
}

export interface ResetSessionInput {
  confirmation: 'RESET_THIS_SESSION';
  nowIso: string;
}

export function isOk<T>(result: DomainResult<T>): result is DomainSuccess<T> {
  return result.ok;
}

export function isError<T>(result: DomainResult<T>): result is DomainFailure {
  return !result.ok;
}

export type { ScenarioPackage as Package };
