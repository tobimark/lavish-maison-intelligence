'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { Button, StateBlock } from '../../poc';
import { getBrowserApi } from '../../poc/browser-api';
import {
  isLegacyJourneyStage,
  legacyJourneyHref,
  normalizeLanguage,
} from '../shared/workspace-routes';
import styles from '../workspace.module.css';

type RedirectState = 'loading' | 'error';

/**
 * WS-001 · Legacy Journey compatibility route.
 *
 * The old four-stage Journey is no longer a second product surface. This route
 * validates the exact campaign/version, then replaces itself with the owning
 * workspace (Radar / Opportunities / Atelier / Deliverables). Invalid context
 * stays visible and recoverable; it is never swallowed by a fallback redirect.
 */
export function JourneyPage() {
  const params = useParams<{ campaignId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const campaignId = decodeURIComponent(Array.isArray(params?.campaignId) ? params.campaignId[0] : params?.campaignId ?? '');
  const scenarioVersion = (searchParams.get('scenarioVersion') ?? '').trim();
  const stage = searchParams.get('stage');
  const language = normalizeLanguage(searchParams.get('language'));

  const [state, setState] = useState<RedirectState>('loading');
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');

  const target = useMemo(() => {
    if (!campaignId || !scenarioVersion) return null;
    if (stage !== null && stage !== '' && !isLegacyJourneyStage(stage)) return null;
    return legacyJourneyHref(stage || 'insight', campaignId, scenarioVersion, language);
  }, [campaignId, language, scenarioVersion, stage]);

  useEffect(() => {
    let cancelled = false;
    const invalidStage = stage !== null && stage !== '' && !isLegacyJourneyStage(stage);
    if (!campaignId || !scenarioVersion || invalidStage || !target) {
      setErrorCode(invalidStage ? 'INVALID_STAGE' : 'INVALID_INPUT');
      setError(
        invalidStage
          ? `“${stage}” is not one of the four legacy journey stages. Nothing was redirected.`
          : 'This legacy journey needs an exact campaignId and scenarioVersion. Nothing was switched to another case.',
      );
      setState('error');
      return;
    }

    setState('loading');
    setError('');
    setErrorCode('');
    (async () => {
      try {
        const result = await getBrowserApi().getCampaignJourney({ campaignId, scenarioVersion });
        if (cancelled) return;
        if (!result.ok) {
          setErrorCode(result.error.code);
          setError(`${result.error.code}: ${result.error.message}`);
          setState('error');
          return;
        }
        router.replace(target);
      } catch (cause) {
        if (cancelled) return;
        setErrorCode('STORAGE_UNAVAILABLE');
        setError(cause instanceof Error ? cause.message : String(cause));
        setState('error');
      }
    })();

    return () => { cancelled = true; };
  }, [campaignId, router, scenarioVersion, stage, target]);

  if (state === 'error') {
    return (
      <div className={styles.page} data-testid="journey-error">
        <StateBlock
          kind="error"
          title={errorCode === 'INVALID_STAGE' ? 'Journey stage not found' : 'Journey link unavailable'}
          body={error}
          action={
            <div className={styles.stageActions}>
              <Link href="/" className={styles.link}>Back to Overview</Link>
              <Link href={campaignId ? `/radar?campaignId=${encodeURIComponent(campaignId)}${scenarioVersion ? `&scenarioVersion=${encodeURIComponent(scenarioVersion)}` : ''}` : '/radar'} className={styles.link}>
                Open Intelligence Radar
              </Link>
              <Button variant="secondary" onClick={() => router.refresh()}>Try again</Button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.page} data-testid="journey-redirecting" aria-busy="true">
      <StateBlock
        kind="loading"
        title="Opening the right workspace"
        body="This older journey link is being mapped to the matching workspace for the same campaign and version."
      />
    </div>
  );
}
