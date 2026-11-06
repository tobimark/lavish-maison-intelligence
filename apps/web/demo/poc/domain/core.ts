import { collectEntityIndex, validateScriptTimelineAndVideos } from '../validation/semantic-rules.mjs';
import { assetReferenceIssues, scriptAnchorIssues } from './guards';
import type {
  DeliveryPlan,
  DeliveryRecord,
  DomainError,
  DomainFailure,
  DomainResult,
  DomainSuccess,
  ReplayProjection,
  ScriptEditable,
  ScriptVersion,
  StageName,
  StageStatus,
  UserScriptVersion,
  VideoEntry,
  ActionRecord,
  WorkflowState,
} from './types';

export const STAGES: readonly StageName[] = ['discovery', 'analysis', 'video', 'delivery'];

export function initialWorkflow(): WorkflowState {
  return {
    discovery: 'ready',
    analysis: 'locked',
    video: 'locked',
    delivery: 'locked',
  };
}

export function initialReplayProjection(): ReplayProjection {
  return {
    workflow: initialWorkflow(),
    visibleEntityIds: [],
    activeScriptVersionId: null,
    activeVideoId: null,
    deliveryRecordIds: [],
    confirmedScriptVersionId: null,
    videoAvailability: {},
    videoProgress: {},
  };
}

export function ok<T>(value: T, warnings: string[] = []): DomainSuccess<T> {
  return warnings.length ? { ok: true, value, warnings } : { ok: true, value };
}

export function fail(
  code: DomainError['code'],
  message: string,
  fieldErrors?: Array<{ path: string; message: string }>,
): DomainFailure {
  return { ok: false, error: fieldErrors ? { code, message, fieldErrors } : { code, message } };
}

export function appendHistory(
  state: { history: ActionRecord[]; sessionId: string },
  action: string,
  entityIds: string[],
  occurredAt: string,
  outcome: ActionRecord['outcome'],
): ActionRecord[] {
  const sequence = state.history.length + 1;
  return [
    ...state.history,
    {
      id: `usr.${state.sessionId}.action.${sequence}`,
      sequence,
      action,
      entityIds: [...entityIds],
      occurredAt,
      outcome,
      mode: 'mock',
    },
  ];
}

export function sortUnique(ids: readonly string[]): string[] {
  return [...new Set(ids)].sort((left, right) => left.localeCompare(right));
}

export function workflowStageStatus(state: { workflow: WorkflowState }, stage: StageName): StageStatus {
  return state.workflow[stage];
}

export function anyStageRunning(workflow: WorkflowState): boolean {
  return STAGES.some((stage) => workflow[stage] === 'running');
}

export function findPackageScript(pkg: { script: { data: { versions: ScriptVersion[] } } }, id: string): ScriptVersion | null {
  return pkg.script.data.versions.find((version) => version.id === id) ?? null;
}

export function findUserVersion(state: { userVersions: UserScriptVersion[] }, id: string): UserScriptVersion | null {
  return state.userVersions.find((version) => version.id === id) ?? null;
}

export function findScript(
  state: { userVersions: UserScriptVersion[] },
  pkg: { script: { data: { versions: ScriptVersion[] } } },
  id: string,
): { kind: 'package' | 'user'; version: ScriptVersion | UserScriptVersion } | null {
  const packageVersion = findPackageScript(pkg, id);
  if (packageVersion) return { kind: 'package', version: packageVersion };
  const userVersion = findUserVersion(state, id);
  if (userVersion) return { kind: 'user', version: userVersion };
  return null;
}

export function scriptEditable(version: ScriptVersion | UserScriptVersion): ScriptEditable {
  if ('content' in version) return version.content;
  return {
    title: version.title,
    hook: version.hook,
    message: version.message,
    cta: version.cta,
    shots: version.shots,
    subtitles: version.subtitles,
    caption: version.caption,
    hashtags: version.hashtags,
  };
}

export function findVideo(pkg: { video: { data: { videos: VideoEntry[] } } }, id: string): VideoEntry | null {
  return pkg.video.data.videos.find((video) => video.id === id) ?? null;
}

export function findVideoForScript(
  pkg: { video: { data: { videos: VideoEntry[] } } },
  scriptVersionId: string,
): VideoEntry | null {
  return pkg.video.data.videos.find((video) => video.scriptVersionId === scriptVersionId) ?? null;
}

