import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createMockApi } from '../../apps/web/demo/poc/api';
import type { ApiResult, CommandContext, LoadedScenario, MockApi, ScenarioListItem, ScenarioSource, SessionView } from '../../apps/web/demo/poc/api';
import { isContentPackageInput } from '../../apps/web/demo/poc/api/scenario-source';
import { adaptContentOnlyPackage, type ContentPackageInput } from '../../apps/web/demo/poc/domain';
import { MemoryStorage } from '../../apps/web/demo/poc/storage';

const NOW = '2026-11-05T00:00:00.000Z';
const SLUGS = [
  { scenarioId: 'scn-scent-layering', slug: 'scent-layering' },
  { scenarioId: 'scn-luxury-gifting', slug: 'luxury-gifting' },
  { scenarioId: 'scn-oud-storytelling', slug: 'oud-storytelling' },
] as const;
const ROOT = path.resolve(process.cwd(), 'apps', 'web', 'public');

function rawPublished(slug: string): Record<string, unknown> {
  const base = path.join(ROOT, 'content-scenarios', slug, '1.0.0');
  const names = ['manifest', 'brand', 'discovery', 'analysis', 'script', 'video', 'delivery', 'events', 'assets', 'expected'] as const;
  return Object.fromEntries(names.map((name) => [name, JSON.parse(readFileSync(path.join(base, `${name}.json`), 'utf8'))])) as Record<string, unknown>;
}

