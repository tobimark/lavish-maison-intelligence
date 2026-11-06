import { describe, expect, test } from 'vitest';
import { IDBFactory as FakeIDBFactory } from 'fake-indexeddb';
import { createFixture } from '../fixtures/poc/build-fixture';
import { createInitialState } from '../../apps/web/demo/poc/domain';
import {
  IndexedDbStorage,
  MemoryStorage,
  receiptKey,
  validatePersistedSession,
  type PackageMeta,
  type PersistedSession,
} from '../../apps/web/demo/poc/storage';

const NOW = '2026-11-04T00:00:00.000Z';

function buildScenarioPackage() {
  const files = createFixture().files as Record<string, any>;
  return {
    manifest: files['manifest.json'],
    brand: files['brand.json'],
    discovery: files['discovery.json'],
    analysis: files['analysis.json'],
    script: files['script.json'],
    video: files['video.json'],
    delivery: files['delivery.json'],
    events: files['events.json'],
    assets: files['assets.json'],
    expected: files['expected.json'],
  } as any;
}

const pkg = buildScenarioPackage();
const PACKAGE_HASH = 'TEST_ONLY_PACKAGE_HASH';

function buildRecord(id = 'usr.test-session'): PersistedSession {
  const state = createInitialState(pkg, { sessionId: id, packageHash: PACKAGE_HASH, createdAt: NOW });
  return {
    schemaVersion: '1.0.0',
    id,
    scenarioId: pkg.manifest.scenarioId,
    scenarioVersion: pkg.manifest.scenarioVersion,
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

function packageMeta(): PackageMeta {
  return {
    id: PACKAGE_HASH,
    scenarioId: pkg.manifest.scenarioId,
    scenarioVersion: pkg.manifest.scenarioVersion,
    packageHash: PACKAGE_HASH,
    schemaVersion: '1.0.0',
    storedAt: NOW,
  };
}

function creationResponse(record: PersistedSession) {
  return { data: { id: record.id, revision: record.revision }, meta: { revision: record.revision } };
}

function nextRecord(current: PersistedSession): PersistedSession {
  return { ...current, revision: current.revision + 1, updatedAt: NOW, state: { ...current.state, revision: current.state.revision + 1 } };
}

let dbCounter = 0;
function newIdbStorage(): IndexedDbStorage {
  dbCounter += 1;
  return new IndexedDbStorage({ factory: new FakeIDBFactory(), dbName: `lavish-poc-test-${dbCounter}` });
}

describe('POC-004 IndexedDB storage', () => {
  test('creates, reads, lists sessions and stores package metadata', async () => {
    const storage = newIdbStorage();
    await storage.open();
    const record = buildRecord();
    const created = await storage.createSession(record, 'creation-key', 'hash-a', packageMeta(), creationResponse(record));
    expect(created.kind).toBe('created');
    expect((await storage.getSession(record.id))?.revision).toBe(0);
    expect(await storage.listSessions()).toHaveLength(1);
    expect(await storage.getPackageMeta(PACKAGE_HASH)).toMatchObject({ packageHash: PACKAGE_HASH });
    expect((await storage.getSession('usr.missing'))).toBeNull();
    await storage.close();
  });

  test('creation key is idempotent, different body conflicts, and receipt is persisted', async () => {
    const storage = newIdbStorage();
    await storage.open();
    const record = buildRecord();
    expect((await storage.createSession(record, 'key', 'body-1', packageMeta(), creationResponse(record))).kind).toBe('created');
    expect((await storage.createSession(record, 'key', 'body-1', packageMeta(), creationResponse(record))).kind).toBe('replayed');
    expect((await storage.createSession(record, 'key', 'body-2', packageMeta(), creationResponse(record))).kind).toBe('conflict');
    expect((await storage.exportSession(record.id))?.receipts.length).toBe(1);
    await storage.close();
  });

  test('two tabs at the same revision: exactly one write wins and the other gets REVISION_CONFLICT', async () => {
    const factory = new FakeIDBFactory();
    const dbName = `lavish-poc-test-concurrent-${Date.now()}`;
    const first = new IndexedDbStorage({ factory, dbName });
    const second = new IndexedDbStorage({ factory, dbName });
    await first.open();
    await second.open();
    const record = buildRecord();
    await first.createSession(record, 'creation', 'body', packageMeta(), creationResponse(record));

    const mutate = (storage: IndexedDbStorage, key: string) =>
      storage.mutateSession({
        sessionId: record.id,
        expectedRevision: 0,
        operation: 'testCommand',
        idempotencyKey: key,
        bodyHash: key,
        nowIso: NOW,
        mutate: (current) => ({ ok: true, next: nextRecord(current), response: { key } }),
      });
    const results = await Promise.all([mutate(first, 'tab-a'), mutate(second, 'tab-b')]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok).map((result) => result.code)).toEqual(['REVISION_CONFLICT']);
    expect((await first.getSession(record.id))?.revision).toBe(1);
    await first.close();
    await second.close();
  });

  test('same key same body replays original response; same key different body conflicts', async () => {
    const storage = newIdbStorage();
    await storage.open();
    const record = buildRecord();
    await storage.createSession(record, 'creation', 'body', packageMeta(), creationResponse(record));
    const base = {
      sessionId: record.id,
      expectedRevision: 0,
      operation: 'testCommand',
      idempotencyKey: 'same-key',
      bodyHash: 'body-a',
      nowIso: NOW,
    };
    const first = await storage.mutateSession({
      ...base,
      mutate: (current) => ({ ok: true, next: nextRecord(current), response: { answer: 1 } }),
    });
    expect(first.ok).toBe(true);
    const replay = await storage.mutateSession({
      ...base,
      expectedRevision: 99,
      mutate: (current) => ({ ok: true, next: nextRecord(current), response: { answer: 2 } }),
    });
    expect(replay.ok).toBe(false);
    if (!replay.ok) {
      expect(replay.kind).toBe('idempotent-replay');
      expect(replay.receipt?.response).toEqual({ answer: 1 });
    }
    const conflict = await storage.mutateSession({
      ...base,
      expectedRevision: 1,
      bodyHash: 'body-b',
      mutate: (current) => ({ ok: true, next: nextRecord(current), response: { answer: 3 } }),
    });
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) expect(conflict.code).toBe('IDEMPOTENCY_CONFLICT');
    expect((await storage.getSession(record.id))?.revision).toBe(1);
    await storage.close();
  });

  test('corrupt/unsupported sessions are isolated but remain raw-exportable', async () => {
    const factory = new FakeIDBFactory();
    const dbName = `lavish-poc-test-corrupt-${Date.now()}`;
    const storage = new IndexedDbStorage({ factory, dbName });
    await storage.open();
    const record = buildRecord();
    await storage.createSession(record, 'creation', 'body', packageMeta(), creationResponse(record));
    await storage.close();

    const rawPut = async (value: unknown) => {
      await new Promise<void>((resolve, reject) => {
        // FLOW-001: the shared DB moved from version 2 to version 3 (additive
        // socialWorkflows store). Reopen at the current version to inject the raw
        // corrupt record; the test intent and assertions are unchanged.
        const request = factory.open(dbName, 3);
        request.onupgradeneeded = () => {};
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction('sessions', 'readwrite');
          transaction.objectStore('sessions').put(value);
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      });
    };

    const corrupt = {
      ...record,
      state: { ...record.state, workflow: { ...record.state.workflow, video: 'INVALID_STATE' } },
    };
    await rawPut(corrupt);
    const reopened = new IndexedDbStorage({ factory, dbName });
    await reopened.open();
    await expect(reopened.getSession(record.id)).rejects.toMatchObject({ code: 'CORRUPT_SESSION' });
    const corruptExport = await reopened.exportSession(record.id);
    expect(corruptExport?.status).toBe('corrupt');
    expect((corruptExport?.session as any).state.workflow.video).toBe('INVALID_STATE');
    expect(corruptExport?.receipts.length).toBe(1);
    expect(validatePersistedSession({ id: 'x' })).toBe(false);
    await reopened.close();

    await rawPut({ ...record, schemaVersion: '2.0.0' });
    const unsupported = new IndexedDbStorage({ factory, dbName });
    await unsupported.open();
    await expect(unsupported.getSession(record.id)).rejects.toMatchObject({ code: 'SCHEMA_UNSUPPORTED' });
    const unsupportedExport = await unsupported.exportSession(record.id);
    expect(unsupportedExport?.status).toBe('unsupported');
    expect(unsupportedExport?.error?.code).toBe('SCHEMA_UNSUPPORTED');
    await unsupported.close();
  });

  test('exportSession returns the persisted session, history and receipts for recovery', async () => {
    const storage = newIdbStorage();
    await storage.open();
    const record = buildRecord();
    await storage.createSession(record, 'creation', 'body', packageMeta(), creationResponse(record));
    const exported = await storage.exportSession(record.id);
    expect((exported?.session as PersistedSession).revision).toBe(0);
    expect(exported?.history).toEqual([]);
    expect(exported?.receipts.length).toBe(1);
    await storage.close();
  });
});

