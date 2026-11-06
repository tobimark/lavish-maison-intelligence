import {
  advanceDeliveryAttempt,
  adaptContentOnlyPackage,
  applyWorkflowEvent,
  confirmScript,
  createInitialContentDelivery,
  createInitialState,
  createReplayState,
  executeStage as domainExecuteStage,
  findPackageScript,
  findUserVersion,
  reduceReplay,
  reduceReplayEvent,
  resetSession as domainResetSession,
  retryStage as domainRetryStage,
  saveDeliveryDraft as domainSaveDeliveryDraft,
  saveScriptDraft as domainSaveScriptDraft,
  selectScript as domainSelectScript,
  setReplayTransport,
  simulateDelivery as domainSimulateDelivery,
  type ContentAttachment,
  type ContentDeliveryAttempt,
  type ContentDeliveryDraft,
  type ContentDeliveryRecipient,
  type ContentDeliveryState,
  type DeliveryAttempt,
  type DeliveryDraft,
  type PendingDeliveryAttempt,
  type DomainResult,
  type DomainState,
  type Event,
  type ScenarioPackage,
  type ScriptEditable,
  type ScriptVersion,
  type StageName,
  type UserScriptVersion,
} from '../domain';
import { scriptEditable } from '../domain';
import { createZip } from '../downloads/zip';
import {
  buildContentPackFiles,
  defaultContentBody,
  defaultContentPlan,
  defaultContentRecipients,
  defaultContentSubject,
  listContentScripts,
  resolveContentScript,
  safeName,
} from './content-delivery';
import { BASE_ENTITY_KINDS, collectEntityIndex } from '../validation/semantic-rules.mjs';
import type {
  ApiError,
  ApiErrorCode,
  ApiMeta,
  ApiResult,
  CommandContext,
  ContentDeliverySaveInput,
  ContentDeliverySimulateInput,
  ContentDeliveryView,
  DownloadResult,
  EntityData,
  LoadedScenario,
  MockApi,
  MockApiOptions,
  ReplayCommandBase,
  ScenarioListItem,
  ScenarioSource,
  ScenarioView,
  SessionView,
  StageData,
} from './types';
import type {
  CommandReceipt,
  MutationComputation,
  PackageMeta,
  PersistedSession,
  PocStorage,
  ReplaySpeed,
} from '../storage/types';
import type {
  BeginCampaignEditInput,
  CampaignBrowseInput,
  PreparedProductExport,
  ProductExportRecord,
  ProductLocale,
  ProductReadFilter,
  ProductSignalView,
  ProductSource,
  ProductVersionRef,
} from './product-contract';
import { createProductQueries } from './product-queries';
import { createProductCommands } from './product-commands';
import type {
  AssetLibraryItem,
  CampaignPackRecord,
  CampaignVersionRef,
  PreparedCampaignPack,
  ProvidedAsset,
  ProvidedAssetSet,
  ProvidedCreativeItem,
} from './provided-asset-contract';
import { providedDownload, type ProvidedAssetSource } from './provided-asset-source';
import { createFlowQueries } from './flow-queries';
import { createSocialCommands } from './flow-commands';
import type { CampaignPresentationSource } from './flow-source';
import type {
  FlowAwareMockApi,
  GetSocialDraftInput,
  GetSocialPostInput,
  ListSocialPostsInput,
  PrepareSocialDraftInput,
  ReviewSocialDraftInput,
  SaveSocialDraftInput,
  SimulateSocialPublishInput,
} from './flow-contract';

const STAGES: readonly StageName[] = ['discovery', 'analysis', 'video', 'delivery'];
const SCRIPT_EDITABLE_KEYS = new Set([
  'title', 'hook', 'message', 'cta', 'shots', 'subtitles', 'caption', 'hashtags',
]);
const RETRYABLE_CODES = new Set<ApiErrorCode>(['STORAGE_UNAVAILABLE', 'STORAGE_QUOTA']);

class InputFailure extends Error {
  readonly fieldErrors: Array<{ path: string; message: string }>;

  constructor(message: string, fieldErrors: Array<{ path: string; message: string }> = []) {
    super(message);
    this.name = 'InputFailure';
    this.fieldErrors = fieldErrors;
  }
}

class PackageChangedFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PackageChangedFailure';
  }
}

function assertObject(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new InputFailure(`${path} must be an object.`, [{ path, message: 'must be an object' }]);
  }
  return value as Record<string, unknown>;
}

function assertExactKeys(value: unknown, allowed: readonly string[], path: string): Record<string, unknown> {
  const object = assertObject(value, path);
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(object)) {
    if (!allowedSet.has(key)) {
      throw new InputFailure(`${path}.${key} is not an allowed field.`, [{ path: `${path}.${key}`, message: 'unknown field' }]);
    }
  }
  return object;
}

function assertNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new InputFailure(`${path} must be a non-empty string.`, [{ path, message: 'must be a non-empty string' }]);
  }
  return value;
}

function isScriptEditableShape(value: unknown): value is ScriptEditable {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const object = value as Record<string, unknown>;
  return typeof object.title === 'string'
    && typeof object.hook === 'string'
    && typeof object.message === 'string'
    && typeof object.cta === 'string'
    && Array.isArray(object.shots)
    && Array.isArray(object.subtitles)
    && typeof object.caption === 'string'
    && Array.isArray(object.hashtags);
}

