'use client';

import { useEffect, useState } from 'react';

import { ContentOnlyFrame } from './ContentOnlyFrame';
import { WorkflowFrame } from './WorkflowFrame';
import { getBrowserApi } from './browser-api';
import { StateBlock } from './index';
import type { SessionView } from '../../demo/poc/api/types';

type Props = {
  sessionId: string;
  initialStep: 'discovery' | 'analysis' | 'video' | 'delivery';
  initialView: 'workflow' | 'replay';
};

export function SessionFrameRouter({ sessionId, initialStep, initialView }: Props) {
  const [session, setSession] = useState<SessionView | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getBrowserApi().getSession({ sessionId }).then((result) => {
      if (cancelled) return;
      if (!result.ok) setError(`${result.error.code}: ${result.error.message}`);
      else setSession(result.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) return <StateBlock kind="loading" title="Loading demo session" body="Reading local session storage and approved content profile." />;
  if (error) return <StateBlock kind="error" title="Demo session unavailable" body={error} />;
  if (!session) return <StateBlock kind="error" title="Demo session unavailable" body="The session could not be loaded." />;
  if (session.profile === 'content_only') {
    return <ContentOnlyFrame initialSession={session} initialStep={initialStep} initialView={initialView} />;
  }
  return <WorkflowFrame sessionId={sessionId} preview={false} initialStep={initialStep} initialView={initialView} />;
}
