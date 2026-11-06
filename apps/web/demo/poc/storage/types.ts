import type { ActionRecord, DomainState } from '../domain/types';
import type { ContentDeliveryState, ContentProfile } from '../domain/content-only';

export type { ActionRecord } from '../domain/types';

export type StorageMode = 'indexeddb' | 'memory';
export type ReplaySpeed = 1 | 2 | 4;
/** Optional session purpose added by the Interactive Mock Product batch. */
export type SessionPurpose = 'editing' | 'activity';

export interface ReplayRuntime {
  speed: ReplaySpeed;
  virtualMs: number;
}

export interface WorkflowRuntime {
  transport: 'idle' | 'playing' | 'paused';
  virtualMs: number;
}

export interface PersistedSession {
  schemaVersion: '1.0.0';
  id: string;
  scenarioId: string;
  scenarioVersion: string;
  packageHash: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  mode: 'mock';
  storageMode: StorageMode;
  profile?: ContentProfile;
  /** Included by the Interactive Mock Product batch; legacy records omit it. */
  purpose?: SessionPurpose;
  contentDelivery?: ContentDeliveryState;
  state: DomainState;
  replayRuntime: ReplayRuntime;
  workflowRuntime: WorkflowRuntime;
}

export interface SessionSummary {
  id: string;
  scenarioId: string;
  scenarioVersion: string;
  packageHash: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  mode: 'mock';
  storageMode: StorageMode;
  profile?: ContentProfile;
}

export interface PackageMeta {
  id: string;
  scenarioId: string;
  scenarioVersion: string;
  packageHash: string;
  schemaVersion: '1.0.0';
  storedAt: string;
}

export interface CommandReceipt {
  key: string;
  sessionId: string;
  operation: string;
  idempotencyKey: string;
  bodyHash: string;
  response: unknown;
  revision: number;
  createdAt: string;
}

export interface HistoryBundle {
  sessionId: string;
  items: ActionRecord[];
}

/** Explicit campaign→working-session binding, written only by explicit Edit/Confirm. */
export interface WorkspaceLink {
  campaignId: string;
  packageHash: string;
  sessionId: string;
}

/** Persisted ordinary product export: immutable record plus the exact ZIP bytes. */
export interface StoredProductExport {
  record: import('../api/product-contract').ProductExportRecord;
  download: import('../api/types').DownloadResult;
}

/** AS-005 campaign pack record stored in the same `productExports` store. */
export interface StoredCampaignPackExport {
  record: import('../api/provided-asset-contract').CampaignPackRecord;
  download: import('../api/types').DownloadResult;
}

/**
 * FLOW-001 `socialWorkflows` aggregate (DB version 3), keyed
 * `${campaignId}@${packageHash}`. Drafts, immutable attempts and idempotency
 * receipts live together so a simulated publish is a single atomic put.
 */
export type StoredSocialWorkflow = import('../api/flow-contract').SocialWorkflowState;

export type StorageErrorCode = 'STORAGE_UNAVAILABLE' | 'STORAGE_QUOTA' | 'CORRUPT_SESSION' | 'SCHEMA_UNSUPPORTED';

export interface StorageFailure {
  ok: false;
  code: StorageErrorCode;
  message: string;
}

export interface CreateSessionOutcome {
  kind: 'created' | 'replayed' | 'conflict';
  record?: PersistedSession;
  receipt?: CommandReceipt;
  failure?: { ok: false; code: string; message: string };
}

export interface MutationSuccess {
  ok: true;
  next: PersistedSession;
  response: unknown;
  receipt: CommandReceipt;
}

export interface MutationFailure {
  ok: false;
  kind: 'error' | 'revision' | 'idempotent-replay' | 'idempotency-conflict' | 'storage';
  code: string;
  message: string;
  fieldErrors?: Array<{ path: string; message: string }>;
  receipt?: CommandReceipt;
}

export type MutationOutcome = MutationSuccess | MutationFailure;

export interface MutationInput {
  sessionId: string;
  expectedRevision: number;
  operation: string;
  idempotencyKey: string;
  bodyHash: string;
  nowIso: string;
  mutate: (current: PersistedSession) => MutationComputation;
}

export type MutationComputation =
  | { ok: true; next: PersistedSession; response: unknown }
  | { ok: false; code: string; message: string; fieldErrors?: Array<{ path: string; message: string }> };

export type RecoveryStatus = 'valid' | 'corrupt' | 'unsupported';

