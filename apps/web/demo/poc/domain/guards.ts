import type {
  Event,
  ScenarioPackage,
  ScriptEditable,
  StageName,
} from './types';
import type { EntityIndex } from '../validation/semantic-rules.mjs';

export function packageStageEvents(pkg: ScenarioPackage, stage: StageName): Event[] {
  return pkg.events.data.events.filter((event) => event.stage === stage);
}

/** Shared workflow/replay stage-order guard (user/version-specific checks stay at the entry point). */
export function stageStartIssue(
  pkg: ScenarioPackage,
  workflow: Readonly<Record<StageName, string>>,
  stage: StageName,
  mode: 'workflow' | 'replay',
): string | null {
  if (workflow[stage] !== 'ready') return `Stage ${stage} cannot start from ${workflow[stage]}.`;
  if (stage === 'discovery') return null;
  if (stage === 'analysis') {
    return workflow.discovery === 'completed' ? null : 'Analysis requires discovery completed.';
  }
  if (stage === 'video') {
    return workflow.analysis === 'completed' ? null : 'Video requires analysis completed and script confirmed.';
  }
  return mode === 'replay' ? null : 'Delivery user attempts are started by simulateDelivery, not executeStage.';
}

export function packageStageRange(pkg: ScenarioPackage, stage: StageName): { start: number; end: number } {
  const stageEvents = packageStageEvents(pkg, stage);
  if (!stageEvents.length) return { start: 0, end: 0 };
  return {
    start: stageEvents[0].sequence,
    end: stageEvents[stageEvents.length - 1].sequence,
  };
}

/** Reject any event that is not byte-for-byte the package's canonical event at that sequence. */
export function canonicalEventIssue(pkg: ScenarioPackage, event: Event): string | null {
  const canonical = pkg.events.data.events.find((candidate) => candidate.sequence === event.sequence);
  if (!canonical) return `No canonical package event exists at sequence ${event.sequence}.`;
  if (JSON.stringify(canonical) !== JSON.stringify(event)) {
    return `Event at sequence ${event.sequence} differs from the package's canonical event (order/payload/id/atMs tampering).`;
  }
  return null;
}

export function discoveryOutputsComplete(pkg: ScenarioPackage, visibleEntityIds: readonly string[]): string[] {
  const visible = new Set(visibleEntityIds);
  return [
    ...pkg.discovery.data.signals.map((signal) => signal.id).filter((id) => !visible.has(id)),
    ...pkg.discovery.data.trends.map((trend) => trend.id).filter((id) => !visible.has(id)),
  ];
}

/**
 * queued and available are distinct flags. Completion requires available plus
 * 100% progressed media and exposure; a queued/progress event alone is not
 * enough and old attempt availability must be reset by a new video attempt.
 */
export function videoOutputComplete(
  pkg: ScenarioPackage,
  videoId: string | null,
  availability: Readonly<Record<string, 'queued' | 'available'>>,
  progress: Readonly<Record<string, number>>,
  visibleEntityIds: readonly string[],
): string | null {
  if (!videoId) return 'No active video is bound to this attempt.';
  if (!pkg.video.data.videos.some((video) => video.id === videoId)) return `Unknown video ${videoId}.`;
  if (availability[videoId] !== 'available') return `Video ${videoId} has not reached video.available (queued alone is insufficient).`;
  if (progress[videoId] !== 100) return `Video ${videoId} progress is ${progress[videoId] ?? 0}, expected 100.`;
  if (!visibleEntityIds.includes(videoId)) return `Video ${videoId} has not been exposed by an event.`;
  return null;
}

export function videoBoundToScript(pkg: ScenarioPackage, videoId: string, scriptVersionId: string): boolean {
  const video = pkg.video.data.videos.find((item) => item.id === videoId);
  return Boolean(video && video.scriptVersionId === scriptVersionId);
}

/**
 * v1 editing keeps the existing shot/subtitle anchors: count, IDs and order must
 * stay identical to the source script version. Text/timing/content fields may be
 * edited only after the anchor check and semantic validation.
 */
export function scriptAnchorIssues(
  source: ScriptEditable,
  edited: ScriptEditable,
): Array<{ path: string; message: string }> {
  const issues: Array<{ path: string; message: string }> = [];
  if (source.shots.length !== edited.shots.length) {
    issues.push({ path: '/content/shots', message: `Shot count must stay ${source.shots.length}, found ${edited.shots.length}.` });
  }
  const shotCount = Math.min(source.shots.length, edited.shots.length);
  for (let index = 0; index < shotCount; index += 1) {
    if (source.shots[index].id !== edited.shots[index].id) {
      issues.push({
        path: `/content/shots/${index}/id`,
        message: `Shot anchor must stay ${source.shots[index].id}, found ${edited.shots[index].id}.`,
      });
    }
  }
  if (source.subtitles.length !== edited.subtitles.length) {
    issues.push({
      path: '/content/subtitles',
      message: `Subtitle count must stay ${source.subtitles.length}, found ${edited.subtitles.length}.`,
    });
  }
  const subtitleCount = Math.min(source.subtitles.length, edited.subtitles.length);
  for (let index = 0; index < subtitleCount; index += 1) {
    if (source.subtitles[index].id !== edited.subtitles[index].id) {
      issues.push({
        path: `/content/subtitles/${index}/id`,
        message: `Subtitle anchor must stay ${source.subtitles[index].id}, found ${edited.subtitles[index].id}.`,
      });
    }
  }
  return issues;
}

/** Every shot.assetIds value must resolve to an entity whose kind is exactly `asset`. */
export function assetReferenceIssues(
  index: EntityIndex,
  shots: ScriptEditable['shots'],
): Array<{ path: string; message: string }> {
  const issues: Array<{ path: string; message: string }> = [];
  for (const [shotIndex, shot] of shots.entries()) {
    for (const [assetIndex, assetId] of (shot.assetIds ?? []).entries()) {
      const record = index.byId.get(assetId);
      if (!record) {
        issues.push({ path: `/content/shots/${shotIndex}/assetIds/${assetIndex}`, message: `Unknown shot asset ${assetId}.` });
      } else if (record.kind !== 'asset') {
        issues.push({
          path: `/content/shots/${shotIndex}/assetIds/${assetIndex}`,
          message: `${assetId} resolves to ${record.kind}, expected asset.`,
        });
      }
    }
  }
  return issues;
}
