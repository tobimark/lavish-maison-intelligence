import { IndexedDbStorage } from '/apps/web/demo/poc/storage/index.ts';

const DB_NAME = 'lavish-poc-qa-fix01';
const PACKAGE_HASH = 'TEST_ONLY_QA_PACKAGE_HASH';
const NOW = '2026-11-04T00:00:00.000Z';

function makeRecord(id: string) {
  const workflow = { discovery: 'ready', analysis: 'locked', video: 'locked', delivery: 'locked' };
  const state = {
    sessionId: id,
    scenarioId: 'scn-scent-layering',
    scenarioVersion: '1.0.0',
    packageHash: PACKAGE_HASH,
    revision: 0,
    createdAt: NOW,
    workflow,
    activeBriefId: null,
    activeScriptVersionId: null,
    activeVideoId: null,
    deliveryDraftId: null,
    userVersions: [],
    deliveryDrafts: [],
    stageAttempts: [],
    deliveryAttempts: [],
    pendingDeliveryAttempts: [],
    deliveryRecords: [],
    workflowCursor: 0,
    workflowVisibleEntityIds: [],
    lastWorkflowEventId: null,
    lastWorkflowEventJson: null,
    lastWorkflowAtMs: 0,
    videoAvailability: {},
    videoProgress: {},
    history: [],
    replay: {
      cursorSequence: 0,
      transport: 'idle',
      projection: {
        workflow,
        visibleEntityIds: [],
        activeScriptVersionId: null,
        activeVideoId: null,
        deliveryRecordIds: [],
        confirmedScriptVersionId: null,
        videoAvailability: {},
        videoProgress: {},
      },
      lastAtMs: 0,
      lastEventId: null,
      lastEventJson: null,
    },
  };
  return {
    schemaVersion: '1.0.0',
    id,
    scenarioId: 'scn-scent-layering',
    scenarioVersion: '1.0.0',
    packageHash: PACKAGE_HASH,
    revision: 0,
    createdAt: NOW,
    updatedAt: NOW,
    mode: 'mock',
    storageMode: 'indexeddb',
    state,
    replayRuntime: { speed: 1, virtualMs: 0 },
    workflowRuntime: { transport: 'idle', virtualMs: 0 },
  };
}

function meta() {
  return {
    id: PACKAGE_HASH,
    scenarioId: 'scn-scent-layering',
    scenarioVersion: '1.0.0',
    packageHash: PACKAGE_HASH,
    schemaVersion: '1.0.0',
    storedAt: NOW,
  };
}

function storage() {
  return new IndexedDbStorage({ dbName: DB_NAME });
}

async function create(id: string) {
  const record = makeRecord(id);
  const outcome = await storage().createSession(
    record,
    id,
    `created:${id}`,
    meta(),
    { data: { id, revision: 0 }, meta: { revision: 0, requestId: `create:${id}` } },
  );
  return { kind: outcome.kind, record: outcome.record, receipt: outcome.receipt };
}

async function get(id: string) {
  const record = await storage().getSession(id);
  return record;
}

async function mutate(id: string, key: string, expectedRevision: number) {
  const outcome = await storage().mutateSession({
    sessionId: id,
    expectedRevision,
    operation: 'qaMutate',
    idempotencyKey: key,
    bodyHash: key,
    nowIso: NOW,
    mutate: (current: any) => ({
      ok: true,
      next: {
        ...current,
        revision: current.revision + 1,
        updatedAt: NOW,
        state: { ...current.state, revision: current.revision + 1 },
      },
      response: { key, revision: current.revision + 1 },
    }),
  });
  return { ok: outcome.ok, code: outcome.ok ? null : outcome.code, kind: outcome.ok ? 'ok' : outcome.kind, response: outcome.ok ? outcome.response : null };
}

async function corrupt(id: string) {
  const current = await get(id);
  if (!current) throw new Error('missing session to corrupt');
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('packages')) database.createObjectStore('packages', { keyPath: 'id' });
      if (!database.objectStoreNames.contains('sessions')) database.createObjectStore('sessions', { keyPath: 'id' });
      if (!database.objectStoreNames.contains('commandReceipts')) {
        const store = database.createObjectStore('commandReceipts', { keyPath: 'key' });
        store.createIndex('sessionId', 'sessionId', { unique: false });
      }
      if (!database.objectStoreNames.contains('history')) database.createObjectStore('history', { keyPath: 'sessionId' });
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('sessions', 'readwrite');
    transaction.objectStore('sessions').put({
      ...current,
      state: { ...current.state, workflow: { ...current.state.workflow, video: 'INVALID_STATE' } },
    });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
  return { corrupted: true };
}

async function exportRaw(id: string) {
  return storage().exportSession(id);
}

declare global {
  interface Window {
    qa: {
      create: typeof create;
      get: typeof get;
      mutate: typeof mutate;
      corrupt: typeof corrupt;
      exportRaw: typeof exportRaw;
    };
  }
}

window.qa = { create, get, mutate, corrupt, exportRaw };