export interface RecoveryExport {
  schemaVersion: '1.0.0';
  mode: 'mock';
  status: RecoveryStatus;
  error: { code: 'CORRUPT_SESSION' | 'SCHEMA_UNSUPPORTED'; message: string } | null;
  exportedAt: string;
  session: unknown;
  history: ActionRecord[];
  receipts: CommandReceipt[];
}

export interface PersistedSessionInspection {
  ok: boolean;
  code?: 'CORRUPT_SESSION' | 'SCHEMA_UNSUPPORTED';
  message?: string;
  record?: PersistedSession;
}

export interface PocStorage {
  readonly mode: StorageMode;
  open(): Promise<void>;
  close(): Promise<void>;
  kind: StorageMode;
  listSessions(): Promise<PersistedSession[]>;
  getSession(sessionId: string): Promise<PersistedSession | null>;
  getHistory(sessionId: string): Promise<ActionRecord[]>;
  getReceipt(sessionId: string, operation: string, idempotencyKey: string): Promise<CommandReceipt | null>;
  createSession(
    record: PersistedSession,
    creationKey: string,
    bodyHash: string,
    packageMeta: PackageMeta,
    response: { data: unknown; meta: unknown },
  ): Promise<CreateSessionOutcome>;
  getCreationReceipt(creationKey: string): Promise<CommandReceipt | null>;
  mutateSession(input: MutationInput): Promise<MutationOutcome>;
  exportSession(sessionId: string): Promise<RecoveryExport | null>;
  putPackageMeta(meta: PackageMeta): Promise<void>;
  getPackageMeta(packageHash: string): Promise<PackageMeta | null>;
  /** workspaceLinks store (campaignId@packageHash key) added in DB version 2. */
  getWorkspaceLink(campaignId: string, packageHash: string): Promise<WorkspaceLink | null>;
  putWorkspaceLink(link: WorkspaceLink): Promise<void>;
  listWorkspaceLinks(): Promise<WorkspaceLink[]>;
  /** productExports store (exportId key) added in DB version 2. */
  putProductExport(value: StoredProductExport): Promise<void>;
  getProductExport(exportId: string): Promise<StoredProductExport | null>;
  listProductExports(): Promise<StoredProductExport[]>;
  updateProductExportStatus(exportId: string, status: 'prepared' | 'download_triggered'): Promise<StoredProductExport | null>;
  /** AS-005 records share the productExports store but are discriminated by record.kind. */
  putCampaignPackExport(value: StoredCampaignPackExport): Promise<void>;
  getCampaignPackExport(exportId: string): Promise<StoredCampaignPackExport | null>;
  listCampaignPackExports(): Promise<StoredCampaignPackExport[]>;
  updateCampaignPackExportStatus(exportId: string, status: 'prepared' | 'download_triggered'): Promise<StoredCampaignPackExport | null>;
  /**
   * FLOW-001 `socialWorkflows` store added in DB version 3. Keyed
   * `${campaignId}@${packageHash}`; a whole aggregate is written atomically so a
   * publish cannot leave an attempt without its draft status/receipt.
   */
  getSocialWorkflow(key: string): Promise<StoredSocialWorkflow | null>;
  putSocialWorkflow(value: StoredSocialWorkflow): Promise<void>;
  listSocialWorkflows(): Promise<StoredSocialWorkflow[]>;
}

export function receiptKey(sessionId: string, operation: string, idempotencyKey: string): string {
  return `${sessionId}|${operation}|${idempotencyKey}`;
}

export function createReceiptKeyForCreation(creationKey: string): string {
  return `create|${creationKey}`;
}

export function validatePersistedSession(value: unknown): value is PersistedSession {
  return inspectPersistedSession(value).ok;
}

