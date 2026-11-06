import type { DomainResult, Event, ReplayProjection, ReplayState, ScenarioPackage } from '../domain/types';
import { reduceReplay } from '../domain/replay';

export interface ExpectedCheckpoint {
  cursorSequence: number;
  workflow: ReplayProjection['workflow'];
  visibleEntityIds: string[];
  activeScriptVersionId: string | null;
  activeVideoId: string | null;
  deliveryRecordIds: string[];
}

export interface CheckpointIssue {
  cursorSequence: number;
  path: string;
  message: string;
}

export interface CheckpointComparison {
  ok: boolean;
  issues: CheckpointIssue[];
  checked: number;
  hashes: Array<{ cursorSequence: number; hash: string }>;
}

export function projectCheckpoint(
  pkg: ScenarioPackage,
  events: readonly Event[],
  cursorSequence: number,
): DomainResult<ReplayProjection> {
  const reduced = reduceReplay(pkg, events, cursorSequence);
  return reduced.ok ? { ok: true, value: reduced.value.projection } : reduced;
}

/**
 * Stable projection serialisation used for checkpoint/hash comparison. It
 * contains no wall clock, speed, event envelope or raw agent text.
 */
export function canonicalProjection(projection: ReplayProjection): string {
  const canonical = {
    activeScriptVersionId: projection.activeScriptVersionId,
    activeVideoId: projection.activeVideoId,
    confirmedScriptVersionId: projection.confirmedScriptVersionId,
    deliveryRecordIds: [...projection.deliveryRecordIds].sort(),
    videoAvailability: sortedRecord(projection.videoAvailability),
    videoProgress: sortedRecord(projection.videoProgress),
    visibleEntityIds: [...projection.visibleEntityIds].sort(),
    workflow: {
      analysis: projection.workflow.analysis,
      delivery: projection.workflow.delivery,
      discovery: projection.workflow.discovery,
      video: projection.workflow.video,
    },
  };
  return JSON.stringify(canonical);
}

function sortedRecord(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, value[key]]));
}

export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function projectionHash(projection: ReplayProjection): Promise<string> {
  return sha256Hex(canonicalProjection(projection));
}

export function compareCheckpointProjections(
  pkg: ScenarioPackage,
  events: readonly Event[],
  checkpoints: readonly ExpectedCheckpoint[],
): CheckpointComparison {
  const issues: CheckpointIssue[] = [];
  const ordered = [...checkpoints].sort((left, right) => left.cursorSequence - right.cursorSequence);
  for (const checkpoint of ordered) {
    const reduced = reduceReplay(pkg, events, checkpoint.cursorSequence);
    if (!reduced.ok) {
      issues.push({ cursorSequence: checkpoint.cursorSequence, path: '/cursorSequence', message: reduced.error.message });
      continue;
    }
    const projection = reduced.value.projection;
    compareValue(issues, checkpoint.cursorSequence, '/workflow', checkpoint.workflow, projection.workflow);
    compareValue(issues, checkpoint.cursorSequence, '/visibleEntityIds', [...checkpoint.visibleEntityIds].sort(), [...projection.visibleEntityIds].sort());
    compareValue(issues, checkpoint.cursorSequence, '/activeScriptVersionId', checkpoint.activeScriptVersionId, projection.activeScriptVersionId);
    compareValue(issues, checkpoint.cursorSequence, '/activeVideoId', checkpoint.activeVideoId, projection.activeVideoId);
    compareValue(issues, checkpoint.cursorSequence, '/deliveryRecordIds', [...checkpoint.deliveryRecordIds].sort(), [...projection.deliveryRecordIds].sort());
  }
  return { ok: issues.length === 0, issues, checked: ordered.length, hashes: [] };
}

function compareValue(
  issues: CheckpointIssue[],
  cursorSequence: number,
  path: string,
  expected: unknown,
  actual: unknown,
): void {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    issues.push({
      cursorSequence,
      path,
      message: `Expected ${JSON.stringify(expected)}; reducer produced ${JSON.stringify(actual)}.`,
    });
  }
}

export interface ReplayClock {
  virtualMs: number;
  speed: 1 | 2 | 4;
  transport: 'idle' | 'playing' | 'paused' | 'ended';
}

export function createReplayClock(): ReplayClock {
  return { virtualMs: 0, speed: 1, transport: 'idle' };
}

/**
 * Map wall-clock elapsed time to replay virtual time. The caller owns the
 * wall clock; this function is deterministic and deliberately has no
 * Date.now/Math.random access.
 */
export function advanceClock(clock: ReplayClock, wallDeltaMs: number): ReplayClock {
  if (!Number.isFinite(wallDeltaMs) || wallDeltaMs < 0) throw new Error('wallDeltaMs must be finite and non-negative.');
  const nextVirtual = clock.virtualMs + wallDeltaMs * clock.speed;
  return { ...clock, virtualMs: Math.round(nextVirtual) };
}

export function sequenceAtVirtualMs(events: readonly Event[], virtualMs: number): number {
  let sequence = 0;
  for (const event of events) {
    if (event.atMs <= virtualMs) sequence = event.sequence;
  }
  return sequence;
}

export function nextEventAt(events: readonly Event[], cursorSequence: number): { sequence: number; atMs: number } | null {
  const next = events.find((event) => event.sequence === cursorSequence + 1);
  return next ? { sequence: next.sequence, atMs: next.atMs } : null;
}

export function isReplayAtEnd(events: readonly Event[], cursorSequence: number): boolean {
  return cursorSequence >= events.length;
}
