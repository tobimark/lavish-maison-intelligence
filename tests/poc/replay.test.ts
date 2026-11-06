import { describe, expect, test } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createFixture, serialize } from '../fixtures/poc/build-fixture';
import { createMockApi } from '../../apps/web/demo/poc/api';
import type { ApiResult, CommandContext, LoadedScenario, MockApi, ScenarioSource, SessionView } from '../../apps/web/demo/poc/api';
import { MemoryStorage } from '../../apps/web/demo/poc/storage';
import type { ScenarioPackage } from '../../apps/web/demo/poc/domain/types';
import { reduceReplayEvent, createReplayState } from '../../apps/web/demo/poc/domain/replay';
import {
  advanceClock,
  canonicalProjection,
  compareCheckpointProjections,
  createReplayClock,
  projectionHash,
  sequenceAtVirtualMs,
} from '../../apps/web/demo/poc/replay';

const NOW = '2026-11-04T00:00:00.000Z';
const PACKAGE_HASH = 'TEST_ONLY_POC005_PACKAGE_HASH';
const SCENARIO_ID = 'scn-scent-layering';
const SCENARIO_VERSION = '1.0.0';

function buildPackage(): ScenarioPackage {
  const fixture = createFixture();
  const files = fixture.files as Record<string, any>;
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
  } as ScenarioPackage;
}

function makeSource(pkg: ScenarioPackage): ScenarioSource {
  const loaded: LoadedScenario = { scenarioId: SCENARIO_ID, scenarioVersion: SCENARIO_VERSION, packageHash: PACKAGE_HASH, package: pkg, media: {} };
  return {
    async list() {
      return [{ scenarioId: SCENARIO_ID, title: 'TEST_ONLY replay fixture', scenarioVersion: SCENARIO_VERSION, readiness: 'ready', issues: [] }];
    },
    async get() {
      return loaded;
    },
  };
}

function createApi(pkg = buildPackage(), storage = new MemoryStorage()): MockApi {
  return createMockApi({ scenarioSource: makeSource(pkg), storage, now: () => NOW, virtualNow: () => 0 });
}

function unwrap<T>(result: ApiResult<T>): T {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.data;
}

function ctx(state: { id: string; revision: number }, key: string): CommandContext {
  return { sessionId: state.id, expectedRevision: state.revision, idempotencyKey: key };
}

async function createSession(api: MockApi, key = 'replay-session'): Promise<SessionView> {
  return unwrap(await api.createSession({ scenarioId: SCENARIO_ID, scenarioVersion: SCENARIO_VERSION, creationKey: key }));
}