export function findPlan(pkg: { delivery: { data: { plans: DeliveryPlan[] } } }, id: string): DeliveryPlan | null {
  return pkg.delivery.data.plans.find((plan) => plan.id === id) ?? null;
}

export function findRecord(
  pkg: { delivery: { data: { records: DeliveryRecord[] } } },
  id: string,
): DeliveryRecord | null {
  return pkg.delivery.data.records.find((record) => record.id === id) ?? null;
}

export function entityExists(pkg: unknown, id: string): boolean {
  return collectEntityIndex(pkg).byId.has(id);
}

/**
 * Reuses POC-001 semantic validation for editable script content. The synthetic
 * bundle only contains the candidate version; the package entity index is used
 * for references so this module never defines a second entity structure.
 */
export function validateEditableScript(
  pkg: unknown,
  index: ReturnType<typeof collectEntityIndex>,
  content: ScriptEditable,
  identity: { id: string; briefId: string; language: 'en' | 'ar'; version: number },
  source?: ScriptEditable,
): DomainResult<ScriptEditable> {
  const fieldErrors: Array<{ path: string; message: string }> = [];
  if (!content || typeof content !== 'object') {
    return fail('INVALID_INPUT', 'Script content is required.', [{ path: '/content', message: 'content is required' }]);
  }
  if (typeof content.title !== 'string' || !content.title.trim()) fieldErrors.push({ path: '/content/title', message: 'title is required' });
  if (typeof content.hook !== 'string' || !content.hook.trim()) fieldErrors.push({ path: '/content/hook', message: 'hook is required' });
  if (typeof content.message !== 'string' || !content.message.trim()) fieldErrors.push({ path: '/content/message', message: 'message is required' });
  if (typeof content.cta !== 'string' || !content.cta.trim()) fieldErrors.push({ path: '/content/cta', message: 'cta is required' });
  if (typeof content.caption !== 'string' || !content.caption.trim()) fieldErrors.push({ path: '/content/caption', message: 'caption is required' });
  if (!Array.isArray(content.hashtags) || content.hashtags.length === 0) {
    fieldErrors.push({ path: '/content/hashtags', message: 'at least one hashtag is required' });
  }

  const candidate: ScriptVersion = {
    id: identity.id,
    briefId: identity.briefId,
    version: identity.version,
    language: identity.language,
    title: content.title,
    hook: content.hook,
    message: content.message,
    cta: content.cta,
    durationMs: 15000,
    shots: (content.shots ?? []) as ScriptVersion['shots'],
    subtitles: (content.subtitles ?? []) as ScriptVersion['subtitles'],
    caption: content.caption,
    hashtags: (content.hashtags ?? []) as ScriptVersion['hashtags'],
  };
  const issues = validateScriptTimelineAndVideos(
    { script: { data: { versions: [candidate] } }, video: { data: { videos: [] } } },
    index,
  );
  for (const issue of issues) {
    fieldErrors.push({ path: issue.jsonPointer, message: `${issue.code}: ${issue.message}` });
  }

  if (source) fieldErrors.push(...scriptAnchorIssues(source, content));
  fieldErrors.push(...assetReferenceIssues(index, content.shots ?? []));
  for (const [subtitleIndex, subtitle] of (content.subtitles ?? []).entries()) {
    if (typeof subtitle.text !== 'string' || !subtitle.text.trim()) {
      fieldErrors.push({ path: `/content/subtitles/${subtitleIndex}/text`, message: 'Subtitle text is required.' });
    }
  }

  if (fieldErrors.length) {
    return fail('INVALID_INPUT', 'The edited script version is not valid.', fieldErrors);
  }
  return ok(content);
}

export function cloneContent(content: ScriptEditable): ScriptEditable {
  return {
    title: content.title,
    hook: content.hook,
    message: content.message,
    cta: content.cta,
    shots: content.shots.map((shot) => ({ ...shot, assetIds: [...shot.assetIds] })),
    subtitles: content.subtitles.map((subtitle) => ({ ...subtitle })),
    caption: content.caption,
    hashtags: [...content.hashtags],
  };
}

export function expandScriptVisible(
  script: { id: string; shots?: Array<{ id: string }>; subtitles?: Array<{ id: string }> },
): string[] {
  return [
    script.id,
    ...(script.shots ?? []).map((shot) => shot.id),
    ...(script.subtitles ?? []).map((subtitle) => subtitle.id),
  ];
}

export function domainResultValue<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.value;
}
