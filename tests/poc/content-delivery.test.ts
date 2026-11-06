import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createMockApi } from '../../apps/web/demo/poc/api';
import type { ApiResult, CommandContext, LoadedScenario, MockApi, ScenarioListItem, ScenarioSource, SessionView } from '../../apps/web/demo/poc/api';
import { adaptContentOnlyPackage, type ContentPackageInput } from '../../apps/web/demo/poc/domain';
import { MemoryStorage } from '../../apps/web/demo/poc/storage';

const NOW = '2026-11-05T00:00:00.000Z';
const ROOT = path.resolve(process.cwd(), 'apps', 'web', 'public');
const SLUG = 'scent-layering';

function loadPublished(): LoadedScenario {
  const base = path.join(ROOT, 'content-scenarios', SLUG, '1.0.0');
  const names = ['manifest', 'brand', 'discovery', 'analysis', 'script', 'video', 'delivery', 'events', 'assets', 'expected'] as const;
  const files = Object.fromEntries(names.map((name) => [name, JSON.parse(readFileSync(path.join(base, `${name}.json`), 'utf8'))])) as unknown as ContentPackageInput;
  const media: Record<string, Uint8Array> = {};
  for (const asset of files.assets.data.assets) {
    if (typeof asset.bytes !== 'number') continue;
    media[asset.id] = new Uint8Array(readFileSync(path.join(ROOT, asset.uri.replace(/^\//, ''))));
  }
  return {
    scenarioId: files.manifest.scenarioId,
    scenarioVersion: files.manifest.scenarioVersion,
    packageHash: 'PUBLISHED_HASH_READ_FROM_CATALOG',
    package: adaptContentOnlyPackage(files),
    media,
    profile: 'content_only',
    contentPackage: files,
  };
}

function makeSource(): ScenarioSource {
  const catalog = JSON.parse(readFileSync(path.join(ROOT, 'content-scenarios', 'catalog.json'), 'utf8'));
  const items: ScenarioListItem[] = catalog.items.map((item: any) => ({
    scenarioId: item.scenarioId,
    title: item.title,
    scenarioVersion: item.scenarioVersion,
    readiness: item.readiness,
    profile: item.profile,
    mediaStatus: item.mediaStatus,
    issues: [],
  }));
  return {
    async list() {
      return items;
    },
    async get(scenarioId, scenarioVersion) {
      if (scenarioId !== 'scn-scent-layering') return null;
      const loaded = loadPublished();
      const item = catalog.items.find((candidate: any) => candidate.scenarioId === scenarioId);
      return { ...loaded, packageHash: item.packageHash };
    },
  };
}

function createApi() {
  return createMockApi({ scenarioSource: makeSource(), storage: new MemoryStorage(), now: () => NOW, virtualNow: () => 0 });
}
function unwrap<T>(result: ApiResult<T>): T {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message} ${JSON.stringify(result.error.fieldErrors)}`);
  return result.data;
}
function ctx(state: { id: string; revision: number }, key: string): CommandContext {
  return { sessionId: state.id, expectedRevision: state.revision, idempotencyKey: key };
}
function editContent(loaded: LoadedScenario, suffix: string) {
  const version = loaded.package.script.data.versions.find((candidate) => candidate.language === 'en')!;
  return {
    title: `${version.title} ${suffix}`,
    hook: version.hook,
    message: version.message,
    cta: version.cta,
    shots: version.shots.map((shot) => ({ ...shot, assetIds: [...shot.assetIds] })),
    subtitles: version.subtitles.map((subtitle) => ({ ...subtitle })),
    caption: version.caption,
    hashtags: [...version.hashtags],
  };
}
async function toConfirmed(api: MockApi, loaded: LoadedScenario): Promise<SessionView> {
  let session = unwrap(await api.createSession({ scenarioId: loaded.scenarioId, scenarioVersion: loaded.scenarioVersion, creationKey: 'delivery-session' }));
  session = unwrap(await api.executeStage(ctx(session, 'discovery'), { stage: 'discovery' }));
  session = unwrap(await api.executeStage(ctx(session, 'analysis'), { stage: 'analysis' }));
  session = unwrap(await api.confirmScript(ctx(session, 'confirm-preset'), { scriptVersionId: session.activeScriptVersionId! }));
  return session;
}
async function saveDraft(api: MockApi, session: SessionView, subject = '[SIMULATED · CONTENT ONLY] Delivery test', key = 'save-draft') {
  const delivery = unwrap(await api.getContentDelivery(session.id));
  const saved = unwrap(
    await api.saveContentDeliveryDraft(ctx(session, key), {
      sourcePlanId: delivery.sourcePlan!.id,
      scriptVersionId: session.activeScriptVersionId!,
      recipientSnapshot: delivery.sourcePlan!.recipients,
      subject,
      body: 'Simulated content-only email. No email is sent and no video is attached.',
    }),
  );
  return saved;
}
function zipText(blob: Uint8Array): string {
  return new TextDecoder().decode(blob);
}

describe('NV-003 content-only delivery', () => {
  test('requires explicit confirmation, records a failure then a retry, and keeps immutable attempt snapshots', async () => {
    const loaded = loadPublished();
    const api = createApi();
    let session = await toConfirmed(api, loaded);
    const draft = await saveDraft(api, session, '[SIMULATED · CONTENT ONLY] Attempt snapshot');
    session = draft.session;

    const refused = await api.simulateContentDelivery(ctx(session, 'no-confirmation'), {
      draftRevision: draft.draft.revision,
      confirmed: false,
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(['CONFIRMATION_REQUIRED', 'INVALID_INPUT']).toContain(refused.error.code);
    expect(unwrap(await api.getContentDelivery(session.id)).delivery.attempts).toHaveLength(0);

    const failed = unwrap(
      await api.simulateContentDelivery(ctx(session, 'attempt-fail'), {
        draftRevision: draft.draft.revision,
        confirmed: true,
        failureCase: 'delivery_failed',
      }),
    );
    expect(failed.attempt.outcome).toBe('failed');
    expect(failed.attempt.attempt).toBe(1);
    session = failed.session;

    const retried = unwrap(
      await api.simulateContentDelivery(ctx(session, 'attempt-retry'), {
        draftRevision: draft.draft.revision,
        confirmed: true,
      }),
    );
    expect(retried.attempt.outcome).toBe('simulated_delivered');
    expect(retried.attempt.attempt).toBe(2);
    session = retried.session;
    expect(unwrap(await api.getContentDelivery(session.id)).delivery.attempts).toHaveLength(2);

    const duplicate = unwrap(
      await api.simulateContentDelivery(ctx(session, 'attempt-retry'), {
        draftRevision: draft.draft.revision,
        confirmed: true,
      }),
    );
    expect(duplicate.attempt.id).toBe(retried.attempt.id);
    expect(unwrap(await api.getContentDelivery(session.id)).delivery.attempts).toHaveLength(2);

    const secondDraft = await saveDraft(api, session, '[SIMULATED · CONTENT ONLY] Newer subject', 'save-newer');
    expect(secondDraft.draft.subject).toContain('Newer subject');
    const exportedOld = unwrap(await api.exportContentPack(ctx(secondDraft.session, 'export-old'), { attemptId: retried.attempt.id }));
    expect(zipText(exportedOld.blob)).toContain('Attempt snapshot');
    expect(zipText(exportedOld.blob)).not.toContain('Newer subject');
    expect(zipText(exportedOld.blob)).toContain('SIMULATED-DELIVERY.json');
    expect(zipText(exportedOld.blob)).not.toContain('.mp4');
  });

  test('failed attempt exports a real failure pack without fabricating video delivery', async () => {
    const loaded = loadPublished();
    const api = createApi();
    let session = await toConfirmed(api, loaded);
    const draft = await saveDraft(api, session, '[SIMULATED · CONTENT ONLY] Failure pack');
    const failed = unwrap(
      await api.simulateContentDelivery(ctx(draft.session, 'failure'), {
        draftRevision: draft.draft.revision,
        confirmed: true,
        failureCase: 'delivery_failed',
      }),
    );
    session = failed.session;
    const exported = unwrap(await api.exportContentPack(ctx(session, 'export-failure'), { attemptId: failed.attempt.id }));
    const text = zipText(exported.blob);
    expect(exported.filename).toMatch(/content-pack-\d+\.zip$/);
    expect(exported.blob[0]).toBe(0x50);
    expect(exported.blob[1]).toBe(0x4b);
    expect(text).toContain('SIMULATED-DELIVERY.json');
    expect(text).toContain('README.txt');
    expect(text).toContain('delivery_failed');
    expect(text).toContain('Failure pack');
    expect(text).not.toContain('.mp4');
    expect(text).not.toContain('.poster');
    expect(session.workflow.video).toBe('stale');
    expect(session.activeVideoId).toBeNull();
  });

  test('script revision invalidates the pending draft while preserving attempt history', async () => {
    const loaded = loadPublished();
    const api = createApi();
    let session = await toConfirmed(api, loaded);
    const draft = await saveDraft(api, session, '[SIMULATED · CONTENT ONLY] Draft to invalidate');
    const delivered = unwrap(
      await api.simulateContentDelivery(ctx(draft.session, 'deliver'), {
        draftRevision: draft.draft.revision,
        confirmed: true,
      }),
    );
    session = delivered.session;
    expect(session.contentDelivery?.attempts).toHaveLength(1);
    const revised = unwrap(
      await api.saveScriptDraft(ctx(session, 'revise-script'), {
        baseVersionId: session.activeScriptVersionId!,
        content: editContent(loaded, 'revised'),
      }),
    );
    expect(revised.session.contentDelivery?.draft).toBeNull();
    expect(revised.session.contentDelivery?.status).toBe('draft');
    expect(revised.session.contentDelivery?.attempts).toHaveLength(1);
    const delivery = unwrap(await api.getContentDelivery(revised.session.id));
    expect(delivery.delivery.draft).toBeNull();
    expect(delivery.delivery.attempts).toHaveLength(1);
    expect(delivery.delivery.attempts[0].subject).toContain('Draft to invalidate');
  });

  test('reset clears content delivery and returns the session to a fresh content workflow without fake video', async () => {
    const loaded = loadPublished();
    const api = createApi();
    let session = await toConfirmed(api, loaded);
    const draft = await saveDraft(api, session);
    const delivered = unwrap(
      await api.simulateContentDelivery(ctx(draft.session, 'deliver'), {
        draftRevision: draft.draft.revision,
        confirmed: true,
      }),
    );
    session = delivered.session;
    const reset = unwrap(await api.resetSession(ctx(session, 'reset'), { confirmation: 'RESET_THIS_SESSION' }));
    expect(reset.contentDelivery?.draft).toBeNull();
    expect(reset.contentDelivery?.attempts).toEqual([]);
    expect(reset.contentDelivery?.status).toBe('draft');
    expect(reset.workflow.discovery).toBe('ready');
    expect(reset.workflow.video).toBe('locked');
    expect(reset.activeVideoId).toBeNull();
    expect(reset.profile).toBe('content_only');
    const after = unwrap(await api.getContentDelivery(reset.id));
    expect(after.delivery.attempts).toEqual([]);
  });
});