const STAGE_NAMES = ['discovery', 'analysis', 'video', 'delivery'] as const;
const STAGE_STATUSES = ['locked', 'ready', 'running', 'awaiting_confirmation', 'completed', 'failed', 'stale'] as const;
const REPLAY_TRANSPORTS = ['idle', 'playing', 'paused', 'ended', 'error'] as const;
const WORKFLOW_TRANSPORTS = ['idle', 'playing', 'paused'] as const;
const ATTEMPT_STATUSES = ['running', 'completed', 'failed', 'canceled'] as const;
const HISTORY_OUTCOMES = ['applied', 'failed', 'reset', 'canceled'] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isIsoTime(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isStatus(value: unknown): value is string {
  return typeof value === 'string' && (STAGE_STATUSES as readonly string[]).includes(value);
}

function inspectWorkflow(value: unknown): value is Record<string, string> {
  if (!isObject(value)) return false;
  const keys = Object.keys(value).sort();
  if (keys.length !== STAGE_NAMES.length || keys.join('|') !== [...STAGE_NAMES].sort().join('|')) return false;
  return STAGE_NAMES.every((stage) => isStatus(value[stage]));
}

function inspectStageAttempts(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.every((attempt) => {
    if (!isObject(attempt)) return false;
    return isString(attempt.id)
      && typeof attempt.stage === 'string'
      && (STAGE_NAMES as readonly string[]).includes(attempt.stage)
      && isNonNegativeInteger(attempt.ordinal)
      && isStringArray(attempt.inputRefs)
      && typeof attempt.status === 'string'
      && (ATTEMPT_STATUSES as readonly string[]).includes(attempt.status)
      && Number.isInteger(attempt.lastSequence)
      && Number.isInteger(attempt.sourceStartSequence)
      && Number.isInteger(attempt.sourceEndSequence)
      && (attempt.lastEventJson === null || isString(attempt.lastEventJson))
      && isNonNegativeInteger(attempt.lastAtMs)
      && isIsoTime(attempt.startedAt)
      && (attempt.finishedAt === null || isIsoTime(attempt.finishedAt))
      && (attempt.errorCode === null || isString(attempt.errorCode));
  });
}

function inspectHistory(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.every((record) => {
    if (!isObject(record)) return false;
    return isString(record.id)
      && isNonNegativeInteger(record.sequence)
      && isString(record.action)
      && isStringArray(record.entityIds)
      && isIsoTime(record.occurredAt)
      && typeof record.outcome === 'string'
      && (HISTORY_OUTCOMES as readonly string[]).includes(record.outcome)
      && record.mode === 'mock';
  });
}

function inspectProjection(value: unknown): boolean {
  if (!isObject(value)) return false;
  if (!inspectWorkflow(value.workflow)) return false;
  if (!isStringArray(value.visibleEntityIds)) return false;
  if (!isNullableString(value.activeScriptVersionId) || !isNullableString(value.activeVideoId)) return false;
  if (!isStringArray(value.deliveryRecordIds) || !isNullableString(value.confirmedScriptVersionId)) return false;
  if (!isObject(value.videoAvailability)) return false;
  for (const availability of Object.values(value.videoAvailability)) {
    if (availability !== 'queued' && availability !== 'available') return false;
  }
  if (!isObject(value.videoProgress)) return false;
  for (const progress of Object.values(value.videoProgress)) {
    if (!Number.isInteger(progress) || (progress as number) < 0 || (progress as number) > 100) return false;
  }
  return true;
}

function inspectReplay(value: unknown): boolean {
  if (!isObject(value)) return false;
  return isNonNegativeInteger(value.cursorSequence)
    && typeof value.transport === 'string'
    && (REPLAY_TRANSPORTS as readonly string[]).includes(value.transport)
    && inspectProjection(value.projection)
    && isNonNegativeInteger(value.lastAtMs)
    && isNullableString(value.lastEventId)
    && (value.lastEventJson === null || isString(value.lastEventJson));
}

export function inspectPersistedSession(value: unknown): PersistedSessionInspection {
  if (!isObject(value)) {
    return { ok: false, code: 'CORRUPT_SESSION', message: 'Persisted session payload is not an object.' };
  }
  if (value.schemaVersion !== '1.0.0') {
    return {
      ok: false,
      code: 'SCHEMA_UNSUPPORTED',
      message: `Persisted session schemaVersion must be 1.0.0; found ${JSON.stringify(value.schemaVersion)}. Old sessions must be exported, not migrated silently.`,
    };
  }
  const invalid = (message: string): PersistedSessionInspection => ({ ok: false, code: 'CORRUPT_SESSION', message });
  if (!isString(value.id) || !isString(value.scenarioId) || !isString(value.scenarioVersion) || !isString(value.packageHash)) {
    return invalid('Session id/scenario id/version/packageHash are required strings.');
  }
  if (!isNonNegativeInteger(value.revision)) return invalid('Session revision must be a non-negative integer.');
  if (!isIsoTime(value.createdAt) || !isIsoTime(value.updatedAt)) return invalid('Session timestamps must be ISO timestamps.');
  if (value.mode !== 'mock' || !['indexeddb', 'memory'].includes(String(value.storageMode))) {
    return invalid('Session mode/storageMode is invalid.');
  }
  if (value.profile !== undefined && value.profile !== 'complete' && value.profile !== 'content_only') {
    return invalid('Session profile is invalid.');
  }
  if (value.purpose !== undefined && value.purpose !== 'editing' && value.purpose !== 'activity') {
    return invalid('Session purpose is invalid.');
  }
  if (value.contentDelivery !== undefined) {
    if (!isObject(value.contentDelivery) || !['draft', 'awaiting_confirmation', 'running', 'completed', 'failed'].includes(String(value.contentDelivery.status))) {
      return invalid('Session contentDelivery is malformed.');
    }
    if (!Array.isArray(value.contentDelivery.attempts) || !(value.contentDelivery.draft === null || isObject(value.contentDelivery.draft))) {
      return invalid('Session contentDelivery draft/attempts are malformed.');
    }
  }
  if (value.profile === 'content_only' && !isObject(value.contentDelivery)) {
    return invalid('content_only sessions require contentDelivery state.');
  }
  if (!isObject(value.replayRuntime) || ![1, 2, 4].includes(value.replayRuntime.speed as number)) {
    return invalid('replayRuntime.speed must be 1, 2 or 4.');
  }
  if (!Number.isFinite(value.replayRuntime.virtualMs) || (value.replayRuntime.virtualMs as number) < 0) {
    return invalid('replayRuntime.virtualMs must be finite and non-negative.');
  }
  if (
    !isObject(value.workflowRuntime)
    || !(WORKFLOW_TRANSPORTS as readonly string[]).includes(String(value.workflowRuntime.transport))
    || !Number.isFinite(value.workflowRuntime.virtualMs)
    || (value.workflowRuntime.virtualMs as number) < 0
  ) {
    return invalid('workflowRuntime transport/virtualMs is invalid.');
  }
  const state = value.state;
  if (!isObject(state)) return invalid('Session state is missing.');
  if (state.sessionId !== value.id || state.scenarioId !== value.scenarioId) {
    return invalid('Session state id/scenarioId does not match the envelope.');
  }
  if (state.scenarioVersion !== value.scenarioVersion || state.packageHash !== value.packageHash) {
    return invalid('Session state scenario version/packageHash does not match the envelope.');
  }
  if (!isNonNegativeInteger(state.revision) || state.revision !== value.revision) {
    return invalid('Session state revision must equal the envelope revision.');
  }
  if (!isIsoTime(state.createdAt)) return invalid('Domain state createdAt is invalid.');
  if (!inspectWorkflow(state.workflow)) return invalid('workflow must contain exactly the four stages with valid statuses.');
  for (const key of ['activeBriefId', 'activeScriptVersionId', 'activeVideoId', 'deliveryDraftId']) {
    if (!isNullableString(state[key])) return invalid(`Domain state ${key} must be string|null.`);
  }
  if (!Array.isArray(state.userVersions) || !Array.isArray(state.deliveryDrafts)) return invalid('userVersions/deliveryDrafts must be arrays.');
  if (!Array.isArray(state.stageAttempts) || !inspectStageAttempts(state.stageAttempts)) return invalid('stageAttempts is invalid/corrupt.');
  if (!Array.isArray(state.deliveryAttempts) || !Array.isArray(state.pendingDeliveryAttempts)) return invalid('delivery attempts arrays are missing.');
  if (!Array.isArray(state.deliveryRecords)) return invalid('deliveryRecords must be an array.');
  if (!isNonNegativeInteger(state.workflowCursor)) return invalid('workflowCursor must be a non-negative integer.');
  if (!isStringArray(state.workflowVisibleEntityIds)) return invalid('workflowVisibleEntityIds must be string[].');
  if (!isNullableString(state.lastWorkflowEventId)) return invalid('lastWorkflowEventId must be string|null.');
  if (state.lastWorkflowEventJson !== null && !isString(state.lastWorkflowEventJson)) return invalid('lastWorkflowEventJson must be string|null.');
  if (!isNonNegativeInteger(state.lastWorkflowAtMs)) return invalid('lastWorkflowAtMs must be a non-negative integer.');
  if (!isObject(state.videoAvailability)) return invalid('videoAvailability must be an object.');
  for (const availability of Object.values(state.videoAvailability)) {
    if (availability !== 'queued' && availability !== 'available') return invalid('videoAvailability has invalid values.');
  }
  if (!isObject(state.videoProgress)) return invalid('videoProgress must be an object.');
  for (const progress of Object.values(state.videoProgress)) {
    if (!Number.isInteger(progress) || (progress as number) < 0 || (progress as number) > 100) return invalid('videoProgress has invalid values.');
  }
  if (!inspectHistory(state.history)) return invalid('history must be an array of valid ActionRecords.');
  if (!inspectReplay(state.replay)) return invalid('replay state/projection is invalid.');
  return { ok: true, record: value as unknown as PersistedSession };
}