function loadPublished(slug: string): LoadedScenario {
  const files = rawPublished(slug) as unknown as ContentPackageInput;
  const media: Record<string, Uint8Array> = {};
  for (const asset of files.assets.data.assets) {
    if (typeof asset.bytes !== 'number') continue;
    media[asset.id] = new Uint8Array(readFileSync(path.join(ROOT, asset.uri.replace(/^\//, ''))));
  }
  return {
    scenarioId: files.manifest.scenarioId,
    scenarioVersion: files.manifest.scenarioVersion,
    packageHash: files.manifest.files ? 'PUBLISHED_HASH_READ_FROM_CATALOG' : 'missing',
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
      const slug = SLUGS.find((entry) => entry.scenarioId === scenarioId)?.slug;
      if (!slug) return null;
      const loaded = loadPublished(slug);
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
function editContent(loaded: LoadedScenario, language: 'en' | 'ar', suffix: string) {
  const version = loaded.package.script.data.versions.find((candidate) => candidate.language === language)!;
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
async function toConfirmed(api: MockApi, loaded: LoadedScenario, language: 'en' | 'ar' = 'en') {
  let session = unwrap(await api.createSession({ scenarioId: loaded.scenarioId, scenarioVersion: loaded.scenarioVersion, creationKey: `session-${language}` }));
  session = unwrap(await api.executeStage(ctx(session, 'discovery'), { stage: 'discovery' }));
  session = unwrap(await api.executeStage(ctx(session, 'analysis'), { stage: 'analysis' }));
  expect(session.workflow.analysis).toBe('awaiting_confirmation');
  const baseVersion = loaded.package.script.data.versions.find((candidate) => candidate.language === language)!;
  const saved = unwrap(await api.saveScriptDraft(ctx(session, 'draft'), { baseVersionId: baseVersion.id, content: editContent(loaded, language, 'edited') }));
  session = saved.session;
  session = unwrap(await api.confirmScript(ctx(session, 'confirm'), { scriptVersionId: session.activeScriptVersionId! }));
  expect(session.workflow.analysis).toBe('completed');
  expect(session.workflow.video).toBe('stale');
  return session;
}

describe('NV-001 content-only profile', () => {
  test('input boundary accepts all three published packages and rejects missing logo or illegal pending media', () => {
    for (const { slug } of SLUGS) expect(isContentPackageInput(rawPublished(slug))).toBe(true);

    const missingLogo = structuredClone(rawPublished('scent-layering'));
    const missingLogoAssets = (missingLogo.assets as any).data.assets as any[];
    const logo = missingLogoAssets.find((asset) => asset.kind === 'logo')!;
    logo.bytes = null;
    logo.sha256 = null;
    logo.rightsStatus = 'pending';
    expect(isContentPackageInput(missingLogo)).toBe(false);

    const illegalPending = structuredClone(rawPublished('scent-layering'));
    const illegalAssets = (illegalPending.assets as any).data.assets as any[];
    const product = illegalAssets.find((asset) => asset.kind === 'product_image')!;
    product.bytes = null;
    product.sha256 = null;
    product.rightsStatus = 'pending';
    expect(isContentPackageInput(illegalPending)).toBe(false);
  });

  test('published catalog exposes three content_ready scenarios and createSession loads real content', async () => {
    const api = createApi();
    const list = unwrap(await api.listScenarios());
    expect(list.items).toHaveLength(3);
    expect(list.items.every((item) => item.readiness === 'content_ready' && item.profile === 'content_only')).toBe(true);
    const loaded = loadPublished('scent-layering');
    const session = await toConfirmed(api, loaded);
    expect(session.profile).toBe('content_only');
    expect(session.scenarioId).toBe('scn-scent-layering');
    expect(session.stageAttempts.length).toBeGreaterThan(0);
    expect(session.activeScriptVersionId).toContain('usr.');
    const scenario = unwrap(await api.getScenario({ scenarioId: loaded.scenarioId, scenarioVersion: loaded.scenarioVersion }));
    expect(scenario.profile).toBe('content_only');
    expect(scenario.assets.some((asset) => asset.kind === 'product_image')).toBe(true);
  });

  test('content-only workflow confirms scripts without fabricating video ready and replay is limited to analysis prefix', async () => {
    const loaded = loadPublished('luxury-gifting');
    const api = createApi();
    let session = await toConfirmed(api, loaded, 'ar');
    expect(session.workflow.video).toBe('stale');
    expect(session.activeVideoId).toBeNull();
    const events = unwrap(await api.getEvents({ sessionId: session.id, afterSequence: 0, limit: 100 }));
    expect(events.items).toHaveLength(16);
    expect(events.items.at(-1)?.type).toBe('stage.completed');
    expect(events.items.at(-1)?.stage).toBe('analysis');
    const outOfPrefix = await api.replayCommand(ctx(session, 'seek-too-far'), { action: 'seek', cursorSequence: 17 });
    expect(outOfPrefix.ok).toBe(false);
    const seek = unwrap(await api.replayCommand(ctx(session, 'seek-prefix'), { action: 'seek', cursorSequence: 16 }));
    session = seek.session;
    expect(session.replay.cursorSequence).toBe(16);
  });

  test('content delivery save/simulate/export produces a real ZIP and preserves attempts', async () => {
    const loaded = loadPublished('oud-storytelling');
    const api = createApi();
    const session = await toConfirmed(api, loaded, 'en');
    const delivery = unwrap(await api.getContentDelivery(session.id));
    expect(delivery.sourcePlan).not.toBeNull();
    expect(delivery.delivery.attempts).toEqual([]);
    const draftResult = await api.saveContentDeliveryDraft(ctx(session, 'save-draft'), {
      sourcePlanId: delivery.sourcePlan!.id,
      scriptVersionId: session.activeScriptVersionId!,
      recipientSnapshot: delivery.sourcePlan!.recipients,
      subject: '[SIMULATED · CONTENT ONLY] edited subject',
      body: 'Simulated body only. No email is sent.',
    });
    const saved = unwrap(draftResult);
    expect(saved.draft.attachmentManifest.length).toBe(4);
    expect(saved.draft.attachmentManifest.some((attachment) => attachment.filename.endsWith('.vtt'))).toBe(true);
    expect(saved.draft.attachmentManifest.some((attachment) => attachment.filename.endsWith('.zip'))).toBe(false);
    expect(saved.draft.attachmentManifest.some((attachment) => attachment.filename.includes('mp4'))).toBe(false);

    const failed = unwrap(
      await api.simulateContentDelivery(ctx(saved.session, 'attempt-fail'), {
        draftRevision: saved.draft.revision,
        confirmed: true,
        failureCase: 'delivery_failed',
      }),
    );
    expect(failed.attempt.outcome).toBe('failed');
    expect(failed.session.contentDelivery?.attempts).toHaveLength(1);
    const retried = unwrap(
      await api.simulateContentDelivery(ctx(failed.session, 'attempt-success'), {
        draftRevision: saved.draft.revision,
        confirmed: true,
      }),
    );
    expect(retried.attempt.attempt).toBe(2);
    expect(retried.attempt.outcome).toBe('simulated_delivered');
    expect(retried.session.contentDelivery?.attempts).toHaveLength(2);
    const exported = unwrap(await api.exportContentPack(ctx(retried.session, 'export'), { attemptId: retried.attempt.id }));
    expect(exported.filename.endsWith('.zip')).toBe(true);
    expect(exported.blob[0]).toBe(0x50);
    expect(exported.blob[1]).toBe(0x4b);
    const text = new TextDecoder().decode(exported.blob);
    expect(text).toContain('SIMULATED-DELIVERY.json');
    expect(text).toContain('README.txt');
    expect(text).toContain('edited subject');
    expect(text).not.toContain('.mp4');
    expect(exported.bytes).toBeGreaterThan(1000);
  });

  test('script edits invalidate the pending content draft but preserve attempts', async () => {
    const loaded = loadPublished('scent-layering');
    const api = createApi();
    let session = await toConfirmed(api, loaded);
    const delivery = unwrap(await api.getContentDelivery(session.id));
    const draft = unwrap(
      await api.saveContentDeliveryDraft(ctx(session, 'draft-1'), {
        sourcePlanId: delivery.sourcePlan!.id,
        scriptVersionId: session.activeScriptVersionId!,
        recipientSnapshot: delivery.sourcePlan!.recipients,
        subject: 'Subject',
        body: 'Body',
      }),
    );
    session = draft.session;
    const attempt = unwrap(await api.simulateContentDelivery(ctx(session, 'attempt'), { draftRevision: draft.draft.revision, confirmed: true }));
    session = attempt.session;
    const newDraft = unwrap(
      await api.saveScriptDraft(ctx(session, 'new-draft'), {
        baseVersionId: session.activeScriptVersionId!,
        content: editContent(loaded, 'en', 'new'),
      }),
    );
    expect(newDraft.session.contentDelivery?.draft).toBeNull();
    expect(newDraft.session.contentDelivery?.attempts).toHaveLength(1);
    expect(unwrap(await api.getContentDelivery(newDraft.session.id)).delivery.attempts).toHaveLength(1);
  });
});
