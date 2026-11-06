import {
  createReceiptKeyForCreation,
  inspectPersistedSession,
  receiptKey,
  type ActionRecord,
  type CommandReceipt,
  type CreateSessionOutcome,
  type MutationInput,
  type MutationOutcome,
  type PackageMeta,
  type PersistedSession,
  type PocStorage,
  type RecoveryExport,
  type StoredProductExport,
  type StoredCampaignPackExport,
  type StoredSocialWorkflow,
  type WorkspaceLink,
} from './types';

export interface MemoryStorageOptions {
  now?: () => string;
}

/**
 * Explicit opt-in memory mode. It has the same atomic CAS/idempotency semantics
 * as IndexedDB but all data is lost on refresh; callers must show that warning.
 */
export class MemoryStorage implements PocStorage {
  readonly mode = 'memory' as const;
  readonly kind = 'memory' as const;
  private readonly sessions = new Map<string, PersistedSession>();
  private readonly receipts = new Map<string, CommandReceipt>();
  private readonly histories = new Map<string, ActionRecord[]>();
  private readonly packages = new Map<string, PackageMeta>();
  private readonly workspaceLinks = new Map<string, WorkspaceLink>();
  private readonly productExports = new Map<string, StoredProductExport>();
  private readonly campaignPackExports = new Map<string, StoredCampaignPackExport>();
  private readonly socialWorkflows = new Map<string, StoredSocialWorkflow>();
  private mutex: Promise<unknown> = Promise.resolve();
  private readonly now: () => string;

  constructor(options: MemoryStorageOptions = {}) {
    this.now = options.now ?? (() => new Date(0).toISOString());
  }

  async open(): Promise<void> {}

  async close(): Promise<void> {}

  private serialized<T>(operation: () => Promise<T> | T): Promise<T> {
    const run = this.mutex.then(operation, operation);
    this.mutex = run.catch(() => undefined);
    return run;
  }

  async listSessions(): Promise<PersistedSession[]> {
    return [...this.sessions.values()]
      .filter((record) => inspectPersistedSession(record).ok)
      .map((record) => structuredClone(record));
  }

  async getSession(sessionId: string): Promise<PersistedSession | null> {
    const record = this.sessions.get(sessionId);
    if (!record) return null;
    const inspection = inspectPersistedSession(record);
    if (!inspection.ok) throw new Error(`${inspection.code}:${inspection.message}`);
    return structuredClone(record);
  }

  async getHistory(sessionId: string): Promise<ActionRecord[]> {
    return structuredClone(this.histories.get(sessionId) ?? []);
  }

  async getReceipt(sessionId: string, operation: string, idempotencyKey: string): Promise<CommandReceipt | null> {
    const receipt = this.receipts.get(receiptKey(sessionId, operation, idempotencyKey));
    return receipt ? structuredClone(receipt) : null;
  }

  async createSession(
    record: PersistedSession,
    creationKey: string,
    bodyHash: string,
    packageMeta: PackageMeta,
    response: { data: unknown; meta: unknown },
  ): Promise<CreateSessionOutcome> {
    return this.serialized(() => {
      const key = createReceiptKeyForCreation(creationKey);
      const existing = this.receipts.get(key);
      if (existing) {
        if (existing.bodyHash !== bodyHash) {
          return {
            kind: 'conflict' as const,
            failure: { ok: false as const, code: 'IDEMPOTENCY_CONFLICT' as const, message: 'Creation key was reused with a different request body.' },
          };
        }
        const storedRecord = this.sessions.get(existing.sessionId);
        return {
          kind: 'replayed' as const,
          record: storedRecord ? structuredClone(storedRecord) : undefined,
          receipt: structuredClone(existing),
        };
      }
      const stored = structuredClone(record);
      this.sessions.set(stored.id, structuredClone(stored));
      this.histories.set(stored.id, structuredClone(stored.state.history));
      this.packages.set(packageMeta.id, structuredClone(packageMeta));
      const receipt: CommandReceipt = {
        key,
        sessionId: stored.id,
        operation: 'createSession',
        idempotencyKey: creationKey,
        bodyHash,
        response: structuredClone(response),
        revision: stored.revision,
        createdAt: stored.createdAt,
      };
      this.receipts.set(key, structuredClone(receipt));
      return { kind: 'created' as const, record: structuredClone(stored), receipt: structuredClone(receipt) };
    });
  }

