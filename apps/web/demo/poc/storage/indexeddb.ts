import {
  createReceiptKeyForCreation,
  inspectPersistedSession,
  receiptKey,
  validatePersistedSession,
  type ActionRecord,
  type CommandReceipt,
  type CreateSessionOutcome,
  type HistoryBundle,
  type MutationInput,
  type MutationOutcome,
  type PackageMeta,
  type PersistedSession,
  type PocStorage,
  type RecoveryExport,
  type StorageErrorCode,
  type StoredProductExport,
  type StoredCampaignPackExport,
  type StoredSocialWorkflow,
  type WorkspaceLink,
} from './types';

const DB_NAME = 'lavish-poc';
/** DB v3: FLOW-001 additive socialWorkflows store; v1/v2 records are preserved. */
const DB_VERSION = 3;

export class StorageRuntimeError extends Error {
  readonly code: StorageErrorCode;

  constructor(code: StorageErrorCode, message: string) {
    super(message);
    this.name = 'StorageRuntimeError';
    this.code = code;
  }
}

function normalizeStorageError(error: unknown): StorageRuntimeError {
  if (error instanceof StorageRuntimeError) return error;
  const name = error && typeof error === 'object' && 'name' in error ? String((error as { name: unknown }).name) : '';
  if (name === 'QuotaExceededError') {
    return new StorageRuntimeError('STORAGE_QUOTA', 'Browser storage quota was exceeded; nothing was saved.');
  }
  return new StorageRuntimeError('STORAGE_UNAVAILABLE', `IndexedDB operation failed: ${error instanceof Error ? error.message : String(error)}`);
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(normalizeStorageError(request.error));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(normalizeStorageError(transaction.error));
    transaction.onabort = () => reject(normalizeStorageError(transaction.error));
  });
}

export interface IndexedDbStorageOptions {
  factory?: IDBFactory;
  dbName?: string;
  version?: number;
}

export class IndexedDbStorage implements PocStorage {
  readonly mode = 'indexeddb' as const;
  readonly kind = 'indexeddb' as const;
  private readonly factory: IDBFactory;
  private readonly dbName: string;
  private readonly version: number;
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(options: IndexedDbStorageOptions = {}) {
    const factory = options.factory ?? (globalThis.indexedDB as IDBFactory | undefined);
    if (!factory) throw new StorageRuntimeError('STORAGE_UNAVAILABLE', 'IndexedDB is not available in this environment.');
    this.factory = factory;
    this.dbName = options.dbName ?? DB_NAME;
    this.version = options.version ?? DB_VERSION;
  }