function validateScriptContent(value: unknown, path: string): ScriptEditable {
  const object = assertObject(value, path);
  for (const key of Object.keys(object)) {
    if (!SCRIPT_EDITABLE_KEYS.has(key)) {
      throw new InputFailure(`${path}.${key} is not part of the editable script contract.`, [{ path: `${path}.${key}`, message: 'unknown field' }]);
    }
  }
  if (!isScriptEditableShape(object)) {
    throw new InputFailure(`${path} is not a valid ScriptEditable object.`, [{ path, message: 'invalid ScriptEditable' }]);
  }
  return object;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('WebCrypto SHA-256 is unavailable.');
  const digest = await subtle.digest('SHA-256', bytes as unknown as BufferSource);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function utf8Bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function errorCodeForDomain(code: string): ApiErrorCode {
  switch (code) {
    case 'INVALID_INPUT':
    case 'INVALID_TRANSITION':
    case 'NOT_FOUND':
    case 'VIDEO_VERSION_MISMATCH':
    case 'REVISION_CONFLICT':
    case 'IDEMPOTENCY_CONFLICT':
    case 'STORAGE_UNAVAILABLE':
    case 'STORAGE_QUOTA':
    case 'SESSION_NOT_FOUND':
    case 'CORRUPT_SESSION':
    case 'PACKAGE_CHANGED':
    case 'ENTITY_NOT_REACHED':
      return code;
    case 'CONFIRMATION_REQUIRED':
      return 'INVALID_INPUT';
    case 'ATTEMPT_NOT_FOUND':
      return 'NOT_FOUND';
    case 'REPLAY_ONLY_EVENT':
    case 'DUPLICATE_EVENT':
    case 'CORRUPT_EVENT':
    case 'STALE_VERSION':
    case 'DELIVERY_ATTACHMENT_MISMATCH':
    case 'SCRIPT_NOT_CONFIRMED':
      return 'MOCK_FAILURE';
    default:
      return 'MOCK_FAILURE';
  }
}

function sessionSummary(record: PersistedSession) {
  return {
    id: record.id,
    scenarioId: record.scenarioId,
    scenarioVersion: record.scenarioVersion,
    packageHash: record.packageHash,
    revision: record.revision,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    mode: 'mock' as const,
    storageMode: record.storageMode,
    profile: record.profile ?? 'complete',
  };
}

function runningStage(state: DomainState): StageName | null {
  return STAGES.find((stage) => state.workflow[stage] === 'running') ?? null;
}

/** Preset AgentEvents are exposed through getEvents; only real user/clock actions are ActionHistory. */
function userHistory(history: DomainState['history']): DomainState['history'] {
  return history.filter((record) => !record.action.startsWith('event:'));
}

function contentReplayPrefixEnd(pkg: ScenarioPackage): number {
  const completed = pkg.events.data.events.find(
    (event) => event.stage === 'analysis' && event.type === 'stage.completed',
  );
  return completed?.sequence ?? 0;
}

function replayEventsFor(pkg: ScenarioPackage, profile: string | undefined): Event[] {
  const events = pkg.events.data.events;
  if (profile !== 'content_only') return [...events];
  return events.filter((event) => event.sequence <= contentReplayPrefixEnd(pkg));
}

function currentAttempt(state: DomainState, stage: StageName) {
  return state.stageAttempts.find((attempt) => attempt.stage === stage && attempt.status === 'running') ?? null;
}

export class BrowserMockApi implements FlowAwareMockApi {
  private readonly source: ScenarioSource;
  private readonly storage: PocStorage;
  private readonly now: () => string;
  private readonly virtualNow: () => number;
  private readonly providedAssetSource?: ProvidedAssetSource;
  private readonly presentationSource?: CampaignPresentationSource;
  private requestCounter = 0;
  private readonly queries: ReturnType<typeof createProductQueries>;
  private readonly productCommands: ReturnType<typeof createProductCommands>;
  private readonly flowQueries: ReturnType<typeof createFlowQueries>;
  private readonly socialCommands: ReturnType<typeof createSocialCommands>;

  constructor(options: MockApiOptions) {
    this.source = options.scenarioSource;
    this.storage = options.storage;
    this.now = options.now ?? (() => new Date().toISOString());
    this.virtualNow = options.virtualNow ?? (() => 0);
    this.providedAssetSource = options.providedAssetSource;
    this.presentationSource = options.presentationSource;
    this.queries = createProductQueries({
      source: this.source,
      storage: this.storage,
      now: this.now,
      toSessionView: (record) => this.toSessionView(record),
    });
    this.productCommands = createProductCommands({
      queries: this.queries,
      storage: this.storage,
      now: this.now,
      providedAssetSource: this.providedAssetSource,
      bridge: {
        createSessionForPurpose: (input) => this.createSessionForPurpose(input),
        getSession: (input) => this.getSession(input),
        executeStage: (ctx, input) => this.executeStage(ctx, input),
        selectScript: (ctx, input) => this.selectScript(ctx, input),
      },
    });
    // FLOW-001: same storage/facade, additive connected-journey read projection and
    // local social commands. No second backend/store/Agent framework.
    this.flowQueries = createFlowQueries({
      source: this.presentationSource,
      providedAssetSource: this.providedAssetSource,
      queries: this.queries,
      storage: this.storage,
      now: this.now,
      toSessionView: (record) => this.toSessionView(record),
    });
    this.socialCommands = createSocialCommands({
      queries: this.queries,
      flowQueries: this.flowQueries,
      storage: this.storage,
      now: this.now,
      simulateFailure: options.socialSimulateFailure,
    });
  }

  private requestId(): string {
    this.requestCounter += 1;
    return `req-${this.requestCounter}`;
  }

  private meta(sessionId: string | null, revision: number | null): ApiMeta {
    return this.metaWith(this.requestId(), sessionId, revision);
  }

  private metaWith(requestId: string, sessionId: string | null, revision: number | null): ApiMeta {
    return { mode: 'mock', schemaVersion: '1.0.0', requestId, sessionId, revision };
  }

  private success<T>(data: T, sessionId: string | null = null, revision: number | null = null): ApiResult<T> {
    return { ok: true, data, meta: this.meta(sessionId, revision) };
  }

  private failure<T>(
    code: ApiErrorCode,
    message: string,
    fieldErrors: Array<{ path: string; message: string }> = [],
    sessionId: string | null = null,
    revision: number | null = null,
  ): ApiResult<T> {
    const error: ApiError = { code, message, fieldErrors, retryable: RETRYABLE_CODES.has(code) };
    return { ok: false, error, meta: this.meta(sessionId, revision) };
  }

  private failureFromUnknown<T>(
    error: unknown,
    sessionId: string | null = null,
    revision: number | null = null,
  ): ApiResult<T> {
    if (error instanceof InputFailure) {
      return this.failure<T>('INVALID_INPUT', error.message, error.fieldErrors, sessionId, revision);
    }
    const message = error instanceof Error ? error.message : String(error);
    const storageCode = error && typeof error === 'object' && 'code' in error ? String((error as { code: unknown }).code) : '';
    if (storageCode === 'STORAGE_QUOTA' || message.startsWith('STORAGE_QUOTA')) return this.failure<T>('STORAGE_QUOTA', message, [], sessionId, revision);
    if (storageCode === 'CORRUPT_SESSION' || message.includes('CORRUPT_SESSION')) return this.failure<T>('CORRUPT_SESSION', message, [], sessionId, revision);
    if (storageCode === 'SCHEMA_UNSUPPORTED' || message.includes('SCHEMA_UNSUPPORTED')) return this.failure<T>('SCHEMA_UNSUPPORTED', message, [], sessionId, revision);
    if (error instanceof PackageChangedFailure) return this.failure<T>('PACKAGE_CHANGED', message, [], sessionId, revision);
    return this.failure<T>('STORAGE_UNAVAILABLE', message, [], sessionId, revision);
  }

  private async scenarioReadiness(scenarioId: string, scenarioVersion: string): Promise<ScenarioListItem | null> {
    const items = await this.source.list();
    return items.find((item) => item.scenarioId === scenarioId && (item.scenarioVersion === scenarioVersion || item.scenarioVersion === null)) ?? null;
  }

  private async loadScenarioById(scenarioId: string, scenarioVersion: string): Promise<LoadedScenario | null> {
    return this.source.get(scenarioId, scenarioVersion);
  }

  private async loadScenarioFor(record: PersistedSession): Promise<LoadedScenario> {
    const loaded = await this.loadScenarioById(record.scenarioId, record.scenarioVersion);
    if (!loaded) {
      throw new PackageChangedFailure(`Package ${record.scenarioId}@${record.scenarioVersion} is no longer available.`);
    }
    if (loaded.packageHash !== record.packageHash) {
      throw new PackageChangedFailure('The scenario package changed since this session was created; open a new session or export the old record.');
    }
    return loaded;
  }

  private toSessionView(record: PersistedSession): SessionView {
    const running = runningStage(record.state);
    const activeAttempt = record.state.stageAttempts.find((attempt) => attempt.status === 'running') ?? null;
    const playbackStage = running ?? activeAttempt?.stage ?? null;
    const replay: SessionView['replay'] = {
      ...record.state.replay,
      speed: record.replayRuntime.speed,
      virtualMs: record.replayRuntime.virtualMs,
    };
    return {
      id: record.id,
      scenarioId: record.scenarioId,
      scenarioVersion: record.scenarioVersion,
      packageHash: record.packageHash,
      revision: record.revision,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      mode: 'mock',
      storageMode: record.storageMode,
      profile: record.profile ?? 'complete',
      workflow: record.state.workflow,
      workflowPlayback: {
        stage: playbackStage,
        cursorSequence: activeAttempt?.lastSequence ?? record.state.workflowCursor,
        virtualMs: record.workflowRuntime.virtualMs,
        transport: record.workflowRuntime.transport,
      },
      contentDelivery: record.contentDelivery,
      activeBriefId: record.state.activeBriefId,
      activeScriptVersionId: record.state.activeScriptVersionId,
      activeVideoId: record.state.activeVideoId,
      userVersions: record.state.userVersions,
      deliveryDrafts: record.state.deliveryDrafts,
      deliveryAttempts: record.state.deliveryAttempts,
      stageAttempts: record.state.stageAttempts,
      replay,
      history: userHistory(record.state.history),
    };
  }

  private async requireSession(sessionId: string): Promise<PersistedSession> {
    const record = await this.storage.getSession(sessionId);
    if (!record) throw new InputFailure(`Session ${sessionId} was not found.`);
    return record;
  }

  private autoConsumeStage(record: PersistedSession, scenario: LoadedScenario, stage: StageName): DomainState {
    let state = record.state;
    const attempt = currentAttempt(state, stage);
    if (!attempt) return state;
    const stageEvents = scenario.package.events.data.events.filter(
      (event) => event.sequence >= attempt.sourceStartSequence && event.sequence <= attempt.sourceEndSequence,
    );
    for (const event of stageEvents) {
      if (stage === 'analysis' && event.type === 'script.presented' && state.workflow.analysis === 'awaiting_confirmation') {
        // Multiple EN/AR script.presented events are part of the same
        // presentation boundary; keep consuming them until the replay-only
        // script.confirmed marker.
        const applied = applyWorkflowEvent(state, scenario.package, event);
        if (!applied.ok) throw new InputFailure(`${applied.error.code}: ${applied.error.message}`);
        state = applied.value;
        continue;
      }
      if (state.workflow[stage] !== 'running') break;
      if (stage === 'analysis' && (event.type === 'script.confirmed' || event.type === 'stage.completed')) break;
      const applied = applyWorkflowEvent(state, scenario.package, event);
      if (!applied.ok) throw new InputFailure(`${applied.error.code}: ${applied.error.message}`);
      state = applied.value;
      if (state.workflow[stage] !== 'running') break;
    }
    return state;
  }

  private async buildPackageMeta(loaded: LoadedScenario, nowIso: string): Promise<PackageMeta> {
    return {
      id: loaded.packageHash,
      scenarioId: loaded.scenarioId,
      scenarioVersion: loaded.scenarioVersion,
      packageHash: loaded.packageHash,
      schemaVersion: '1.0.0',
      storedAt: nowIso,
    };
  }

  private validateContext(ctx: CommandContext): { sessionId: string; expectedRevision: number; idempotencyKey: string } {
    const object = assertExactKeys(ctx, ['sessionId', 'expectedRevision', 'idempotencyKey'], 'context');
    return {
      sessionId: assertNonEmptyString(object.sessionId, 'context.sessionId'),
      expectedRevision: object.expectedRevision as number,
      idempotencyKey: assertNonEmptyString(object.idempotencyKey, 'context.idempotencyKey'),
    };
  }

  private validateRevision(expectedRevision: unknown): number {
    if (!Number.isInteger(expectedRevision) || (expectedRevision as number) < 0) {
      throw new InputFailure('context.expectedRevision must be a non-negative integer.', [{ path: 'context.expectedRevision', message: 'invalid revision' }]);
    }
    return expectedRevision as number;
  }

  private async runCommand<T>(
    ctxInput: CommandContext,
    operation: string,
    body: unknown,
    compute: (
      current: PersistedSession,
      loaded: LoadedScenario,
      context: { nowIso: string; virtualMs: number },
    ) => { ok: true; state: DomainState; response: (next: PersistedSession) => unknown; replayRuntime?: Partial<PersistedSession['replayRuntime']>; workflowRuntime?: Partial<PersistedSession['workflowRuntime']>; contentDelivery?: ContentDeliveryState }
      | { ok: false; code: string; message: string; fieldErrors?: Array<{ path: string; message: string }> },
  ): Promise<ApiResult<T>> {
    try {
      const ctxObject = assertExactKeys(ctxInput, ['sessionId', 'expectedRevision', 'idempotencyKey'], 'context');
      const ctx = {
        sessionId: assertNonEmptyString(ctxObject.sessionId, 'context.sessionId'),
        expectedRevision: this.validateRevision(ctxObject.expectedRevision),
        idempotencyKey: assertNonEmptyString(ctxObject.idempotencyKey, 'context.idempotencyKey'),
      };
      const bodyHash = await sha256Hex(utf8Bytes(canonicalJson(body)));
      const existingReceipt = await this.storage.getReceipt(ctx.sessionId, operation, ctx.idempotencyKey);
      if (existingReceipt) {
        if (existingReceipt.bodyHash !== bodyHash) {
          return this.failure<T>('IDEMPOTENCY_CONFLICT', 'Idempotency key was reused with a different request body.', [], ctx.sessionId, null);
        }
        const stored = existingReceipt.response as { data: unknown; meta: ApiMeta | null };
        return {
          ok: true,
          data: stored.data as T,
          meta: stored.meta ?? this.meta(ctx.sessionId, existingReceipt.revision),
        };
      }
      const current = await this.storage.getSession(ctx.sessionId);
      if (!current) return this.failure<T>('SESSION_NOT_FOUND', `Unknown session ${ctx.sessionId}.`);
      const loaded = await this.loadScenarioFor(current);
      const nowIso = this.now();
      const virtualMs = this.virtualNow();
      const commandRequestId = this.requestId();
      const outcome = await this.storage.mutateSession({
        sessionId: ctx.sessionId,
        expectedRevision: ctx.expectedRevision,
        operation,
        idempotencyKey: ctx.idempotencyKey,
        bodyHash,
        nowIso,
        mutate: (session): MutationComputation => {
          const computed = compute(session, loaded, { nowIso, virtualMs });
          if (!computed.ok) {
            return { ok: false, code: computed.code, message: computed.message, fieldErrors: computed.fieldErrors };
          }
          const invalidatesContentDraft =
            session.profile === 'content_only'
            && session.contentDelivery?.draft
            && ['saveScriptDraft', 'selectScript', 'confirmScript'].includes(operation);
          const next: PersistedSession = {
            ...session,
            revision: session.revision + 1,
            updatedAt: nowIso,
            state: { ...computed.state, revision: session.revision + 1 },
            replayRuntime: { ...session.replayRuntime, ...computed.replayRuntime },
            workflowRuntime: { ...session.workflowRuntime, ...computed.workflowRuntime },
            contentDelivery: computed.contentDelivery
              ?? (invalidatesContentDraft
                ? { draft: null, attempts: session.contentDelivery?.attempts ?? [], status: 'draft' }
                : session.contentDelivery),
          };
          return {
            ok: true,
            next,
            response: {
              data: computed.response(next),
              meta: this.metaWith(commandRequestId, ctx.sessionId, next.revision),
            },
          };
        },
      });
      if (outcome.ok === false) {
        if (outcome.kind === 'idempotent-replay' && outcome.receipt) {
          const stored = outcome.receipt.response as { data: unknown; meta: ApiMeta | null };
          return {
            ok: true,
            data: stored.data as T,
            meta: stored.meta ?? this.meta(ctx.sessionId, outcome.receipt.revision),
          };
        }
        if (outcome.kind === 'revision') return this.failure<T>('REVISION_CONFLICT', outcome.message, [], ctx.sessionId, null);
        if (outcome.kind === 'idempotency-conflict') return this.failure<T>('IDEMPOTENCY_CONFLICT', outcome.message, [], ctx.sessionId, null);
        if (outcome.kind === 'storage') {
          const code = errorCodeForDomain(outcome.code);
          return this.failure<T>(code, outcome.message, outcome.fieldErrors ?? [], ctx.sessionId, null);
        }
        return this.failure<T>(errorCodeForDomain(outcome.code), outcome.message, outcome.fieldErrors ?? [], ctx.sessionId, null);
      }
      const data = (outcome.response as { data: unknown }).data as T;
      const responseMeta = (outcome.response as { meta: ApiMeta }).meta;
      return { ok: true, data, meta: responseMeta };
    } catch (error) {
      return this.failureFromUnknown<T>(error);
    }
  }

  async listScenarios(): Promise<ApiResult<{ items: ScenarioListItem[] }>> {
    try {
      const items = await this.source.list();
      return this.success({ items });
    } catch (error) {
      return this.failureFromUnknown(error);
    }
  }

  async getScenario(input: { scenarioId: string; scenarioVersion: string }): Promise<ApiResult<ScenarioView>> {
    try {
      const object = assertExactKeys(input, ['scenarioId', 'scenarioVersion'], 'input');
      const scenarioId = assertNonEmptyString(object.scenarioId, 'input.scenarioId');
      const scenarioVersion = assertNonEmptyString(object.scenarioVersion, 'input.scenarioVersion');
      const listed = await this.scenarioReadiness(scenarioId, scenarioVersion);
      if (!listed || (listed.readiness !== 'ready' && listed.readiness !== 'content_ready')) {
        return this.failure('SCENARIO_NOT_READY', `Scenario ${scenarioId}@${scenarioVersion} is not ready.`);
      }
      const loaded = await this.loadScenarioById(scenarioId, scenarioVersion);
      if (!loaded) return this.failure('SCENARIO_NOT_READY', `Scenario ${scenarioId}@${scenarioVersion} is not available.`);
      return this.success({
        scenarioId,
        scenarioVersion,
        packageHash: loaded.packageHash,
        manifest: loaded.package.manifest,
        brand: loaded.package.brand,
        assets: loaded.package.assets.data.assets,
        profile: loaded.profile ?? 'complete',
        ...(loaded.contentPackage ? { contentPackage: loaded.contentPackage } : {}),
      });
    } catch (error) {
      return this.failureFromUnknown(error);
    }
  }

  async createSession(input: { scenarioId: string; scenarioVersion: string; creationKey: string }): Promise<ApiResult<SessionView>> {
    return this.createSessionForPurpose({ ...input, purpose: 'editing' });
  }

  /**
   * Internal additive creation used by the Interactive Mock Product commands.
   * The public createSession stays byte-for-byte compatible and always creates
   * an editing-purpose session; activity replay uses its own purpose so it can
   * never be mistaken for a working script session.
   */
  async createSessionForPurpose(input: {
    scenarioId: string;
    scenarioVersion: string;
    creationKey: string;
    purpose: 'editing' | 'activity';
  }): Promise<ApiResult<SessionView>> {
    try {
      const object = assertExactKeys(input, ['scenarioId', 'scenarioVersion', 'creationKey', 'purpose'], 'input');
      const scenarioId = assertNonEmptyString(object.scenarioId, 'input.scenarioId');
      const scenarioVersion = assertNonEmptyString(object.scenarioVersion, 'input.scenarioVersion');
      const creationKey = assertNonEmptyString(object.creationKey, 'input.creationKey');
      if (object.purpose !== 'editing' && object.purpose !== 'activity') {
        throw new InputFailure('input.purpose must be editing or activity.');
      }
      const purpose = object.purpose;
      const bodyHash = await sha256Hex(utf8Bytes(canonicalJson({ scenarioId, scenarioVersion, creationKey, purpose })));

      // Receipt-first: a repeated creation returns the original response even if
      // the session has since advanced or the package is no longer available.
      const existingReceipt = await this.storage.getCreationReceipt(creationKey);
      if (existingReceipt) {
        if (existingReceipt.bodyHash !== bodyHash) {
          return this.failure('IDEMPOTENCY_CONFLICT', 'Creation key was reused with a different request body.');
        }
        const stored = existingReceipt.response as { data: unknown; meta: ApiMeta | null };
        if (!stored?.data) return this.failure('STORAGE_UNAVAILABLE', 'Stored creation receipt is malformed; nothing was created.');
        return {
          ok: true,
          data: stored.data as SessionView,
          meta: stored.meta ?? this.meta(existingReceipt.sessionId, existingReceipt.revision),
        };
      }

      const listed = await this.scenarioReadiness(scenarioId, scenarioVersion);
      if (!listed || (listed.readiness !== 'ready' && listed.readiness !== 'content_ready')) {
        return this.failure('SCENARIO_NOT_READY', `Scenario ${scenarioId}@${scenarioVersion} is not ready.`);
      }
      const loaded = await this.loadScenarioById(scenarioId, scenarioVersion);
      if (!loaded) return this.failure('SCENARIO_NOT_READY', `Scenario ${scenarioId}@${scenarioVersion} is not ready.`);
      const profile = loaded.profile ?? 'complete';
      const createdAt = this.now();
      const sessionId = `usr.${creationKey}`;
      const state = createInitialState(loaded.package, { sessionId, packageHash: loaded.packageHash, createdAt });
      const record: PersistedSession = {
        schemaVersion: '1.0.0',
        id: sessionId,
        scenarioId,
        scenarioVersion,
        packageHash: loaded.packageHash,
        revision: 0,
        createdAt,
        updatedAt: createdAt,
        mode: 'mock',
        storageMode: this.storage.mode,
        profile,
        purpose,
        ...(profile === 'content_only' ? { contentDelivery: createInitialContentDelivery() } : {}),
        state,
        replayRuntime: { speed: 1, virtualMs: 0 },
        workflowRuntime: { transport: 'idle', virtualMs: 0 },
      };
      const initialView = this.toSessionView(record);
      const initialMeta = this.meta(sessionId, 0);
      const outcome = await this.storage.createSession(
        record,
        creationKey,
        bodyHash,
        await this.buildPackageMeta(loaded, createdAt),
        { data: initialView, meta: initialMeta },
      );
      if (outcome.kind === 'conflict') {
        const code = errorCodeForDomain(outcome.failure?.code ?? 'IDEMPOTENCY_CONFLICT');
        return this.failure(code, outcome.failure?.message ?? 'Creation key conflict.');
      }
      if (outcome.kind === 'replayed' && outcome.receipt) {
        const stored = outcome.receipt.response as { data: unknown; meta: ApiMeta | null };
        if (stored?.data) return { ok: true, data: stored.data as SessionView, meta: stored.meta ?? initialMeta };
      }
      if (!outcome.record) return this.failure('STORAGE_UNAVAILABLE', 'Session was not saved.');
      return { ok: true, data: initialView, meta: initialMeta };
    } catch (error) {
      return this.failureFromUnknown(error);
    }
  }

  async listSessions(input?: { scenarioId?: string }): Promise<ApiResult<{ items: ReturnType<typeof sessionSummary>[] }>> {
    try {
      if (input !== undefined) assertExactKeys(input, ['scenarioId'], 'input');
      const scenarioId = input?.scenarioId;
      if (scenarioId !== undefined) assertNonEmptyString(scenarioId, 'input.scenarioId');
      const records = await this.storage.listSessions();
      const filtered = scenarioId ? records.filter((record) => record.scenarioId === scenarioId) : records;
      const items = filtered
        .slice()
        .sort((left, right) => (right.updatedAt.localeCompare(left.updatedAt) || right.id.localeCompare(left.id)))
        .map(sessionSummary);
      return this.success({ items });
    } catch (error) {
      return this.failureFromUnknown(error);
    }
  }

  async getSession(input: { sessionId: string }): Promise<ApiResult<SessionView>> {
    try {
      const object = assertExactKeys(input, ['sessionId'], 'input');
      const sessionId = assertNonEmptyString(object.sessionId, 'input.sessionId');
      const record = await this.storage.getSession(sessionId);
      if (!record) return this.failure('SESSION_NOT_FOUND', `Unknown session ${sessionId}.`);
      await this.loadScenarioFor(record);
      const view = this.toSessionView(record);
      // Restored sessions always present replay/playback paused; no time spent
      // while the page was closed is replayed or simulated.
      const restored: SessionView = {
        ...view,
        replay: { ...view.replay, transport: 'paused' },
        workflowPlayback: {
          ...view.workflowPlayback,
          transport: view.workflowPlayback.stage ? 'paused' : 'idle',
        },
      };
      return this.success(restored, sessionId, record.revision);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('CORRUPT_SESSION')) return this.failure('CORRUPT_SESSION', message, [], input?.sessionId ?? null, null);
      if (message.includes('SCHEMA_UNSUPPORTED')) return this.failure('SCHEMA_UNSUPPORTED', message, [], input?.sessionId ?? null, null);
      return this.failureFromUnknown(error);
    }
  }

  private visibleIds(record: PersistedSession, view: 'workflow' | 'replay'): readonly string[] {
    return view === 'workflow' ? record.state.workflowVisibleEntityIds : record.state.replay.projection.visibleEntityIds;
  }

  private localEntities(record: PersistedSession, stage: StageName): Array<{ id: string; kind: string; value: unknown }> {
    if (stage === 'analysis') {
      return record.state.userVersions.map((version) => ({ id: version.id, kind: 'userScriptVersion', value: version }));
    }
    if (stage === 'delivery') {
      return [
        ...record.state.deliveryDrafts.map((draft) => ({ id: draft.id, kind: 'deliveryDraft', value: draft })),
        ...record.state.deliveryAttempts.map((attempt) => ({ id: attempt.id, kind: 'deliveryAttempt', value: attempt })),
        ...record.state.deliveryRecords.map((recordValue) => ({ id: recordValue.id, kind: 'deliveryRecord', value: recordValue })),
      ];
    }
    return [];
  }

  private findLocalEntity(record: PersistedSession, entityId: string): { id: string; kind: string; value: unknown } | null {
    for (const stage of STAGES) {
      const found = this.localEntities(record, stage).find((entity) => entity.id === entityId);
      if (found) return found;
    }
    return null;
  }

  async getStageData(input: { sessionId: string; stage: StageName; view: 'workflow' | 'replay' }): Promise<ApiResult<StageData>> {
    try {
      const object = assertExactKeys(input, ['sessionId', 'stage', 'view'], 'input');
      const sessionId = assertNonEmptyString(object.sessionId, 'input.sessionId');
      const stage = object.stage as StageName;
      if (!STAGES.includes(stage)) throw new InputFailure('input.stage is invalid.');
      const view = object.view;
      if (view !== 'workflow' && view !== 'replay') throw new InputFailure('input.view must be workflow/replay.');
      const record = await this.requireSession(sessionId);
      const loaded = await this.loadScenarioFor(record);
      const visible = new Set(this.visibleIds(record, view));
      const index = collectEntityIndex(loaded.package);
      const allowedKind: Record<StageName, Set<string>> = {
        discovery: new Set(['signal', 'trend', 'evidence']),
        analysis: new Set(['analysis', 'brief', 'scriptVersion', 'userScriptVersion', 'shot', 'subtitle']),
        video: new Set(['video', 'asset']),
        delivery: new Set(['deliveryPlan', 'deliveryRecord', 'deliveryDraft', 'deliveryAttempt', 'recipient']),
      };
      const packageEntities = [...index.byId.values()]
        .filter((recordEntity) => visible.has(recordEntity.id) && allowedKind[stage].has(recordEntity.kind))
        .map((recordEntity) => ({ id: recordEntity.id, kind: recordEntity.kind, value: recordEntity.value }));
      const localEntities = view === 'workflow' ? this.localEntities(record, stage) : [];
      const entities = [...packageEntities, ...localEntities]
        .filter((entity) => allowedKind[stage].has(entity.kind))
        .filter((entity, indexValue, all) => all.findIndex((candidate) => candidate.id === entity.id) === indexValue)
        .sort((left, right) => left.id.localeCompare(right.id));
      return this.success({ stage, view, entities }, sessionId, record.revision);
    } catch (error) {
      return this.failureFromUnknown(error);
    }
  }

  async getEntity(input: { sessionId: string; entityId: string; view: 'workflow' | 'replay' }): Promise<ApiResult<EntityData>> {
    try {
      const object = assertExactKeys(input, ['sessionId', 'entityId', 'view'], 'input');
      const sessionId = assertNonEmptyString(object.sessionId, 'input.sessionId');
      const entityId = assertNonEmptyString(object.entityId, 'input.entityId');
      const view = object.view;
      if (view !== 'workflow' && view !== 'replay') throw new InputFailure('input.view must be workflow/replay.');
      const record = await this.requireSession(sessionId);
      const loaded = await this.loadScenarioFor(record);
      const local = this.findLocalEntity(record, entityId);
      if (local) {
        if (view !== 'workflow') {
          return this.failure('ENTITY_NOT_REACHED', `Entity ${entityId} is user-operation data and is not visible in replay.`, [], sessionId, record.revision);
        }
        return this.success(local, sessionId, record.revision);
      }
      const entity = collectEntityIndex(loaded.package).byId.get(entityId);
      if (!entity) return this.failure('NOT_FOUND', `Unknown entity ${entityId}.`, [], sessionId, record.revision);
      if (!BASE_ENTITY_KINDS.has(entity.kind) && !this.visibleIds(record, view).includes(entityId)) {
        return this.failure('ENTITY_NOT_REACHED', `Entity ${entityId} is not visible at the current ${view} cursor.`, [], sessionId, record.revision);
      }
      return this.success({ id: entity.id, kind: entity.kind, value: entity.value }, sessionId, record.revision);
    } catch (error) {
      return this.failureFromUnknown(error);
    }
  }

  async executeStage(ctx: CommandContext, input: { stage: 'discovery' | 'analysis' | 'video' }): Promise<ApiResult<SessionView>> {
    return this.runCommand(ctx, 'executeStage', input, (current, loaded, { nowIso, virtualMs }) => {
      const object = assertExactKeys(input, ['stage'], 'input');
      const stage = object.stage;
      if (stage !== 'discovery' && stage !== 'analysis' && stage !== 'video') {
        throw new InputFailure('input.stage must be discovery/analysis/video.');
      }
      if (current.profile === 'content_only' && stage === 'video') {
        return { ok: false, code: 'INVALID_TRANSITION', message: 'Video is deferred for content-only demos; no media workflow is available.' };
      }
      const executed = domainExecuteStage(current.state, loaded.package, { stage, nowIso, virtualMs });
      if (!executed.ok) return { ok: false, code: executed.error.code, message: executed.error.message, fieldErrors: executed.error.fieldErrors };
      let nextState = executed.value;
      try {
        nextState = this.autoConsumeStage({ ...current, state: nextState }, loaded, stage);
      } catch (error) {
        return { ok: false, code: 'CORRUPT_EVENT', message: error instanceof Error ? error.message : String(error) };
      }
      const running = runningStage(nextState);
      const activeAttempt = nextState.stageAttempts.find((attempt) => attempt.status === 'running') ?? null;
      return {
        ok: true,
        state: nextState,
        workflowRuntime: {
          transport: activeAttempt ? 'paused' : 'idle',
          virtualMs: nextState.lastWorkflowAtMs,
        },
        response: (next) => this.toSessionView(next),
      };
    });
  }

  async workflowCommand(ctx: CommandContext, input: { action: 'pause' | 'resume' }): Promise<ApiResult<SessionView>> {
    return this.runCommand(ctx, 'workflowCommand', input, (current) => {
      const object = assertExactKeys(input, ['action'], 'input');
      if (object.action !== 'pause' && object.action !== 'resume') throw new InputFailure('input.action must be pause/resume.');
      const activeAttempt = current.state.stageAttempts.find((attempt) => attempt.status === 'running');
      const running = runningStage(current.state) ?? activeAttempt?.stage ?? null;
      if (!running) return { ok: false, code: 'INVALID_TRANSITION', message: 'No running workflow stage to pause/resume.' };
      return {
        ok: true,
        state: current.state,
        workflowRuntime: { transport: object.action === 'pause' ? 'paused' : 'playing' },
        response: (next) => this.toSessionView(next),
      };
    });
  }

  async selectScript(ctx: CommandContext, input: { scriptVersionId: string }): Promise<ApiResult<SessionView>> {
    return this.runCommand(ctx, 'selectScript', input, (current, loaded, { nowIso }) => {
      const object = assertExactKeys(input, ['scriptVersionId'], 'input');
      const scriptVersionId = assertNonEmptyString(object.scriptVersionId, 'input.scriptVersionId');
      const selected = domainSelectScript(current.state, loaded.package, { scriptVersionId, nowIso });
      if (!selected.ok) return { ok: false, code: selected.error.code, message: selected.error.message, fieldErrors: selected.error.fieldErrors };
      return { ok: true, state: selected.value, response: (next) => this.toSessionView(next) };
    });
  }

  async saveScriptDraft(ctx: CommandContext, input: { baseVersionId: string; content: ScriptEditable }): Promise<ApiResult<{ session: SessionView; version: UserScriptVersion }>> {
    return this.runCommand(ctx, 'saveScriptDraft', input, (current, loaded, { nowIso }) => {
      const object = assertExactKeys(input, ['baseVersionId', 'content'], 'input');
      const baseVersionId = assertNonEmptyString(object.baseVersionId, 'input.baseVersionId');
      const content = validateScriptContent(object.content, 'input.content');
      const saved = domainSaveScriptDraft(current.state, loaded.package, { baseVersionId, content, nowIso });
      if (!saved.ok) return { ok: false, code: saved.error.code, message: saved.error.message, fieldErrors: saved.error.fieldErrors };
      const version = saved.value.userVersions[saved.value.userVersions.length - 1] as UserScriptVersion;
      return {
        ok: true,
        state: saved.value,
        response: (next) => ({ session: this.toSessionView(next), version }),
      };
    });
  }

  async confirmScript(ctx: CommandContext, input: { scriptVersionId: string }): Promise<ApiResult<SessionView>> {
    return this.runCommand(ctx, 'confirmScript', input, (current, loaded, { nowIso }) => {
      const object = assertExactKeys(input, ['scriptVersionId'], 'input');
      const scriptVersionId = assertNonEmptyString(object.scriptVersionId, 'input.scriptVersionId');
      const confirmed = confirmScript(current.state, loaded.package, { scriptVersionId, nowIso });
      if (!confirmed.ok) return { ok: false, code: confirmed.error.code, message: confirmed.error.message, fieldErrors: confirmed.error.fieldErrors };
      const state = current.profile === 'content_only'
        ? {
            ...confirmed.value,
            workflow: { ...confirmed.value.workflow, video: 'stale' as const, delivery: 'locked' as const },
            activeVideoId: null,
          }
        : confirmed.value;
      return { ok: true, state, response: (next) => this.toSessionView(next) };
    });
  }

  async saveDeliveryDraft(
    ctx: CommandContext,
    input: {
      planId: string;
      recipientIds?: string[];
      recipientsOverride?: Array<{ id: string; displayName: string; email: string }>;
      subject: string;
      body: string;
      scheduledVirtualMs: number;
    },
  ): Promise<ApiResult<{ session: SessionView; draft: DeliveryDraft }>> {
    return this.runCommand<{ session: SessionView; draft: DeliveryDraft }>(ctx, 'saveDeliveryDraft', input, (current, loaded, { nowIso }) => {
      if (current.profile === 'content_only') {
        return { ok: false, code: 'INVALID_TRANSITION', message: 'Video delivery commands are unavailable in content-only demos; use the content delivery draft instead.' };
      }
      const object = assertExactKeys(
        input,
        ['planId', 'recipientIds', 'recipientsOverride', 'subject', 'body', 'scheduledVirtualMs'],
        'input',
      );
      const planId = assertNonEmptyString(object.planId, 'input.planId');
      const subject = assertNonEmptyString(object.subject, 'input.subject');
      const body = assertNonEmptyString(object.body, 'input.body');
      if (!Number.isInteger(object.scheduledVirtualMs) || (object.scheduledVirtualMs as number) < 0) {
        throw new InputFailure('input.scheduledVirtualMs must be a non-negative integer.');
      }
      const saved = domainSaveDeliveryDraft(current.state, loaded.package, {
        planId,
        subject,
        body,
        scheduledVirtualMs: object.scheduledVirtualMs as number,
        recipientIds: object.recipientIds as string[] | undefined,
        recipientsOverride: object.recipientsOverride as Array<{ id: string; displayName: string; email: string }> | undefined,
        nowIso,
      });
      if (!saved.ok) return { ok: false, code: saved.error.code, message: saved.error.message, fieldErrors: saved.error.fieldErrors };
      const draft = saved.value.deliveryDrafts[saved.value.deliveryDrafts.length - 1] as DeliveryDraft;
      return { ok: true, state: saved.value, response: (next) => ({ session: this.toSessionView(next), draft }) };
    });
  }

  simulateDelivery(
    ctx: CommandContext,
    input: { draftId: string; confirmedVideoId: string; failureCase: null | 'delivery_failed' },
  ): Promise<ApiResult<{ session: SessionView; attempt: DeliveryAttempt | PendingDeliveryAttempt | null }>> {
    return this.runCommand<{ session: SessionView; attempt: DeliveryAttempt | PendingDeliveryAttempt | null }>(ctx, 'simulateDelivery', input, (current, loaded, { nowIso, virtualMs }) => {
      if (current.profile === 'content_only') {
        return { ok: false, code: 'INVALID_TRANSITION', message: 'Video delivery commands are unavailable in content-only demos; use simulateContentDelivery.' };
      }
      const object = assertExactKeys(input, ['draftId', 'confirmedVideoId', 'failureCase'], 'input');
      const draftId = assertNonEmptyString(object.draftId, 'input.draftId');
      const confirmedVideoId = assertNonEmptyString(object.confirmedVideoId, 'input.confirmedVideoId');
      if (object.failureCase !== null && object.failureCase !== 'delivery_failed') {
        throw new InputFailure('input.failureCase must be null or delivery_failed.');
      }
      const started = domainSimulateDelivery(current.state, loaded.package, {
        draftId,
        confirmedVideoId,
        failureCase: object.failureCase,
        nowIso,
        virtualTimeMs: virtualMs,
      });
      if (!started.ok) return { ok: false, code: started.error.code, message: started.error.message, fieldErrors: started.error.fieldErrors };
      const pending = started.value.pendingDeliveryAttempts[started.value.pendingDeliveryAttempts.length - 1];
      let nextState = started.value;
      if (pending && virtualMs >= pending.scheduledVirtualMs) {
        const advanced = advanceDeliveryAttempt(nextState, loaded.package, {
          attemptId: pending.id,
          virtualTimeMs: virtualMs,
          nowIso,
        });
        if (!advanced.ok) return { ok: false, code: advanced.error.code, message: advanced.error.message, fieldErrors: advanced.error.fieldErrors };
        nextState = advanced.value;
      }
      const terminal = pending
        ? [...nextState.deliveryAttempts].reverse().find((attempt) => attempt.stageAttemptId === pending.stageAttemptId) ?? null
        : null;
      const responseAttempt = terminal ?? pending ?? null;
      return { ok: true, state: nextState, response: (next) => ({ session: this.toSessionView(next), attempt: responseAttempt }) };
    });
  }

  async retryStage(ctx: CommandContext, input: { stage: StageName; failedAttemptId: string }): Promise<ApiResult<SessionView>> {
    return this.runCommand(ctx, 'retryStage', input, (current, loaded, { nowIso, virtualMs }) => {
      if (current.profile === 'content_only') {
        return { ok: false, code: 'INVALID_TRANSITION', message: 'Video stage retry is unavailable in content-only demos.' };
      }
      const object = assertExactKeys(input, ['stage', 'failedAttemptId'], 'input');
      const stage = object.stage as StageName;
      if (!STAGES.includes(stage)) throw new InputFailure('input.stage is invalid.');
      const failedAttemptId = assertNonEmptyString(object.failedAttemptId, 'input.failedAttemptId');
      const retried = domainRetryStage(current.state, loaded.package, { stage, failedAttemptId, nowIso, virtualMs });
      if (!retried.ok) return { ok: false, code: retried.error.code, message: retried.error.message, fieldErrors: retried.error.fieldErrors };
      let nextState = retried.value;
      if (stage === 'delivery') {
        const pending = nextState.pendingDeliveryAttempts
          .slice()
          .reverse()
          .find((attempt) => attempt.status === 'running');
        if (pending && virtualMs >= pending.scheduledVirtualMs) {
          const advanced = advanceDeliveryAttempt(nextState, loaded.package, {
            attemptId: pending.id,
            virtualTimeMs: virtualMs,
            nowIso,
          });
          if (!advanced.ok) return { ok: false, code: advanced.error.code, message: advanced.error.message, fieldErrors: advanced.error.fieldErrors };
          nextState = advanced.value;
        }
      }
      return { ok: true, state: nextState, response: (next) => this.toSessionView(next) };
    });
  }

  async replayCommand(
    ctx: CommandContext,
    input: ReplayCommandBase,
  ): Promise<ApiResult<{ session: SessionView; projection: SessionView['replay']['projection'] }>> {
    try {
      const raw = assertObject(input, 'input');
      const action = raw.action;
      if (!['play', 'pause', 'step', 'restart', 'seek', 'setSpeed'].includes(String(action))) {
        throw new InputFailure('input.action is invalid.');
      }
      const allowed = action === 'seek'
        ? ['action', 'cursorSequence']
        : action === 'setSpeed'
          ? ['action', 'speed']
          : ['action'];
      assertExactKeys(raw, allowed, 'input');
      if (action === 'seek' && !Number.isInteger(raw.cursorSequence)) {
        throw new InputFailure('input.cursorSequence must be an integer.');
      }
      if (action === 'setSpeed' && raw.speed !== 1 && raw.speed !== 2 && raw.speed !== 4) {
        throw new InputFailure('input.speed must be 1/2/4.');
      }
    } catch (error) {
      return this.failureFromUnknown(error);
    }
    return this.runCommand<{ session: SessionView; projection: SessionView['replay']['projection'] }>(ctx, 'replayCommand', input, (current, loaded, { nowIso: _nowIso }) => {
      const object = assertObject(input, 'input');
      const action = object.action;
      let replay = current.state.replay;
      let speed = current.replayRuntime.speed;
      let virtualMs = current.replayRuntime.virtualMs;
      if (action === 'play') replay = requireReplay(setReplayTransport(replay, 'playing'));
      else if (action === 'pause') replay = requireReplay(setReplayTransport(replay, 'paused'));
      else if (action === 'step') {
        const nextSequence = replay.cursorSequence + 1;
        const event = replayEventsFor(loaded.package, current.profile).find((candidate) => candidate.sequence === nextSequence);
        if (!event) replay = requireReplay(setReplayTransport(replay, 'ended'));
        else {
          const stepped = reduceReplayEvent(loaded.package, replay, event);
          if (!stepped.ok) return { ok: false, code: stepped.error.code, message: stepped.error.message };
          replay = stepped.value;
          virtualMs = event.atMs;
        }
      } else if (action === 'restart') {
        replay = createReplayState();
        virtualMs = 0;
      } else if (action === 'seek') {
        const target = object.cursorSequence as number;
        const reduced = reduceReplay(loaded.package, replayEventsFor(loaded.package, current.profile), target);
        if (!reduced.ok) return { ok: false, code: reduced.error.code, message: reduced.error.message };
        replay = reduced.value;
        replay = requireReplay(setReplayTransport(replay, 'paused'));
        virtualMs = replay.lastAtMs;
      } else if (action === 'setSpeed') {
        speed = object.speed as ReplaySpeed;
      }
      const nextState = { ...current.state, replay };
      return {
        ok: true,
        state: nextState,
        replayRuntime: { speed, virtualMs },
        response: (next) => ({ session: this.toSessionView(next), projection: this.toSessionView(next).replay.projection }),
      };
    });
  }

  async advanceReplay(
    ctx: CommandContext,
    input: { targetVirtualMs: number },
  ): Promise<ApiResult<{ session: SessionView; projection: SessionView['replay']['projection'] }>> {
    return this.runCommand<{ session: SessionView; projection: SessionView['replay']['projection'] }>(ctx, 'advanceReplay', input, (current, loaded) => {
      const object = assertExactKeys(input, ['targetVirtualMs'], 'input');
      const target = object.targetVirtualMs;
      if (!Number.isInteger(target) || (target as number) < 0) {
        throw new InputFailure('input.targetVirtualMs must be a non-negative integer.');
      }
      if ((target as number) < current.replayRuntime.virtualMs) {
        throw new InputFailure('input.targetVirtualMs must not move the replay clock backwards.');
      }
      const events = replayEventsFor(loaded.package, current.profile);
      let targetSequence = 0;
      for (const event of events) {
        if (event.atMs <= (target as number)) targetSequence = event.sequence;
      }
      if (targetSequence < current.state.replay.cursorSequence) {
        throw new InputFailure('targetVirtualMs is behind the persisted replay cursor.');
      }
      const reduced = reduceReplay(loaded.package, events, targetSequence);
      if (!reduced.ok) return { ok: false, code: reduced.error.code, message: reduced.error.message };
      const replay = setReplayTransport(reduced.value, current.state.replay.transport);
      if (!replay.ok) return { ok: false, code: replay.error.code, message: replay.error.message };
      const nextState = { ...current.state, replay: replay.value };
      return {
        ok: true,
        state: nextState,
        replayRuntime: { speed: current.replayRuntime.speed, virtualMs: target as number },
        response: (next) => ({ session: this.toSessionView(next), projection: this.toSessionView(next).replay.projection }),
      };
    });
  }

  async getEvents(input: { sessionId: string; afterSequence: number; limit: number }): Promise<ApiResult<{ items: Event[]; nextSequence: number | null }>> {
    try {
      const object = assertExactKeys(input, ['sessionId', 'afterSequence', 'limit'], 'input');
      const sessionId = assertNonEmptyString(object.sessionId, 'input.sessionId');
      if (!Number.isInteger(object.afterSequence) || (object.afterSequence as number) < 0) {
        throw new InputFailure('input.afterSequence must be a non-negative integer.');
      }
      if (!Number.isInteger(object.limit) || (object.limit as number) < 1 || (object.limit as number) > 100) {
        throw new InputFailure('input.limit must be 1..100.');
      }
      const record = await this.requireSession(sessionId);
      const loaded = await this.loadScenarioFor(record);
      const afterSequence = object.afterSequence as number;
      const limit = object.limit as number;
      const all = replayEventsFor(loaded.package, record.profile).filter((event) => event.sequence > afterSequence);
      const items = all.slice(0, limit);
      const nextSequence = items.length > 0 && all.length > limit ? items[items.length - 1].sequence : null;
      return this.success(
        { items, nextSequence },
        sessionId,
        record.revision,
      );
    } catch (error) {
      return this.failureFromUnknown(error);
    }
  }

  async getHistory(input: { sessionId: string }): Promise<ApiResult<{ items: DomainState['history'] }>> {
    try {
      const object = assertExactKeys(input, ['sessionId'], 'input');
      const sessionId = assertNonEmptyString(object.sessionId, 'input.sessionId');
      const record = await this.requireSession(sessionId);
      return this.success({ items: userHistory(record.state.history) }, sessionId, record.revision);
    } catch (error) {
      return this.failureFromUnknown(error);
    }
  }

  async getDownload(input: { sessionId: string; kind: 'video' | 'poster' | 'script' | 'delivery_bundle' | 'run_record'; entityId: string }): Promise<ApiResult<DownloadResult>> {
    try {
      const object = assertExactKeys(input, ['sessionId', 'kind', 'entityId'], 'input');
      const sessionId = assertNonEmptyString(object.sessionId, 'input.sessionId');
      const kind = object.kind;
      if (!['video', 'poster', 'script', 'delivery_bundle', 'run_record'].includes(String(kind))) {
        throw new InputFailure('input.kind is invalid.');
      }
      const entityId = assertNonEmptyString(object.entityId, 'input.entityId');
      const sessionRecord = ['video', 'poster', 'delivery_bundle'].includes(String(kind))
        ? await this.storage.getSession(sessionId)
        : null;
      if (sessionRecord?.profile === 'content_only' && ['video', 'poster', 'delivery_bundle'].includes(String(kind))) {
        return this.failure('MOCK_FAILURE', 'Video/poster/ZIP-video export is deferred in content-only demos. Use the content pack export.', [], sessionId, sessionRecord.revision);
      }
      if (kind === 'run_record') {
        const recovery = await this.storage.exportSession(sessionId);
        if (!recovery) return this.failure('SESSION_NOT_FOUND', `Unknown session ${sessionId}.`, [], sessionId, null);
        const json = JSON.stringify({
          schemaVersion: '1.0.0',
          mode: 'mock',
          kind: 'run_record',
          recoveryStatus: recovery.status,
          recoveryError: recovery.error,
          session: recovery.session,
          history: recovery.history,
          receipts: recovery.receipts,
          exportedAt: recovery.exportedAt,
        });
        const blob = utf8Bytes(json);
        return this.success(
          { blob, filename: `${sessionId}-run-record.json`, mimeType: 'application/json', bytes: blob.byteLength, sha256: await sha256Hex(blob) },
          sessionId,
          null,
        );
      }
      const record = await this.requireSession(sessionId);
      const loaded = await this.loadScenarioFor(record);
      if (kind === 'delivery_bundle') {
        return this.failure('MOCK_FAILURE', 'Delivery ZIP bundle export is not implemented in POC-004; it is planned for POC-013.', [], sessionId, record.revision);
      }
      if (kind === 'script') {
        if (record.state.activeScriptVersionId !== entityId) {
          return this.failure('NOT_FOUND', 'Only the active script version can be exported.', [], sessionId, record.revision);
        }
        const user = findUserVersion(record.state, entityId);
        const packageVersion = findPackageScript(loaded.package, entityId);
        const version = user ?? packageVersion;
        if (!version) return this.failure('NOT_FOUND', `Unknown script version ${entityId}.`, [], sessionId, record.revision);
        const json = JSON.stringify({ schemaVersion: '1.0.0', version }, null, 2);
        const blob = utf8Bytes(json);
        return this.success({ blob, filename: `${entityId}.json`, mimeType: 'application/json', bytes: blob.byteLength, sha256: await sha256Hex(blob) }, sessionId, record.revision);
      }
      let videoId: string | null = null;
      if (record.state.activeVideoId && (kind === 'video' || kind === 'poster')) videoId = record.state.activeVideoId;
      if (!videoId) return this.failure('NOT_FOUND', 'No active video is available for download.', [], sessionId, record.revision);
      if (entityId !== videoId && entityId !== record.state.activeVideoId) {
        return this.failure('NOT_FOUND', 'Entity is not the active video.', [], sessionId, record.revision);
      }
      if (record.state.workflow.video !== 'completed' || record.state.videoAvailability[videoId] !== 'available') {
        return this.failure('ASSET_UNAVAILABLE', 'Video asset is not available on the current attempt.', [], sessionId, record.revision);
      }
      const video = loaded.package.video.data.videos.find((candidate) => candidate.id === videoId);
      if (!video) return this.failure('NOT_FOUND', `Unknown video ${videoId}.`, [], sessionId, record.revision);
      const assetId = kind === 'video' ? video.mp4AssetId : video.posterAssetId;
      const bytes = loaded.media[assetId];
      if (!bytes) return this.failure('ASSET_UNAVAILABLE', `media bytes for ${assetId} are unavailable.`, [], sessionId, record.revision);
      const mimeType = kind === 'video' ? 'video/mp4' : 'image/png';
      const filename = `${video.id}.${kind === 'video' ? 'mp4' : 'png'}`;
      return this.success(
        { blob: bytes, filename, mimeType, bytes: bytes.byteLength, sha256: await sha256Hex(bytes) },
        sessionId,
        record.revision,
      );
    } catch (error) {
      return this.failureFromUnknown(error);
    }
  }

  async getContentDelivery(sessionIdInput: string): Promise<ApiResult<ContentDeliveryView>> {
    try {
      const sessionId = assertNonEmptyString(sessionIdInput, 'sessionId');
      const record = await this.requireSession(sessionId);
      if (record.profile !== 'content_only') return this.failure('INVALID_TRANSITION', 'Content delivery is only available for content-only demos.', [], sessionId, record.revision);
      const loaded = await this.loadScenarioFor(record);
      const view = this.toSessionView(record);
      const plan = defaultContentPlan(loaded);
      const recipients = defaultContentRecipients(loaded);
      return this.success(
        {
          delivery: record.contentDelivery ?? createInitialContentDelivery(),
          sourcePlan: plan ? { id: plan.id, scriptVersionId: plan.scriptVersionId, recipients } : null,
          scripts: listContentScripts(view, loaded),
        },
        sessionId,
        record.revision,
      );
    } catch (error) {
      return this.failureFromUnknown(error);
    }
  }

  async saveContentDeliveryDraft(
    ctx: CommandContext,
    input: ContentDeliverySaveInput,
  ): Promise<ApiResult<{ session: SessionView; draft: ContentDeliveryDraft }>> {
    try {
      const object = assertExactKeys(input, ['sourcePlanId', 'scriptVersionId', 'recipientSnapshot', 'subject', 'body'], 'input');
      assertExactKeys(ctx, ['sessionId', 'expectedRevision', 'idempotencyKey'], 'context');
      const sourcePlanId = assertNonEmptyString(object.sourcePlanId, 'input.sourcePlanId');
      const scriptVersionId = assertNonEmptyString(object.scriptVersionId, 'input.scriptVersionId');
      const subject = assertNonEmptyString(object.subject, 'input.subject');
      const body = assertNonEmptyString(object.body, 'input.body');
      if (!Array.isArray(object.recipientSnapshot) || object.recipientSnapshot.length === 0) {
        throw new InputFailure('input.recipientSnapshot must contain at least one recipient.');
      }
      const recipients: ContentDeliveryRecipient[] = object.recipientSnapshot.map((value, index) => {
        const recipient = assertExactKeys(value, ['id', 'displayName', 'email'], `input.recipientSnapshot[${index}]`);
        const email = assertNonEmptyString(recipient.email, `input.recipientSnapshot[${index}].email`);
        if (!/^[^\s@]+@[^\s@]+\.invalid$/i.test(email)) {
          throw new InputFailure(`input.recipientSnapshot[${index}].email must use a .invalid demo address.`);
        }
        return {
          id: assertNonEmptyString(recipient.id, `input.recipientSnapshot[${index}].id`),
          displayName: assertNonEmptyString(recipient.displayName, `input.recipientSnapshot[${index}].displayName`),
          email,
        };
      });

      const current = await this.storage.getSession(assertNonEmptyString(ctx.sessionId, 'context.sessionId'));
      if (!current) return this.failure('SESSION_NOT_FOUND', `Unknown session ${ctx.sessionId}.`, [], ctx.sessionId, null);
      if (current.profile !== 'content_only') return this.failure('INVALID_TRANSITION', 'Content delivery is only available for content-only demos.', [], current.id, current.revision);
      const loaded = await this.loadScenarioFor(current);
      const view = this.toSessionView(current);
      if (view.workflow.analysis !== 'completed' || view.activeScriptVersionId !== scriptVersionId) {
        return this.failure('CONFIRMATION_REQUIRED', 'A completed and confirmed active script version is required before saving a content delivery draft.', [], current.id, current.revision);
      }
      const plan = loaded.package.delivery.data.plans.find((candidate) => candidate.id === sourcePlanId);
      if (!plan) return this.failure('NOT_FOUND', `Unknown source delivery plan ${sourcePlanId}.`, [], current.id, current.revision);
      const script = resolveContentScript(view, loaded, scriptVersionId);
      if (!script) return this.failure('NOT_FOUND', `Unknown script version ${scriptVersionId}.`, [], current.id, current.revision);
      const built = await buildContentPackFiles({ loaded, script, subject, body, recipients, sha256: (text) => sha256Hex(utf8Bytes(text)) });
      const previous = current.contentDelivery?.draft;
      const revision = previous ? previous.revision + 1 : 1;
      const draft: ContentDeliveryDraft = {
        id: `${current.id}.content.draft.${revision}`,
        revision,
        sourcePlanId,
        scriptVersionId,
        recipientSnapshot: recipients,
        subject,
        body,
        attachmentManifest: built.attachments,
        confirmedRevision: null,
      };
      return this.runCommand<{ session: SessionView; draft: ContentDeliveryDraft }>(ctx, 'saveContentDeliveryDraft', input, (session, loadedNow, { nowIso }) => {
        if (session.profile !== 'content_only') return { ok: false, code: 'INVALID_TRANSITION', message: 'Content delivery is only available for content-only demos.' };
        if (session.state.workflow.analysis !== 'completed' || session.state.activeScriptVersionId !== scriptVersionId) {
          return { ok: false, code: 'CONFIRMATION_REQUIRED', message: 'The active script must be confirmed before the content draft is saved.' };
        }
        if (!loadedNow.package.delivery.data.plans.some((candidate) => candidate.id === sourcePlanId)) {
          return { ok: false, code: 'NOT_FOUND', message: `Unknown source delivery plan ${sourcePlanId}.` };
        }
        const contentDelivery: ContentDeliveryState = {
          draft,
          attempts: session.contentDelivery?.attempts ?? [],
          status: 'awaiting_confirmation',
        };
        return {
          ok: true,
          state: session.state,
          contentDelivery,
          response: (next) => ({ session: this.toSessionView(next), draft }),
        };
      });
    } catch (error) {
      return this.failureFromUnknown(error);
    }
  }

  async simulateContentDelivery(
    ctx: CommandContext,
    input: ContentDeliverySimulateInput,
  ): Promise<ApiResult<{ session: SessionView; attempt: ContentDeliveryAttempt }>> {
    try {
      const object = assertExactKeys(input, ['draftRevision', 'confirmed', 'failureCase'].filter((key) => key !== 'failureCase' || key in input), 'input');
      if (object.confirmed !== true) throw new InputFailure('input.confirmed must be true.');
      if (!Number.isInteger(object.draftRevision)) throw new InputFailure('input.draftRevision must be an integer.');
      if (object.failureCase !== undefined && object.failureCase !== 'delivery_failed') throw new InputFailure('input.failureCase must be delivery_failed when supplied.');
      const current = await this.storage.getSession(assertNonEmptyString(ctx.sessionId, 'context.sessionId'));
      if (!current) return this.failure('SESSION_NOT_FOUND', `Unknown session ${ctx.sessionId}.`, [], ctx.sessionId, null);
      if (current.profile !== 'content_only') return this.failure('INVALID_TRANSITION', 'Content delivery is only available for content-only demos.', [], current.id, current.revision);
      const loaded = await this.loadScenarioFor(current);
      const view = this.toSessionView(current);
      const delivery = current.contentDelivery;
      if (!delivery?.draft) return this.failure('CONFIRMATION_REQUIRED', 'Save a content delivery draft and confirm its revision first.', [], current.id, current.revision);
      if (delivery.draft.revision !== object.draftRevision) {
        return this.failure('REVISION_CONFLICT', 'The content delivery draft changed; reload and confirm the current revision.', [], current.id, current.revision);
      }
      const script = resolveContentScript(view, loaded, delivery.draft.scriptVersionId);
      if (!script) return this.failure('NOT_FOUND', 'The draft script version is no longer available.', [], current.id, current.revision);
      const built = await buildContentPackFiles({
        loaded,
        script,
        subject: delivery.draft.subject,
        body: delivery.draft.body,
        recipients: delivery.draft.recipientSnapshot,
        sha256: (text) => sha256Hex(utf8Bytes(text)),
      });
      if (JSON.stringify(built.attachments) !== JSON.stringify(delivery.draft.attachmentManifest)) {
        return this.failure('STALE_VERSION', 'The selected script or generated attachments changed; rebuild the content draft.', [], current.id, current.revision);
      }
      const failure = object.failureCase === 'delivery_failed';
      const attemptNumber = delivery.attempts.length + 1;
      const attempt: ContentDeliveryAttempt = {
        id: `${current.id}.content.attempt.${attemptNumber}`,
        attempt: attemptNumber,
        draftId: delivery.draft.id,
        draftRevision: delivery.draft.revision,
        scriptVersionId: delivery.draft.scriptVersionId,
        recipientSnapshot: delivery.draft.recipientSnapshot,
        subject: delivery.draft.subject,
        body: delivery.draft.body,
        attachmentManifest: built.attachments,
        outcome: failure ? 'failed' : 'simulated_delivered',
        failureCode: failure ? 'delivery_failed' : null,
        mode: 'mock',
        deliveryKind: 'script_pack',
        createdAt: this.now(),
      };
      return this.runCommand<{ session: SessionView; attempt: ContentDeliveryAttempt }>(ctx, 'simulateContentDelivery', input, (session, _loaded, { nowIso }) => {
        const currentDelivery = session.contentDelivery;
        if (!currentDelivery?.draft || currentDelivery.draft.revision !== object.draftRevision) {
          return { ok: false, code: 'REVISION_CONFLICT', message: 'The content delivery draft revision changed before confirmation.' };
        }
        const nextDelivery: ContentDeliveryState = {
          draft: { ...currentDelivery.draft, confirmedRevision: currentDelivery.draft.revision },
          attempts: [...currentDelivery.attempts, attempt],
          status: failure ? 'failed' : 'completed',
        };
        return {
          ok: true,
          state: { ...session.state, history: [...session.state.history, { id: `${session.id}.content.action.${attemptNumber}`, sequence: session.state.history.length + 1, action: 'simulateContentDelivery', entityIds: [attempt.id], occurredAt: nowIso, outcome: failure ? 'failed' : 'applied', mode: 'mock' }] },
          contentDelivery: nextDelivery,
          response: (next) => ({ session: this.toSessionView(next), attempt }),
        };
      });
    } catch (error) {
      return this.failureFromUnknown(error);
    }
  }

  async exportContentPack(ctx: CommandContext, input: { attemptId: string }): Promise<ApiResult<DownloadResult>> {
    try {
      assertExactKeys(ctx, ['sessionId', 'expectedRevision', 'idempotencyKey'], 'context');
      const object = assertExactKeys(input, ['attemptId'], 'input');
      const attemptId = assertNonEmptyString(object.attemptId, 'input.attemptId');
      const current = await this.storage.getSession(assertNonEmptyString(ctx.sessionId, 'context.sessionId'));
      if (!current) return this.failure('SESSION_NOT_FOUND', `Unknown session ${ctx.sessionId}.`, [], ctx.sessionId, null);
      if (current.profile !== 'content_only') return this.failure('INVALID_TRANSITION', 'Content pack export is only available for content-only demos.', [], current.id, current.revision);
      const attempt = current.contentDelivery?.attempts.find((candidate) => candidate.id === attemptId);
      if (!attempt) return this.failure('NOT_FOUND', `Unknown content delivery attempt ${attemptId}.`, [], current.id, current.revision);
      const loaded = await this.loadScenarioFor(current);
      const view = this.toSessionView(current);
      const script = resolveContentScript(view, loaded, attempt.scriptVersionId);
      if (!script) return this.failure('NOT_FOUND', 'The attempt script version is no longer available.', [], current.id, current.revision);
      const built = await buildContentPackFiles({
        loaded,
        script,
        subject: attempt.subject,
        body: attempt.body,
        recipients: attempt.recipientSnapshot,
        sha256: (text) => sha256Hex(utf8Bytes(text)),
      });
      if (JSON.stringify(built.attachments) !== JSON.stringify(attempt.attachmentManifest)) {
        return this.failure('STALE_VERSION', 'The attempt snapshot and current script do not match; export was blocked rather than fabricating a pack.', [], current.id, current.revision);
      }
      const record = {
        schemaVersion: '1.0.0',
        profile: 'content_only',
        mode: 'mock',
        deliveryKind: 'script_pack',
        attempt,
        note: attempt.outcome === 'failed' ? 'FAILED simulated content attempt; no email was sent and no success is claimed.' : 'SIMULATED content delivery record; no email was sent and no video is attached.',
        noVideo: true,
        noRealEmail: true,
      };
      const recordBytes = new TextEncoder().encode(JSON.stringify(record, null, 2));
      const zip = createZip([
        ...built.files.map((file) => ({ filename: file.filename, bytes: file.bytes })),
        { filename: 'SIMULATED-DELIVERY.json', bytes: recordBytes },
      ]);
      return this.success(
        {
          blob: zip,
          filename: `${safeName(loaded.package.manifest.slug)}-${script.language}-content-pack-${attempt.attempt}.zip`,
          mimeType: 'application/zip',
          bytes: zip.byteLength,
          sha256: await sha256Hex(zip),
        },
        current.id,
        current.revision,
      );
    } catch (error) {
      return this.failureFromUnknown(error);
    }
  }

  async resetSession(ctx: CommandContext, input: { confirmation: 'RESET_THIS_SESSION' }): Promise<ApiResult<SessionView>> {
    return this.runCommand(ctx, 'resetSession', input, (current, loaded, { nowIso }) => {
      const object = assertExactKeys(input, ['confirmation'], 'input');
      if (object.confirmation !== 'RESET_THIS_SESSION') throw new InputFailure('input.confirmation must be RESET_THIS_SESSION.');
      const reset = domainResetSession(current.state, loaded.package, { confirmation: 'RESET_THIS_SESSION', nowIso });
      if (!reset.ok) return { ok: false, code: reset.error.code, message: reset.error.message, fieldErrors: reset.error.fieldErrors };
      return {
        ok: true,
        state: reset.value,
        replayRuntime: { speed: 1, virtualMs: 0 },
        workflowRuntime: { transport: 'idle', virtualMs: 0 },
        ...(current.profile === 'content_only' ? { contentDelivery: createInitialContentDelivery() } : {}),
        response: (next) => this.toSessionView(next),
      };
    });
  }

  // ------------------------------------------------- Interactive product reads
  getOverview(): ReturnType<typeof this.queries.getOverview> {
    return this.queries.getOverview();
  }

  listSignals(input?: { campaignId?: string; source?: ProductSource; topic?: string; query?: string }): ReturnType<typeof this.queries.listSignals> {
    return this.queries.listSignals(input);
  }

  getSignal(input: { signalId: string }): ReturnType<typeof this.queries.getSignal> {
    return this.queries.getSignal(input);
  }

  listOpportunities(input?: { campaignId?: string; query?: string }): ReturnType<typeof this.queries.listOpportunities> {
    return this.queries.listOpportunities(input);
  }

  getOpportunity(input: { opportunityId: string }): ReturnType<typeof this.queries.getOpportunity> {
    return this.queries.getOpportunity(input);
  }

  listCampaigns(): ReturnType<typeof this.queries.listCampaigns> {
    return this.queries.listCampaigns();
  }

  getCampaign(input: CampaignBrowseInput): ReturnType<typeof this.queries.getCampaign> {
    return this.queries.getCampaign(input);
  }

  listCreativeAssets(input?: ProductReadFilter & { kind?: 'script' | 'storyboard'; origin?: 'preset' | 'saved' }): ReturnType<typeof this.queries.listCreativeAssets> {
    return this.queries.listCreativeAssets(input);
  }

  getCreativeAsset(input: ProductVersionRef & { kind: 'script' | 'storyboard' }): ReturnType<typeof this.queries.getCreativeAsset> {
    return this.queries.getCreativeAsset(input);
  }

  listDeliverables(input?: ProductReadFilter): ReturnType<typeof this.queries.listDeliverables> {
    return this.queries.listDeliverables(input);
  }

  getAgentActivity(input: { campaignId: string }): ReturnType<typeof this.queries.getAgentActivity> {
    return this.queries.getAgentActivity(input);
  }

  // ------------------------------------------------ Interactive product writes
  beginCampaignEdit(input: BeginCampaignEditInput): Promise<ApiResult<{ session: SessionView; version: import('./product-contract').ProductVersion }>> {
    return this.productCommands.beginCampaignEdit(input);
  }

  openActivityReplay(input: { campaignId: string; creationKey: string }): Promise<ApiResult<{ session: SessionView; lastSequence: number }>> {
    return this.productCommands.openActivityReplay(input);
  }

  exportScriptPack(input: ProductVersionRef & { idempotencyKey: string }): Promise<ApiResult<PreparedProductExport>> {
    return this.productCommands.exportScriptPack(input);
  }

  getProductExport(input: { exportId: string }): Promise<ApiResult<PreparedProductExport>> {
    return this.productCommands.getProductExport(input);
  }

  markProductExportTriggered(input: { exportId: string }): Promise<ApiResult<ProductExportRecord>> {
    return this.productCommands.markProductExportTriggered(input);
  }

  // ------------------------------------------------- AS-002 provided assets
  private async getProvidedSet(input: { campaignId: string; scenarioVersion: string }): Promise<ProvidedAssetSet | null> {
    if (!this.providedAssetSource) return null;
    if (!input?.campaignId || !input?.scenarioVersion) return null;
    const set = await this.providedAssetSource.getAssetSet();
    if (!set) return null;
    if (set.campaignId !== input.campaignId) return null;
    if (set.scenarioVersion !== input.scenarioVersion) return null;
    return set;
  }

  async getProvidedAssets(input: { campaignId: string; scenarioVersion: string }): Promise<ApiResult<ProvidedAssetSet | null>> {
    try {
      if (!input?.campaignId || !input?.scenarioVersion) {
        return this.failure('INVALID_INPUT', 'input.campaignId and input.scenarioVersion are required.');
      }
      return this.success(await this.getProvidedSet(input));
    } catch (error) {
      return this.failureFromUnknown(error);
    }
  }

  async getProvidedAssetDownload(input: { campaignId: string; scenarioVersion: string; assetId: string }): Promise<ApiResult<DownloadResult>> {
    try {
      if (!input?.campaignId || !input?.scenarioVersion || !input?.assetId) {
        return this.failure('INVALID_INPUT', 'input.campaignId, input.scenarioVersion and input.assetId are required.');
      }
      if (!this.providedAssetSource) {
        return this.failure('ASSET_UNAVAILABLE', 'No provided asset set is available in this workspace.');
      }
      const set = await this.getProvidedSet(input);
      if (!set) return this.failure('NOT_FOUND', 'No provided asset set matches this campaign and scenario version.');
      const asset = set.assets.find((candidate) => candidate.id === input.assetId && candidate.productId === set.product.id);
      if (!asset) return this.failure('NOT_FOUND', 'The requested provided asset does not exist for this campaign.');
      const bytes = await this.providedAssetSource.getAssetBytes(asset);
      if (!bytes) return this.failure('ASSET_UNAVAILABLE', 'The provided asset bytes could not be read from the published files.');
      if (bytes.byteLength !== asset.bytes) {
        return this.failure('ASSET_UNAVAILABLE', 'The provided asset bytes do not match the published sidecar size.');
      }
      const download = providedDownload(asset, bytes);
      const actualHash = await sha256Hex(bytes);
      if (actualHash !== asset.sha256) {
        return this.failure('ASSET_UNAVAILABLE', 'The provided asset bytes do not match the published sidecar SHA-256.');
      }
      return this.success({ ...download, sha256: actualHash });
    } catch (error) {
      return this.failureFromUnknown(error);
    }
  }

  async listLibraryItems(input?: ProductReadFilter & { kind?: AssetLibraryItem['kind']; origin?: 'preset' | 'saved' }): Promise<ApiResult<{ items: AssetLibraryItem[] }>> {
    try {
      const scriptKind = input?.kind === 'script' || input?.kind === 'storyboard' ? input.kind : undefined;
      const items: AssetLibraryItem[] = input?.kind && !scriptKind
        ? []
        : await this.queries.buildCreativeItems({
          campaignId: input?.campaignId,
          language: input?.language,
          query: input?.query,
          kind: scriptKind,
          origin: input?.origin,
        });
      if (!this.providedAssetSource) return this.success({ items });
      const set = await this.providedAssetSource.getAssetSet();
      if (!set) return this.success({ items });
      if (input?.campaignId && input.campaignId !== set.campaignId) return this.success({ items });
      if (input?.origin === 'saved') return this.success({ items });
      const campaignResult = await this.queries.getCampaign({ campaignId: set.campaignId });
      if (!campaignResult.ok) return this.success({ items });
      const campaign = campaignResult.data.campaign;
      for (const asset of set.assets) {
        if (input?.kind && input.kind !== asset.type) continue;
        if (!asset.visibility.includes('library')) continue;
        if (input?.query) {
          const query = input.query.toLowerCase();
          const haystack = `${asset.label} ${asset.type} ${set.product.officialName}`.toLowerCase();
          if (!haystack.includes(query)) continue;
        }
        const providedItem: ProvidedCreativeItem = { kind: asset.type, asset, version: null, campaign, exportIds: [] };
        items.push(providedItem);
      }
      return this.success({ items });
    } catch (error) {
      return this.failureFromUnknown(error);
    }
  }

  // AS-005 bilingual campaign pack; provided assets are included only when bound.
  async exportCampaignPack(input: { campaignId: string; versions: CampaignVersionRef[]; includeProvidedAssets: boolean; idempotencyKey: string }): Promise<ApiResult<PreparedCampaignPack>> {
    return this.productCommands.exportCampaignPack(input);
  }

  async listCampaignPackExports(input?: { campaignId?: string }): Promise<ApiResult<{ items: CampaignPackRecord[] }>> {
    return this.productCommands.listCampaignPackExports(input);
  }

  async getCampaignPackExport(input: { exportId: string }): Promise<ApiResult<PreparedCampaignPack>> {
    return this.productCommands.getCampaignPackExport(input);
  }

  async markCampaignPackExportTriggered(input: { exportId: string }): Promise<ApiResult<CampaignPackRecord>> {
    return this.productCommands.markCampaignPackExportTriggered(input);
  }

  // ------------------------------------------- FLOW-001 connected journey + social
  getCampaignJourney(input: { campaignId: string; scenarioVersion: string }): ReturnType<typeof this.flowQueries.getCampaignJourney> {
    return this.flowQueries.getCampaignJourney(input);
  }

  prepareSocialDraft(input: PrepareSocialDraftInput): ReturnType<typeof this.socialCommands.prepareSocialDraft> {
    return this.socialCommands.prepareSocialDraft(input);
  }

  getSocialDraft(input: GetSocialDraftInput): ReturnType<typeof this.socialCommands.getSocialDraft> {
    return this.socialCommands.getSocialDraft(input);
  }

  listSocialPosts(input: ListSocialPostsInput): ReturnType<typeof this.socialCommands.listSocialPosts> {
    return this.socialCommands.listSocialPosts(input);
  }

  saveSocialDraft(input: SaveSocialDraftInput): ReturnType<typeof this.socialCommands.saveSocialDraft> {
    return this.socialCommands.saveSocialDraft(input);
  }

  reviewSocialDraft(input: ReviewSocialDraftInput): ReturnType<typeof this.socialCommands.reviewSocialDraft> {
    return this.socialCommands.reviewSocialDraft(input);
  }

  simulateSocialPublish(input: SimulateSocialPublishInput): ReturnType<typeof this.socialCommands.simulateSocialPublish> {
    return this.socialCommands.simulateSocialPublish(input);
  }

  getSocialPost(input: GetSocialPostInput): ReturnType<typeof this.socialCommands.getSocialPost> {
    return this.socialCommands.getSocialPost(input);
  }
}

function requireReplay(result: DomainResult<DomainState['replay']>): DomainState['replay'] {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.value;
}

export function createMockApi(options: MockApiOptions): FlowAwareMockApi {
  return new BrowserMockApi(options);
}