describe('POC-005 deterministic replay', () => {
  test('the POC-003 reducer reproduces every expected checkpoint projection', () => {
    const pkg = buildPackage();
    const expected = pkg.expected.data.checkpoints;
    const result = compareCheckpointProjections(pkg, pkg.events.data.events, expected);
    expect(result.checked).toBe(5);
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
  });

  test('direct seek, sequential step and repeated seek produce the same canonical hash', async () => {
    const pkg = buildPackage();
    const api = createApi(pkg);
    let session = await createSession(api, 'hash-session');

    const direct = unwrap(await api.replayCommand(ctx(session, 'seek-direct'), { action: 'seek', cursorSequence: 21 }));
    session = direct.session;
    const directHash = await projectionHash(direct.projection);
    const directCanonical = canonicalProjection(direct.projection);

    for (let sequence = 1; sequence <= 21; sequence += 1) {
      const step = unwrap(await api.replayCommand(ctx(session, `step-${sequence}`), { action: 'step' }));
      session = step.session;
      if (sequence === 21) expect(await projectionHash(step.projection)).toBe(directHash);
    }
    const steppedHash = await projectionHash(session.replay.projection);
    expect(steppedHash).toBe(directHash);
    expect(canonicalProjection(session.replay.projection)).toBe(directCanonical);

    const seekTwice = unwrap(await api.replayCommand(ctx(session, 'seek-10'), { action: 'seek', cursorSequence: 10 }));
    const seekAgain = unwrap(await api.replayCommand(ctx(seekTwice.session, 'seek-21-again'), { action: 'seek', cursorSequence: 21 }));
    expect(await projectionHash(seekAgain.projection)).toBe(directHash);

    const restart = unwrap(await api.replayCommand(ctx(seekAgain.session, 'restart'), { action: 'restart' }));
    const reseek = unwrap(await api.replayCommand(ctx(restart.session, 'seek-after-restart'), { action: 'seek', cursorSequence: 21 }));
    expect(await projectionHash(reseek.projection)).toBe(directHash);
  });

  test('speed changes wall-clock mapping but not projection or restored paused state', async () => {
    const pkg = buildPackage();
    const storage = new MemoryStorage();
    const api = createApi(pkg, storage);
    let session = await createSession(api, 'speed-session');
    const base = unwrap(await api.replayCommand(ctx(session, 'speed-base'), { action: 'seek', cursorSequence: 21 }));
    session = base.session;
    const baseHash = await projectionHash(base.projection);
    for (const speed of [1, 2, 4] as const) {
      session = unwrap(await api.replayCommand(ctx(session, `speed-${speed}`), { action: 'setSpeed', speed })).session;
      const seek = unwrap(await api.replayCommand(ctx(session, `speed-seek-${speed}`), { action: 'seek', cursorSequence: 21 }));
      session = seek.session;
      expect(await projectionHash(seek.projection)).toBe(baseHash);
    }

    const clock = createReplayClock();
    expect(advanceClock({ ...clock, speed: 2 }, 1000).virtualMs).toBe(2000);
    expect(advanceClock({ ...clock, speed: 4 }, 750).virtualMs).toBe(3000);
    expect(sequenceAtVirtualMs(pkg.events.data.events, pkg.events.data.events[4].atMs)).toBe(5);

    const reopened = createMockApi({ scenarioSource: makeSource(pkg), storage, now: () => NOW, virtualNow: () => 0 });
    const restored = unwrap(await reopened.getSession({ sessionId: session.id }));
    expect(restored.replay.transport).toBe('paused');
  });

  test('virtual-time advance uses the same reducer and does not create user delivery records', async () => {
    const pkg = buildPackage();
    const api = createApi(pkg);
    let session = await createSession(api, 'advance-session');
    expect(session.deliveryAttempts).toEqual([]);
    expect(session.replay.cursorSequence).toBe(0);
    const lastEvent = pkg.events.data.events[pkg.events.data.events.length - 1];
    const advanced = unwrap(await api.advanceReplay(ctx(session, 'advance-end'), { targetVirtualMs: lastEvent.atMs }));
    session = advanced.session;
    expect(session.replay.cursorSequence).toBe(21);
    expect(session.replay.transport).toBe('idle');
    expect(session.deliveryAttempts).toEqual([]);
    expect(session.userVersions).toEqual([]);
    const expected = unwrap(await api.replayCommand(ctx(session, 'seek-compare'), { action: 'seek', cursorSequence: 21 }));
    expect(canonicalProjection(advanced.projection)).toBe(canonicalProjection(expected.projection));
    expect(unwrap(await api.getHistory({ sessionId: session.id })).items).toEqual([]);
  });

  test('two sessions have isolated replay cursors/projections', async () => {
    const api = createApi();
    const first = await createSession(api, 'replay-a');
    const second = await createSession(api, 'replay-b');
    const advanced = unwrap(await api.advanceReplay(ctx(first, 'advance-a'), { targetVirtualMs: 21000 }));
    expect(advanced.session.replay.cursorSequence).toBeGreaterThan(0);
    expect(unwrap(await api.getSession({ sessionId: second.id })).replay.cursorSequence).toBe(0);
  });

  test('repeated identical events are idempotent; changed content at the same sequence is rejected', () => {
    const pkg = buildPackage();
    const first = pkg.events.data.events[0];
    const initial = createReplayState();
    const applied = reduceReplayEvent(pkg, initial, first);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const repeated = reduceReplayEvent(pkg, applied.value, first);
    expect(repeated.ok).toBe(true);
    if (repeated.ok) expect(repeated.value.cursorSequence).toBe(applied.value.cursorSequence);
    const altered = { ...first, id: `${first.id}.changed` };
    const rejected = reduceReplayEvent(pkg, applied.value, altered);
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.error.code).toBe('CORRUPT_EVENT');
  });

  test('validation CLI --replay compares every checkpoint through the same reducer', () => {
    const fixture = createFixture();
    const root = mkdtempSync(path.join(tmpdir(), 'poc005-validator-'));
    const scenarioDir = path.join(root, 'scenario');
    mkdirSync(scenarioDir);
    for (const [name, value] of Object.entries(fixture.files)) {
      writeFileSync(path.join(scenarioDir, name), serialize(value));
    }
    const reportPath = path.join(root, 'report.json');
    try {
      execFileSync(
        process.execPath,
        ['scripts/poc/validate-scenario.mjs', '--dir', scenarioDir, '--replay', '--report', reportPath],
        { cwd: path.resolve(__dirname, '..', '..'), encoding: 'utf8' },
      );
    } catch {
      // The synthetic fixture intentionally has no media files, so L4 may fail;
      // this test reads the written report and asserts the L3 replay layer.
    }
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    const l3 = report.layers.find((layer: { name: string }) => layer.name === 'L3');
    expect(l3?.status).toBe('pass');
    expect(report.checkpointProjection).toEqual({ status: 'pass', checked: 5, reason: null });
  });

  test('same-atMs events are ordered by sequence and the cursor is strictly sequential', () => {
    const pkg = buildPackage();
    const sameTime = pkg.events.data.events.filter((event, index, all) => all.some((other, otherIndex) => otherIndex !== index && other.atMs === event.atMs));
    expect(sameTime.length).toBeGreaterThan(0);
    const sequences = pkg.events.data.events.map((event) => event.sequence);
    expect(sequences).toEqual([...sequences].sort((left, right) => left - right));
    expect(new Set(sequences).size).toBe(sequences.length);
    const cursor = 0;
    const next = pkg.events.data.events.find((event) => event.sequence === cursor + 1);
    expect(next?.sequence).toBe(1);
  });
});