describe('POC-004 explicit memory storage', () => {
  test('returned objects/receipts are isolated snapshots and cannot mutate stored data', async () => {
    const storage = new MemoryStorage();
    const record = { ...buildRecord(), storageMode: 'memory' as const };
    const created = await storage.createSession(record, 'isolated', 'body', packageMeta(), creationResponse(record));
    expect(created.kind).toBe('created');
    const createdRecord = created.record!;
    (createdRecord.state.workflow as any).video = 'INVALID_STATE';
    createdRecord.state.history.push({ id: 'usr.injected', sequence: 999, action: 'injected', entityIds: [], occurredAt: NOW, outcome: 'applied', mode: 'mock' });
    expect((await storage.getSession(record.id))?.state.workflow.video).toBe('locked');
    expect((await storage.getSession(record.id))?.state.history).toEqual([]);

    const result = await storage.mutateSession({
      sessionId: record.id,
      expectedRevision: 0,
      operation: 'isolation',
      idempotencyKey: 'isolation-key',
      bodyHash: 'isolation-body',
      nowIso: NOW,
      mutate: (current) => ({ ok: true, next: nextRecord(current), response: { nested: { value: 1 } } }),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      (result.next.state.workflow as any).delivery = 'INVALID_STATE';
      (result.response as any).nested.value = 999;
      (result.receipt.response as any).nested.value = 999;
    }
    const stored = await storage.getSession(record.id);
    expect(stored?.state.workflow.delivery).toBe('locked');
    const replay = await storage.getReceipt(record.id, 'isolation', 'isolation-key');
    expect((replay?.response as any).nested.value).toBe(1);
    const retrieved = await storage.getSession(record.id);
    if (retrieved) (retrieved.state.workflow as any).analysis = 'INVALID_STATE';
    expect((await storage.getSession(record.id))?.state.workflow.analysis).toBe('locked');
  });

  test('has IndexedDB-compatible CAS/idempotency semantics and reports memory mode', async () => {
    const storage = new MemoryStorage();
    await storage.open();
    expect(storage.mode).toBe('memory');
    const record = { ...buildRecord(), storageMode: 'memory' as const };
    await storage.createSession(record, 'creation', 'body', packageMeta(), creationResponse(record));
    const base = {
      sessionId: record.id,
      expectedRevision: 0,
      operation: 'testCommand',
      idempotencyKey: 'memory-key',
      bodyHash: 'body',
      nowIso: NOW,
    };
    const first = await storage.mutateSession({
      ...base,
      mutate: (current) => ({ ok: true, next: nextRecord(current), response: { memory: true } }),
    });
    expect(first.ok).toBe(true);
    const replay = await storage.mutateSession({
      ...base,
      expectedRevision: 7,
      mutate: (current) => ({ ok: true, next: nextRecord(current), response: { memory: false } }),
    });
    expect(replay.ok).toBe(false);
    if (!replay.ok) expect(replay.kind).toBe('idempotent-replay');
    const concurrent = await Promise.all([
      storage.mutateSession({
        ...base,
        idempotencyKey: 'other-a',
        expectedRevision: 1,
        mutate: (current) => ({ ok: true, next: nextRecord(current), response: {} }),
      }),
      storage.mutateSession({
        ...base,
        idempotencyKey: 'other-b',
        expectedRevision: 1,
        mutate: (current) => ({ ok: true, next: nextRecord(current), response: {} }),
      }),
    ]);
    expect(concurrent.filter((result) => result.ok)).toHaveLength(1);
    expect(((await storage.exportSession(record.id))?.session as PersistedSession).revision).toBe(2);
    expect(receiptKey(record.id, 'testCommand', 'memory-key')).toBe(`${record.id}|testCommand|memory-key`);
  });
});