  async getCreationReceipt(creationKey: string): Promise<CommandReceipt | null> {
    const receipt = this.receipts.get(createReceiptKeyForCreation(creationKey));
    return receipt ? structuredClone(receipt) : null;
  }

  async mutateSession(input: MutationInput): Promise<MutationOutcome> {
    return this.serialized(() => {
      const key = receiptKey(input.sessionId, input.operation, input.idempotencyKey);
      const existing = this.receipts.get(key);
      if (existing) {
        if (existing.bodyHash === input.bodyHash) {
          return { ok: false as const, kind: 'idempotent-replay' as const, code: 'IDEMPOTENT_REPLAY', message: 'Original response replayed.', receipt: structuredClone(existing) };
        }
        return { ok: false as const, kind: 'idempotency-conflict' as const, code: 'IDEMPOTENCY_CONFLICT', message: 'Idempotency key was reused with a different request body.' };
      }
      const current = this.sessions.get(input.sessionId);
      if (!current) {
        return { ok: false as const, kind: 'error' as const, code: 'SESSION_NOT_FOUND', message: `Unknown session ${input.sessionId}.` };
      }
      const inspection = inspectPersistedSession(current);
      if (!inspection.ok) {
        return { ok: false as const, kind: 'storage' as const, code: inspection.code ?? 'CORRUPT_SESSION', message: inspection.message ?? 'Corrupt session.' };
      }
      if (current.revision !== input.expectedRevision) {
        return {
          ok: false as const,
          kind: 'revision' as const,
          code: 'REVISION_CONFLICT',
          message: `Expected revision ${input.expectedRevision}, current is ${current.revision}.`,
        };
      }
      let computed;
      try {
        computed = input.mutate(structuredClone(current));
      } catch (error) {
        const shape = error as { name?: string; message?: string; fieldErrors?: Array<{ path: string; message: string }> };
        return {
          ok: false as const,
          kind: 'error' as const,
          code: shape?.name === 'InputFailure' ? 'INVALID_INPUT' : 'MOCK_FAILURE',
          message: shape?.message ?? String(error),
          fieldErrors: shape?.fieldErrors,
        };
      }
      if (!computed.ok) {
        return { ok: false as const, kind: 'error' as const, code: computed.code, message: computed.message, fieldErrors: computed.fieldErrors };
      }
      const next = structuredClone(computed.next);
      if (!inspectPersistedSession(next).ok || next.id !== current.id || next.revision !== current.revision + 1) {
        return { ok: false as const, kind: 'error' as const, code: 'STORAGE_UNAVAILABLE', message: 'Mutation produced an invalid session revision/record; nothing was saved.' };
      }
      this.sessions.set(next.id, structuredClone(next));
      this.histories.set(next.id, structuredClone(next.state.history));
      const response = structuredClone(computed.response);
      const receipt: CommandReceipt = {
        key,
        sessionId: next.id,
        operation: input.operation,
        idempotencyKey: input.idempotencyKey,
        bodyHash: input.bodyHash,
        response: structuredClone(response),
        revision: next.revision,
        createdAt: input.nowIso,
      };
      this.receipts.set(key, structuredClone(receipt));
      return { ok: true as const, next: structuredClone(next), response: structuredClone(response), receipt: structuredClone(receipt) };
    });
  }

