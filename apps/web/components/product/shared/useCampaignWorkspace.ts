'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import {
  contextFromSearchParams,
  workspaceHref,
  workspaceParams,
  type WorkspaceContext,
  type WorkspaceId,
  type WorkspaceLanguage,
} from './workspace-routes';

export interface CampaignWorkspace extends WorkspaceContext {
  language: WorkspaceLanguage | null;
  includeLanguage: boolean;
  /** Query string including campaign/version and, when relevant, language. */
  query: string;
  /** Link to a workspace while preserving the current case context. */
  hrefFor(path: string, options?: { includeLanguage?: boolean; extra?: Record<string, string | null | undefined> }): string;
  /** Link to a workspace id from the six-item navigation. */
  navHref(id: WorkspaceId): string;
}

/**
 * WS-001 · Read-only current-case context.
 *
 * The URL is authoritative. No business data is copied into a provider/store;
 * this hook only derives consistent links and parameters from the query.
 */
export function useCampaignWorkspace(): CampaignWorkspace {
  const searchParams = useSearchParams();
  const context = useMemo(() => contextFromSearchParams(searchParams), [searchParams]);
  const includeLanguage = context.language !== null;

  return useMemo(() => {
    const hrefFor: CampaignWorkspace['hrefFor'] = (path, options = {}) => workspaceHref(path, context, options);
    const navHref: CampaignWorkspace['navHref'] = (id) => {
      const path = id === 'overview' ? '/' : `/${id === 'radar' ? 'radar' : id === 'opportunities' ? 'opportunities' : id === 'atelier' ? 'atelier' : id === 'library' ? 'library' : 'deliverables'}`;
      const include = path === '/atelier' || path === '/library' || path === '/deliverables';
      return workspaceHref(path, context, { includeLanguage: include && includeLanguage });
    };
    return {
      ...context,
      includeLanguage,
      query: workspaceParams(context, { includeLanguage }),
      hrefFor,
      navHref,
    };
  }, [context, includeLanguage]);
}
