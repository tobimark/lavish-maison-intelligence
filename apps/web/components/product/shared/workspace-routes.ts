/**
 * WS-001 · Shared workspace routing/context helpers.
 *
 * The six top-level workspaces keep their original names and order. URLs stay
 * the single shareable source of the current case: campaignId, scenarioVersion
 * and (only where it matters) language. Nothing here reads or writes business
 * state; these are pure helpers.
 */

export const DEFAULT_CAMPAIGN_ID = 'scn-scent-layering.brief.main';
/** Published default from content-scenarios/version-index.json (A 1.1.0). */
export const DEFAULT_SCENARIO_VERSION = '1.1.0';

export type WorkspaceId = 'overview' | 'radar' | 'opportunities' | 'atelier' | 'library' | 'deliverables';
export type WorkspaceLanguage = 'en' | 'ar';

export interface WorkspaceContext {
  campaignId: string;
  scenarioVersion: string;
  language: WorkspaceLanguage | null;
  explicitCampaign: boolean;
  explicitVersion: boolean;
}

export const WORKSPACE_NAV_ITEMS: ReadonlyArray<{ id: WorkspaceId; label: string; path: string }> = [
  { id: 'overview', label: 'Overview', path: '/' },
  { id: 'radar', label: 'Intelligence Radar', path: '/radar' },
  { id: 'opportunities', label: 'Opportunities', path: '/opportunities' },
  { id: 'atelier', label: 'Creative Atelier', path: '/atelier' },
  { id: 'library', label: 'Creative Library', path: '/library' },
  { id: 'deliverables', label: 'Deliverables', path: '/deliverables' },
] as const;

const LANGUAGE_PATHS: ReadonlySet<string> = new Set(['/atelier', '/library', '/deliverables']);

export function normalizeLanguage(value: string | null | undefined): WorkspaceLanguage | null {
  return value === 'ar' || value === 'en' ? value : null;
}

export function contextFromSearchParams(params: URLSearchParams | { get(name: string): string | null }): WorkspaceContext {
  const campaignParam = (params.get('campaignId') ?? '').trim();
  const versionParam = (params.get('scenarioVersion') ?? '').trim();
  return {
    campaignId: campaignParam || DEFAULT_CAMPAIGN_ID,
    scenarioVersion: versionParam || DEFAULT_SCENARIO_VERSION,
    language: normalizeLanguage(params.get('language')),
    explicitCampaign: Boolean(campaignParam),
    explicitVersion: Boolean(versionParam),
  };
}

/** Params that are safe and meaningful to carry between workspaces. */
export function workspaceParams(
  context: Pick<WorkspaceContext, 'campaignId' | 'scenarioVersion' | 'language'>,
  options: { includeLanguage?: boolean; extra?: Record<string, string | null | undefined> } = {},
): string {
  const params = new URLSearchParams();
  if (context.campaignId) params.set('campaignId', context.campaignId);
  if (context.scenarioVersion) params.set('scenarioVersion', context.scenarioVersion);
  if (options.includeLanguage && context.language) params.set('language', context.language);
  for (const [key, value] of Object.entries(options.extra ?? {})) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function workspaceHref(
  path: string,
  context: Pick<WorkspaceContext, 'campaignId' | 'scenarioVersion' | 'language'>,
  options: { includeLanguage?: boolean; extra?: Record<string, string | null | undefined> } = {},
): string {
  const includeLanguage = options.includeLanguage ?? LANGUAGE_PATHS.has(path);
  return `${path}${workspaceParams(context, { ...options, includeLanguage })}`;
}

/** The four old Journey stages now map to real top-level workspaces. */
export type LegacyJourneyStage = 'insight' | 'strategy' | 'creative' | 'social';

export const LEGACY_JOURNEY_TARGET: Record<LegacyJourneyStage, { workspace: WorkspaceId; path: string }> = {
  insight: { workspace: 'radar', path: '/radar' },
  strategy: { workspace: 'opportunities', path: '/opportunities' },
  creative: { workspace: 'atelier', path: '/atelier' },
  social: { workspace: 'deliverables', path: '/deliverables' },
};

export function isLegacyJourneyStage(value: string | null | undefined): value is LegacyJourneyStage {
  return value === 'insight' || value === 'strategy' || value === 'creative' || value === 'social';
}

export function legacyJourneyHref(
  stage: string | null | undefined,
  campaignId: string,
  scenarioVersion: string,
  language: WorkspaceLanguage | null,
): string {
  const target = isLegacyJourneyStage(stage) ? LEGACY_JOURNEY_TARGET[stage] : LEGACY_JOURNEY_TARGET.insight;
  return workspaceHref(target.path, { campaignId, scenarioVersion, language }, { includeLanguage: target.path !== '/radar' && target.path !== '/opportunities' });
}

/**
 * Sidebar ownership by pathname. Query strings must never decide active state,
 * so both a brief and a social detail page resolve to their owning workspace.
 */
export function workspaceForPath(pathname: string): WorkspaceId | null {
  const path = pathname.split('?')[0] || '/';
  if (path === '/') return 'overview';
  if (path === '/radar' || path.startsWith('/radar/')) return 'radar';
  if (path === '/opportunities' || path.startsWith('/opportunities/')) return 'opportunities';
  if (path === '/atelier' || path.startsWith('/atelier/')) return 'atelier';
  if (path === '/library' || path.startsWith('/library/')) return 'library';
  if (path === '/deliverables' || path.startsWith('/deliverables/')) return 'deliverables';
  if (/^\/campaigns\/[^/]+\/brief(?:\/|$)/.test(path)) return 'opportunities';
  if (/^\/campaigns\/[^/]+\/social(?:\/|$)/.test(path)) return 'deliverables';
  return null;
}

export function navActiveForPath(itemId: WorkspaceId, pathname: string): boolean {
  return workspaceForPath(pathname) === itemId;
}

/** Workbench headline/copy shared by the workspace headers. */
export function workspaceLabel(workspace: WorkspaceId): string {
  return WORKSPACE_NAV_ITEMS.find((item) => item.id === workspace)?.label ?? 'Workspace';
}