  async open(): Promise<void> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = this.factory.open(this.dbName, this.version);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('packages')) db.createObjectStore('packages', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('commandReceipts')) {
            const store = db.createObjectStore('commandReceipts', { keyPath: 'key' });
            store.createIndex('sessionId', 'sessionId', { unique: false });
          }
          if (!db.objectStoreNames.contains('history')) db.createObjectStore('history', { keyPath: 'sessionId' });
          // DB version 2: additive product-product stores only; existing stores/records are preserved.
          if (!db.objectStoreNames.contains('workspaceLinks')) db.createObjectStore('workspaceLinks');
          if (!db.objectStoreNames.contains('productExports')) db.createObjectStore('productExports');
          // DB version 3 (FLOW-001): single additive socialWorkflows aggregate store.
          // sessions/workspaceLinks/productExports/receipts are never deleted or rebuilt.
          if (!db.objectStoreNames.contains('socialWorkflows')) db.createObjectStore('socialWorkflows');
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(normalizeStorageError(request.error));
        request.onblocked = () => reject(new StorageRuntimeError('STORAGE_UNAVAILABLE', 'IndexedDB upgrade is blocked by another tab.'));
      });
    }
    await this.dbPromise;
  }

  async close(): Promise<void> {
    if (this.dbPromise) {
      const db = await this.dbPromise;
      db.close();
      this.dbPromise = null;
    }
  }

  private async db(): Promise<IDBDatabase> {
    await this.open();
    return this.dbPromise as Promise<IDBDatabase>;
  }

  private async readTransaction<T>(stores: string[], executor: (transaction: IDBTransaction) => Promise<T>): Promise<T> {
    const db = await this.db();
    const transaction = db.transaction(stores, 'readonly');
    const done = transactionDone(transaction);
    try {
      const value = await executor(transaction);
      await done;
      return value;
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // transaction may already be finished
      }
      await done.catch(() => undefined);
      throw error;
    }
  }

  private async writeTransaction<T>(stores: string[], executor: (transaction: IDBTransaction) => Promise<T>): Promise<T> {
    const db = await this.db();
    const transaction = db.transaction(stores, 'readwrite');
    const done = transactionDone(transaction);
    try {
      const value = await executor(transaction);
      await done;
      return value;
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // transaction may already be finished
      }
      await done.catch(() => undefined);
      throw error;
    }
  }

  private async rawSession(transaction: IDBTransaction, sessionId: string): Promise<PersistedSession | null> {
    const raw: unknown = await requestToPromise(transaction.objectStore('sessions').get(sessionId));
    if (raw === undefined) return null;
    const inspection = inspectPersistedSession(raw);
    if (!inspection.ok) {
      throw new StorageRuntimeError(inspection.code ?? 'CORRUPT_SESSION', `${inspection.code ?? 'CORRUPT_SESSION'}: ${inspection.message ?? 'Invalid persisted session.'}`);
    }
    return inspection.record as PersistedSession;
  }

  async listSessions(): Promise<PersistedSession[]> {
    const rows = await this.readTransaction(['sessions'], async (transaction) => {
      return requestToPromise<unknown[]>(transaction.objectStore('sessions').getAll() as IDBRequest<unknown[]>);
    });
    return rows.filter(validatePersistedSession);
  }

  async getSession(sessionId: string): Promise<PersistedSession | null> {
    return this.readTransaction(['sessions'], (transaction) => this.rawSession(transaction, sessionId));
  }

  async getHistory(sessionId: string): Promise<ActionRecord[]> {
    const bundle = await this.readTransaction(['history'], (transaction) =>
      requestToPromise<HistoryBundle | undefined>(transaction.objectStore('history').get(sessionId) as IDBRequest<HistoryBundle | undefined>),
    );
    return Array.isArray(bundle?.items) ? bundle.items : [];
  }

  async getReceipt(sessionId: string, operation: string, idempotencyKey: string): Promise<CommandReceipt | null> {
    const key = receiptKey(sessionId, operation, idempotencyKey);
    return this.readTransaction(['commandReceipts'], async (transaction) => {
      const receipt = await requestToPromise<CommandReceipt | undefined>(
        transaction.objectStore('commandReceipts').get(key) as IDBRequest<CommandReceipt | undefined>,
      );
      return receipt ?? null;
    });
  }

  async getCreationReceipt(creationKey: string): Promise<CommandReceipt | null> {
    const key = createReceiptKeyForCreation(creationKey);
    return this.readTransaction(['commandReceipts'], async (transaction) => {
      const receipt = await requestToPromise<CommandReceipt | undefined>(
        transaction.objectStore('commandReceipts').get(key) as IDBRequest<CommandReceipt | undefined>,
      );
      return receipt ?? null;
    });
  }

  async createSession(
    record: PersistedSession,
    creationKey: string,
    bodyHash: string,
    packageMeta: PackageMeta,
    response: { data: unknown; meta: unknown },
  ): Promise<CreateSessionOutcome> {
    try {
      return await this.writeTransaction(['sessions', 'commandReceipts', 'history', 'packages'], async (transaction) => {
        const receipts = transaction.objectStore('commandReceipts');
        const key = createReceiptKeyForCreation(creationKey);
        const existing = await requestToPromise<CommandReceipt | undefined>(
          receipts.get(key) as IDBRequest<CommandReceipt | undefined>,
        );
        if (existing) {
          if (existing.bodyHash !== bodyHash) {
            return { kind: 'conflict' as const, failure: { ok: false as const, code: 'IDEMPOTENCY_CONFLICT' as const, message: 'Creation key was reused with a different request body.' } };
          }
          const existingRecord = await this.rawSession(transaction, existing.sessionId);
          return { kind: 'replayed' as const, record: existingRecord ?? undefined, receipt: existing };
        }
        transaction.objectStore('packages').put(packageMeta);
        transaction.objectStore('sessions').put(record);
        transaction.objectStore('history').put({ sessionId: record.id, items: record.state.history });
        receipts.put({
          key,
          sessionId: record.id,
          operation: 'createSession',
          idempotencyKey: creationKey,
          bodyHash,
          response: structuredClone(response),
          revision: record.revision,
          createdAt: record.createdAt,
        } satisfies CommandReceipt);
        return { kind: 'created' as const, record };
      });
    } catch (error) {
      const normalized = normalizeStorageError(error);
      return { kind: 'conflict' as const, failure: { ok: false, code: normalized.code, message: normalized.message } };
    }
  }

  async mutateSession(input: MutationInput): Promise<MutationOutcome> {
    try {
      return await this.writeTransaction(['sessions', 'commandReceipts', 'history'], async (transaction) => {
        const receiptStore = transaction.objectStore('commandReceipts');
        const key = receiptKey(input.sessionId, input.operation, input.idempotencyKey);
        const existing = await requestToPromise<CommandReceipt | undefined>(
          receiptStore.get(key) as IDBRequest<CommandReceipt | undefined>,
        );
        if (existing) {
          if (existing.bodyHash === input.bodyHash) {
            return { ok: false, kind: 'idempotent-replay' as const, code: 'IDEMPOTENT_REPLAY', message: 'Original response replayed.', receipt: existing };
          }
          return { ok: false, kind: 'idempotency-conflict' as const, code: 'IDEMPOTENCY_CONFLICT', message: 'Idempotency key was reused with a different request body.' };
        }
        const current = await this.rawSession(transaction, input.sessionId);
        if (!current) {
          return { ok: false, kind: 'error' as const, code: 'SESSION_NOT_FOUND', message: `Unknown session ${input.sessionId}.` };
        }
        if (current.revision !== input.expectedRevision) {
          return {
            ok: false,
            kind: 'revision' as const,
            code: 'REVISION_CONFLICT',
            message: `Expected revision ${input.expectedRevision}, current is ${current.revision}.`,
          };
        }
        let computed;
        try {
          computed = input.mutate(current);
        } catch (error) {
          const shape = error as { name?: string; message?: string; fieldErrors?: Array<{ path: string; message: string }> };
          return {
            ok: false,
            kind: 'error' as const,
            code: shape?.name === 'InputFailure' ? 'INVALID_INPUT' : 'MOCK_FAILURE',
            message: shape?.message ?? String(error),
            fieldErrors: shape?.fieldErrors,
          };
        }
        if (!computed.ok) {
          return { ok: false, kind: 'error' as const, code: computed.code, message: computed.message, fieldErrors: computed.fieldErrors };
        }
        const next = computed.next;
        if (!validatePersistedSession(next) || next.id !== current.id || next.revision !== current.revision + 1) {
          return { ok: false, kind: 'error' as const, code: 'STORAGE_UNAVAILABLE', message: 'Mutation produced an invalid session revision/record; nothing was saved.' };
        }
        const receipt: CommandReceipt = {
          key,
          sessionId: input.sessionId,
          operation: input.operation,
          idempotencyKey: input.idempotencyKey,
          bodyHash: input.bodyHash,
          response: computed.response,
          revision: next.revision,
          createdAt: input.nowIso,
        };
        transaction.objectStore('sessions').put(next);
        transaction.objectStore('history').put({ sessionId: next.id, items: next.state.history });
        receiptStore.put(receipt);
        return { ok: true as const, next, response: computed.response, receipt };
      });
    } catch (error) {
      const normalized = normalizeStorageError(error);
      return { ok: false, kind: 'storage' as const, code: normalized.code, message: normalized.message };
    }
  }

  async exportSession(sessionId: string): Promise<RecoveryExport | null> {
    const raw = await this.readTransaction(['sessions', 'history', 'commandReceipts'], async (transaction) => {
      const session = await requestToPromise<unknown>(transaction.objectStore('sessions').get(sessionId) as IDBRequest<unknown>);
      const historyBundle = await requestToPromise<HistoryBundle | undefined>(
        transaction.objectStore('history').get(sessionId) as IDBRequest<HistoryBundle | undefined>,
      );
      const receiptStore = transaction.objectStore('commandReceipts');
      const receipts = receiptStore.indexNames.contains('sessionId')
        ? await requestToPromise<CommandReceipt[]>(receiptStore.index('sessionId').getAll(sessionId) as IDBRequest<CommandReceipt[]>)
        : [];
      return { session, historyBundle, receipts };
    });
    if (raw.session === undefined) return null;
    const inspection = inspectPersistedSession(raw.session);
    return {
      schemaVersion: '1.0.0',
      mode: 'mock',
      status: inspection.ok ? 'valid' : inspection.code === 'SCHEMA_UNSUPPORTED' ? 'unsupported' : 'corrupt',
      error: inspection.ok
        ? null
        : { code: (inspection.code ?? 'CORRUPT_SESSION') as 'CORRUPT_SESSION' | 'SCHEMA_UNSUPPORTED', message: inspection.message ?? 'Invalid persisted session.' },
      exportedAt: new Date(0).toISOString(),
      session: raw.session,
      history: Array.isArray(raw.historyBundle?.items) ? raw.historyBundle.items : [],
      receipts: raw.receipts,
    };
  }

  async putPackageMeta(meta: PackageMeta): Promise<void> {
    await this.writeTransaction(['packages'], async (transaction) => {
      transaction.objectStore('packages').put(meta);
    });
  }

  async getPackageMeta(packageHash: string): Promise<PackageMeta | null> {
    return this.readTransaction(['packages'], async (transaction) => {
      const value = await requestToPromise<PackageMeta | undefined>(
        transaction.objectStore('packages').get(packageHash) as IDBRequest<PackageMeta | undefined>,
      );
      return value ?? null;
    });
  }

  async getWorkspaceLink(campaignId: string, packageHash: string): Promise<WorkspaceLink | null> {
    const key = `${campaignId}@${packageHash}`;
    return this.readTransaction(['workspaceLinks'], async (transaction) => {
      const value = await requestToPromise<WorkspaceLink | undefined>(
        transaction.objectStore('workspaceLinks').get(key) as IDBRequest<WorkspaceLink | undefined>,
      );
      return value ?? null;
    });
  }

  async putWorkspaceLink(link: WorkspaceLink): Promise<void> {
    await this.writeTransaction(['workspaceLinks'], async (transaction) => {
      transaction.objectStore('workspaceLinks').put(link, `${link.campaignId}@${link.packageHash}`);
    });
  }

  async listWorkspaceLinks(): Promise<WorkspaceLink[]> {
    return this.readTransaction(['workspaceLinks'], async (transaction) => {
      const rows = await requestToPromise<unknown[]>(transaction.objectStore('workspaceLinks').getAll() as IDBRequest<unknown[]>);
      return rows.filter((row): row is WorkspaceLink => Boolean(row) && typeof row === 'object' && !Array.isArray(row));
    });
  }

  async putProductExport(value: StoredProductExport): Promise<void> {
    await this.writeTransaction(['productExports'], async (transaction) => {
      transaction.objectStore('productExports').put(value, value.record.id);
    });
  }

  async getProductExport(exportId: string): Promise<StoredProductExport | null> {
    return this.readTransaction(['productExports'], async (transaction) => {
      const value = await requestToPromise<StoredProductExport | StoredCampaignPackExport | undefined>(
        transaction.objectStore('productExports').get(exportId) as IDBRequest<StoredProductExport | StoredCampaignPackExport | undefined>,
      );
      if (!value || (value.record as { kind?: string }).kind === 'provided_asset_campaign_pack') return null;
      return value as StoredProductExport;
    });
  }

  async listProductExports(): Promise<StoredProductExport[]> {
    return this.readTransaction(['productExports'], async (transaction) => {
      const rows = await requestToPromise<unknown[]>(transaction.objectStore('productExports').getAll() as IDBRequest<unknown[]>);
      return rows.filter((row): row is StoredProductExport => Boolean(row) && typeof row === 'object' && !Array.isArray(row)
        && (row as { record?: { kind?: string } }).record?.kind !== 'provided_asset_campaign_pack');
    });
  }

  async updateProductExportStatus(exportId: string, status: 'prepared' | 'download_triggered'): Promise<StoredProductExport | null> {
    return this.writeTransaction(['productExports'], async (transaction) => {
      const store = transaction.objectStore('productExports');
      const existing = await requestToPromise<StoredProductExport | StoredCampaignPackExport | undefined>(
        store.get(exportId) as IDBRequest<StoredProductExport | StoredCampaignPackExport | undefined>,
      );
      if (!existing || (existing.record as { kind?: string }).kind === 'provided_asset_campaign_pack') return null;
      const product = existing as StoredProductExport;
      const next: StoredProductExport = { ...product, record: { ...product.record, status } };
      store.put(next, exportId);
      return next;
    });
  }

  async putCampaignPackExport(value: StoredCampaignPackExport): Promise<void> {
    await this.writeTransaction(['productExports'], async (transaction) => {
      transaction.objectStore('productExports').put(value, value.record.id);
    });
  }

  async getCampaignPackExport(exportId: string): Promise<StoredCampaignPackExport | null> {
    return this.readTransaction(['productExports'], async (transaction) => {
      const value = await requestToPromise<StoredCampaignPackExport | undefined>(
        transaction.objectStore('productExports').get(exportId) as IDBRequest<StoredCampaignPackExport | undefined>,
      );
      return value && value.record?.kind === 'provided_asset_campaign_pack' ? value : null;
    });
  }

  async listCampaignPackExports(): Promise<StoredCampaignPackExport[]> {
    return this.readTransaction(['productExports'], async (transaction) => {
      const rows = await requestToPromise<unknown[]>(transaction.objectStore('productExports').getAll() as IDBRequest<unknown[]>);
      return rows.filter((row): row is StoredCampaignPackExport => Boolean(row) && typeof row === 'object' && !Array.isArray(row)
        && (row as StoredCampaignPackExport).record?.kind === 'provided_asset_campaign_pack');
    });
  }

  async updateCampaignPackExportStatus(exportId: string, status: 'prepared' | 'download_triggered'): Promise<StoredCampaignPackExport | null> {
    return this.writeTransaction(['productExports'], async (transaction) => {
      const store = transaction.objectStore('productExports');
      const existing = await requestToPromise<StoredCampaignPackExport | undefined>(store.get(exportId) as IDBRequest<StoredCampaignPackExport | undefined>);
      if (!existing || existing.record?.kind !== 'provided_asset_campaign_pack') return null;
      const next: StoredCampaignPackExport = { ...existing, record: { ...existing.record, status } };
      store.put(next, exportId);
      return next;
    });
  }

  // ------------------------------------------------- FLOW-001 socialWorkflows
  private static socialKey(value: StoredSocialWorkflow): string {
    return `${value.campaignId}@${value.packageHash}`;
  }

  async getSocialWorkflow(key: string): Promise<StoredSocialWorkflow | null> {
    return this.readTransaction(['socialWorkflows'], async (transaction) => {
      const value = await requestToPromise<StoredSocialWorkflow | undefined>(
        transaction.objectStore('socialWorkflows').get(key) as IDBRequest<StoredSocialWorkflow | undefined>,
      );
      return value ?? null;
    });
  }

  /** Single atomic put of a whole aggregate (drafts + attempts + receipts). */
  async putSocialWorkflow(value: StoredSocialWorkflow): Promise<void> {
    if (!value || typeof value.campaignId !== 'string' || typeof value.packageHash !== 'string') {
      throw new StorageRuntimeError('STORAGE_UNAVAILABLE', 'A social workflow aggregate requires campaignId and packageHash; nothing was saved.');
    }
    await this.writeTransaction(['socialWorkflows'], async (transaction) => {
      transaction.objectStore('socialWorkflows').put(value, IndexedDbStorage.socialKey(value));
    });
  }

  async listSocialWorkflows(): Promise<StoredSocialWorkflow[]> {
    return this.readTransaction(['socialWorkflows'], async (transaction) => {
      const rows = await requestToPromise<unknown[]>(transaction.objectStore('socialWorkflows').getAll() as IDBRequest<unknown[]>);
      return rows.filter((row): row is StoredSocialWorkflow => Boolean(row) && typeof row === 'object' && !Array.isArray(row)
        && typeof (row as StoredSocialWorkflow).campaignId === 'string'
        && typeof (row as StoredSocialWorkflow).packageHash === 'string'
        && Array.isArray((row as StoredSocialWorkflow).drafts)
        && Array.isArray((row as StoredSocialWorkflow).attempts));
    });
  }
}