  async exportSession(sessionId: string): Promise<RecoveryExport | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    const inspection = inspectPersistedSession(session);
    return {
      schemaVersion: '1.0.0',
      mode: 'mock',
      status: inspection.ok ? 'valid' : inspection.code === 'SCHEMA_UNSUPPORTED' ? 'unsupported' : 'corrupt',
      error: inspection.ok
        ? null
        : { code: (inspection.code ?? 'CORRUPT_SESSION') as 'CORRUPT_SESSION' | 'SCHEMA_UNSUPPORTED', message: inspection.message ?? 'Invalid persisted session.' },
      exportedAt: this.now(),
      session: structuredClone(session),
      history: structuredClone(this.histories.get(sessionId) ?? []),
      receipts: [...this.receipts.values()]
        .filter((receipt) => receipt.sessionId === sessionId)
        .map((receipt) => structuredClone(receipt)),
    };
  }

  async putPackageMeta(meta: PackageMeta): Promise<void> {
    this.packages.set(meta.id, structuredClone(meta));
  }

  async getPackageMeta(packageHash: string): Promise<PackageMeta | null> {
    const meta = this.packages.get(packageHash);
    return meta ? structuredClone(meta) : null;
  }

  async getWorkspaceLink(campaignId: string, packageHash: string): Promise<WorkspaceLink | null> {
    const link = this.workspaceLinks.get(`${campaignId}@${packageHash}`);
    return link ? structuredClone(link) : null;
  }

  async putWorkspaceLink(link: WorkspaceLink): Promise<void> {
    this.workspaceLinks.set(`${link.campaignId}@${link.packageHash}`, structuredClone(link));
  }

  async listWorkspaceLinks(): Promise<WorkspaceLink[]> {
    return [...this.workspaceLinks.values()].map((link) => structuredClone(link));
  }

  async putProductExport(value: StoredProductExport): Promise<void> {
    this.productExports.set(value.record.id, structuredClone(value));
  }

  async getProductExport(exportId: string): Promise<StoredProductExport | null> {
    const stored = this.productExports.get(exportId);
    return stored ? structuredClone(stored) : null;
  }

  async listProductExports(): Promise<StoredProductExport[]> {
    return [...this.productExports.values()].map((value) => structuredClone(value));
  }

  async updateProductExportStatus(exportId: string, status: 'prepared' | 'download_triggered'): Promise<StoredProductExport | null> {
    const stored = this.productExports.get(exportId);
    if (!stored) return null;
    const next: StoredProductExport = { ...structuredClone(stored), record: { ...structuredClone(stored.record), status } };
    this.productExports.set(exportId, next);
    return structuredClone(next);
  }

  async putCampaignPackExport(value: StoredCampaignPackExport): Promise<void> {
    this.campaignPackExports.set(value.record.id, structuredClone(value));
  }

  async getCampaignPackExport(exportId: string): Promise<StoredCampaignPackExport | null> {
    const stored = this.campaignPackExports.get(exportId);
    return stored ? structuredClone(stored) : null;
  }

  async listCampaignPackExports(): Promise<StoredCampaignPackExport[]> {
    return [...this.campaignPackExports.values()].map((value) => structuredClone(value));
  }

  async updateCampaignPackExportStatus(exportId: string, status: 'prepared' | 'download_triggered'): Promise<StoredCampaignPackExport | null> {
    const stored = this.campaignPackExports.get(exportId);
    if (!stored) return null;
    const next: StoredCampaignPackExport = { ...structuredClone(stored), record: { ...structuredClone(stored.record), status } };
    this.campaignPackExports.set(exportId, next);
    return structuredClone(next);
  }

  // FLOW-001 DB v3 socialWorkflows aggregate; same atomic put semantics as IndexedDB.
  async getSocialWorkflow(key: string): Promise<StoredSocialWorkflow | null> {
    const stored = this.socialWorkflows.get(key);
    return stored ? structuredClone(stored) : null;
  }

  async putSocialWorkflow(value: StoredSocialWorkflow): Promise<void> {
    return this.serialized(() => {
      this.socialWorkflows.set(`${value.campaignId}@${value.packageHash}`, structuredClone(value));
    });
  }

  async listSocialWorkflows(): Promise<StoredSocialWorkflow[]> {
    return [...this.socialWorkflows.values()].map((value) => structuredClone(value));
  }
}
