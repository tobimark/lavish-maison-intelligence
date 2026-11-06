/**
 * Interactive Mock Product · explicit write commands.
 *
 * These commands reuse the existing MockApi session/state machine, storage and
 * ZIP writer. Browsing never reaches this module; only explicit Edit/Confirm,
 * Play/Step/Restart, Export and Download-trigger actions do.
 */
import type { CommandContext, ApiResult, SessionView } from './types';
import type {
  BeginCampaignEditInput,
  PreparedProductExport,
  ProductExportRecord,
  ProductLocale,
  ProductVersion,
  ProductVersionRef,
} from './product-contract';
import type {
  CampaignPackRecord,
  CampaignVersionRef,
  PreparedCampaignPack,
  ProvidedAssetSet,
} from './provided-asset-contract';
import type { ProvidedAssetSource } from './provided-asset-source';
import type { CampaignBundle, ProductQueries } from './product-queries';
import { vttTime, safeName } from './content-delivery';
import { createZip } from '../downloads/zip';
import type { PocStorage, StoredProductExport } from '../storage/types';
import type { ContentAttachment } from '../domain';const SOURCE_PREFIX_PATTERN = /^scn-[a-z0-9-]+\.asset\./;

function ascHex(bytes: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('WebCrypto SHA-256 is unavailable.');
  return subtle.digest('SHA-256', bytes as unknown as BufferSource).then(
    (digest) => [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join(''),
  );
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMs(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}

export interface ProductCommandBridge {
  createSessionForPurpose(input: {
    scenarioId: string;
    scenarioVersion: string;
    creationKey: string;
    purpose: 'editing' | 'activity';
  }): Promise<ApiResult<SessionView>>;
  getSession(input: { sessionId: string }): Promise<ApiResult<SessionView>>;
  executeStage(ctx: CommandContext, input: { stage: 'discovery' | 'analysis' }): Promise<ApiResult<SessionView>>;
  selectScript(ctx: CommandContext, input: { scriptVersionId: string }): Promise<ApiResult<SessionView>>;
}

export interface ProductCommandDeps {
  queries: ProductQueries;
  storage: PocStorage;
  bridge: ProductCommandBridge;
  now: () => string;
  providedAssetSource?: ProvidedAssetSource;
}

function contextOf(session: SessionView, idempotencyKey: string): CommandContext {
  return { sessionId: session.id, expectedRevision: session.revision, idempotencyKey };
}

function failure<T>(code: import('./types').ApiErrorCode, message: string): ApiResult<T> {
  return {
    ok: false,
    error: { code, message, fieldErrors: [], retryable: code === 'STORAGE_UNAVAILABLE' || code === 'STORAGE_QUOTA' },
    meta: { mode: 'mock', schemaVersion: '1.0.0', requestId: 'prd-command', sessionId: null, revision: null },
  };
}

const PREPARED_META = { mode: 'mock' as const, schemaVersion: '1.0.0' as const, requestId: 'prd-command', sessionId: null, revision: null };

function deliverableFiles(bundle: CampaignBundle, version: ProductVersion) {
  const assets = bundle.loaded.package.assets.data.assets;
  const media = bundle.loaded.media;
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const referenced: Array<{ id: string; filename: string; mimeType: string; bytes: Uint8Array }> = [];
  const used = new Set<string>();
  for (const shot of version.content.shots) {
    for (const assetId of shot.assetIds) {
      if (used.has(assetId)) continue;
      const asset = assetById.get(assetId);
      const bytes = media[assetId];
      if (!asset || typeof asset.bytes !== 'number' || typeof asset.sha256 !== 'string' || !bytes) continue;
      const extension = asset.mimeType === 'image/png' ? 'png' : asset.mimeType === 'image/jpeg' ? 'jpg' : 'webp';
      const filename = `media/${safeName(asset.id.replace(SOURCE_PREFIX_PATTERN, ''))}.${extension}`;
      referenced.push({ id: assetId, filename, mimeType: asset.mimeType, bytes });
      used.add(assetId);
    }
  }
  return { assets, referenced };
}

function storyboardHtml(bundle: CampaignBundle, version: ProductVersion, mediaPaths: Map<string, string>): string {
  const shots = version.content.shots
    .map((shot, index) => {
      const images = shot.assetIds
        .map((assetId) => mediaPaths.get(assetId))
        .filter((src): src is string => Boolean(src))
        .map((src) => `<img src="${escapeHtml(src)}" alt="Referenced product or brand image for shot ${index + 1}" />`)
        .join('');
      return [
        '<li class="shot">',
        '<div class="shot-frame">',
        images || '<p class="missing">No referenced image for this shot.</p>',
        '</div>',
        '<div class="shot-body">',
        `<p class="timing">Shot ${index + 1} · ${formatMs(shot.startMs)} – ${formatMs(shot.startMs + shot.durationMs)}</p>`,
        `<h3>${escapeHtml(shot.onScreenText)}</h3>`,
        `<p>${escapeHtml(shot.visual)}</p>`,
        shot.transition ? `<p class="meta">${escapeHtml(shot.transition)}</p>` : '',
        '</div>',
        '</li>',
      ].join('');
    })
    .join('\n');
  return [
    '<!doctype html>',
    '<html lang="' + (version.language === 'ar' ? 'ar' : 'en') + '" dir="' + (version.language === 'ar' ? 'rtl' : 'ltr') + '">',
    '<head>',
    '<meta charset="utf-8" />',
    `<title>${escapeHtml(version.title)} · Static storyboard</title>`,
    '<style>',
    'body{font-family:Inter,"Segoe UI",Arial,sans-serif;margin:0;padding:32px;background:#f6f5f2;color:#252521}',
    'header{max-width:960px;margin:0 auto 24px}h1{font-size:28px;margin:0 0 8px}',
    '.meta{color:#56564e;font-size:14px}ol{list-style:none;margin:0;padding:0;display:grid;gap:20px;max-width:960px;margin-inline:auto}',
    '.shot{display:grid;grid-template-columns:minmax(0,320px) minmax(0,1fr);gap:20px;background:#fffefc;border:1px solid #e8e5df;border-radius:12px;padding:18px}',
    '.shot-frame{background:#262725;border-radius:8px;display:flex;align-items:center;justify-content:center;min-height:180px;overflow:hidden;gap:8px;padding:8px}',
    '.shot-frame img{max-width:100%;max-height:240px;object-fit:contain}',
    '.timing{color:#816333;font-size:13px;margin:0 0 6px}.missing{color:#e8e5df;font-size:13px}',
    'h3{font-size:17px;margin:0 0 8px}footer{max-width:960px;margin:28px auto 0;color:#56564e;font-size:13px}',
    '@media(max-width:720px){.shot{grid-template-columns:1fr}}',
    '</style>',
    '</head>',
    '<body>',
    '<header>',
    `<p class="meta">${escapeHtml(bundle.campaign.name)} · ${version.language.toUpperCase()} · ${version.origin === 'preset' ? 'Preset' : 'Saved version'} · ${version.confirmation === 'confirmed_current' ? 'Confirmed' : 'Not confirmed'}</p>`,
    `<h1>${escapeHtml(version.title)}</h1>`,
    `<p>${escapeHtml(version.content.hook)}</p>`,
    '<p class="meta">Static storyboard reference generated locally. This is not a produced advertisement and no video is included.</p>',
    '</header>',
    `<ol>${shots}</ol>`,
    '<footer>MAISON INTELLIGENCE · Interactive Mock Product · Demo / Mock data</footer>',
    '</body>',
    '</html>',
  ].join('\n');
}

export interface BuiltProductPack {
  files: Array<{ filename: string; mimeType: string; bytes: Uint8Array }>;
  attachments: ContentAttachment[];
  archiveFilename: string;
  archiveBytes: Uint8Array;
  archiveSha256: string;
}

function confirmationLabel(version: ProductVersion): 'unconfirmed' | 'confirmed_current' {
  return version.confirmation;
}

export async function buildProductPack(
  bundle: CampaignBundle,
  version: ProductVersion,
  exportId: string,
  createdAt: string,
): Promise<BuiltProductPack> {
  const slug = safeName(bundle.loaded.package.manifest.slug);
  const { referenced } = deliverableFiles(bundle, version);
  const mediaPaths = new Map(referenced.map((asset) => [asset.id, asset.filename]));
  const briefJson = JSON.stringify(
    {
      schemaVersion: '1.0.0',
      mode: 'mock',
      campaignId: bundle.ref.campaignId,
      opportunityId: bundle.ref.opportunityId,
      scenarioId: bundle.ref.scenarioId,
      scenarioVersion: bundle.ref.scenarioVersion,
      packageHash: bundle.ref.packageHash,
      brief: bundle.brief,
      analysis: {
        id: bundle.analysis.id,
        insights: bundle.analysis.insights,
        rationale: bundle.analysis.rationale,
        recommendation: bundle.analysis.recommendation,
        assumptions: bundle.analysis.assumptions,
        uncertainties: bundle.analysis.uncertainties,
        evidenceIds: bundle.analysis.evidenceIds,
        trendIds: bundle.analysis.trendIds,
      },
    },
    null,
    2,
  );
  const scriptJson = JSON.stringify(
    {
      schemaVersion: '1.0.0',
      mode: 'mock',
      id: version.versionId,
      campaignId: version.campaignId,
      sessionId: version.sessionId,
      origin: version.origin,
      language: version.language,
      title: version.content.title,
      hook: version.content.hook,
      message: version.content.message,
      cta: version.content.cta,
      durationMs: 15000,
      shots: version.content.shots,
      subtitles: version.content.subtitles,
      caption: version.content.caption,
      hashtags: version.content.hashtags,
      sourceScriptVersionId: version.sourceScriptVersionId,
      parentVersionId: version.parentVersionId,
      confirmation: confirmationLabel(version),
      noVideo: true,
      noRealEmail: true,
    },
    null,
    2,
  );
  const vtt = [
    'WEBVTT',
    '',
    version.content.subtitles
      .map((subtitle, index) => `${index + 1}\n${vttTime(subtitle.startMs)} --> ${vttTime(subtitle.endMs)}\n${subtitle.text}`)
      .join('\n\n'),
    '',
  ].join('\n');
  const storyboard = storyboardHtml(bundle, version, mediaPaths);
  const readme = [
    'LAVISH INTERACTIVE MOCK PRODUCT · CONTENT PACK',
    '',
    `Campaign: ${bundle.campaign.name} (${bundle.ref.campaignId})`,
    `Version: ${version.versionId} (${version.origin}${version.sessionId ? `, session ${version.sessionId}` : ''})`,
    `Language: ${version.language.toUpperCase()}`,
    `Confirmation at export: ${version.confirmation === 'confirmed_current' ? 'Confirmed current' : 'Draft / Not confirmed'}`,
    '',
    'Files:',
    '- brief.json — campaign brief and analysis rationale',
    '- script.json — exact exported script version content',
    `- subtitles-${version.language}.vtt — subtitle cues for this version`,
    '- storyboard.html — offline static four-shot reference (not a video)',
    `- ${referenced.length} media file(s) under media/ — real approved product/logo images referenced by the shots`,
    '- README.txt',
    '- EXPORT.json — export metadata and attachment manifest',
    '',
    'No MP4, no poster, no rendered video and no email delivery is included.',
    'This pack does not confirm or change the script; it is an immutable snapshot of the selected version.',
    'MAISON INTELLIGENCE · Demo / Mock data',
  ].join('\n');

  const files: BuiltProductPack['files'] = [
    { filename: 'brief.json', mimeType: 'application/json', bytes: utf8(briefJson) },
    { filename: 'script.json', mimeType: 'application/json', bytes: utf8(scriptJson) },
    { filename: `subtitles-${version.language}.vtt`, mimeType: 'text/vtt', bytes: utf8(vtt) },
    { filename: 'storyboard.html', mimeType: 'text/html', bytes: utf8(storyboard) },
    ...referenced.map((asset) => ({ filename: asset.filename, mimeType: asset.mimeType, bytes: asset.bytes })),
    { filename: 'README.txt', mimeType: 'text/plain', bytes: utf8(readme) },
  ];
  const attachments: ContentAttachment[] = [];
  for (const file of files) {
    attachments.push({
      filename: file.filename,
      mimeType: file.mimeType,
      bytes: file.bytes.byteLength,
      sha256: await ascHex(file.bytes),
    });
  }
  const exportJson = JSON.stringify(
    {
      schemaVersion: '1.0.0',
      exportId,
      createdAt,
      mode: 'mock',
      campaign: bundle.ref,
      version: { campaignId: version.campaignId, versionId: version.versionId, sessionId: version.sessionId },
      language: version.language,
      origin: version.origin,
      confirmationAtExport: confirmationLabel(version),
      noVideo: true,
      noRealEmail: true,
      attachments,
    },
    null,
    2,
  );
  const archiveBytes = createZip([
    ...files.map((file) => ({ filename: file.filename, bytes: file.bytes })),
    { filename: 'EXPORT.json', bytes: utf8(exportJson) },
  ]);
  return {
    files,
    attachments,
    archiveFilename: `${slug}-${version.language}-${version.origin}-content-pack.zip`,
    archiveBytes,
    archiveSha256: await ascHex(archiveBytes),
  };
}

function shortKey(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export class ProductCommands {
  private readonly queries: ProductQueries;
  private readonly storage: PocStorage;
  private readonly bridge: ProductCommandBridge;
  private readonly now: () => string;
  private readonly providedAssetSource?: ProvidedAssetSource;

  constructor(deps: ProductCommandDeps) {
    this.queries = deps.queries;
    this.storage = deps.storage;
    this.bridge = deps.bridge;
    this.now = deps.now;
    this.providedAssetSource = deps.providedAssetSource;
  }

  private ok<T>(data: T): ApiResult<T> {
    return { ok: true, data, meta: PREPARED_META };
  }

  /** Explicit Edit / Use as working version / Confirm: binds or creates the working session. */
  async beginCampaignEdit(input: BeginCampaignEditInput): Promise<ApiResult<{ session: SessionView; version: ProductVersion }>> {
    try {
      const resolved = await this.queries.findVersion({
        campaignId: input?.campaignId,
        versionId: input?.versionId,
        sessionId: input?.sessionId ?? null,
      });
      if (!resolved) return failure('NOT_FOUND', 'The Campaign or the selected version no longer exists.');
      const { bundle, version } = resolved;
      let sessionId: string | null = null;
      if (version.origin === 'saved') {
        sessionId = version.sessionId;
      } else {
        const link = await this.storage.getWorkspaceLink(bundle.ref.campaignId, bundle.ref.packageHash);
        const sessions = await this.queries.listSessionsForCampaign(bundle.ref.campaignId);
        if (link && sessions.some((session) => session.id === link.sessionId)) {
          sessionId = link.sessionId;
        } else if (sessions[0]) {
          sessionId = sessions[0].id;
        }
      }
      if (!sessionId) {
        const created = await this.bridge.createSessionForPurpose({
          scenarioId: bundle.ref.scenarioId,
          scenarioVersion: bundle.ref.scenarioVersion,
          creationKey: `campaign-edit:${bundle.ref.campaignId}:${bundle.ref.packageHash}`,
          purpose: 'editing',
        });
        if (!created.ok) return failure(created.error.code, created.error.message);
        sessionId = created.data.id;
      }
      let latest = await this.bridge.getSession({ sessionId });
      if (!latest.ok) return failure(latest.error.code, latest.error.message);
      let session = latest.data;
      if (session.packageHash !== bundle.ref.packageHash) {
        return failure('PACKAGE_CHANGED', 'The working session belongs to a different package version.');
      }
      if (session.workflow.discovery !== 'completed') {
        const executed = await this.bridge.executeStage(contextOf(session, `init:${bundle.ref.campaignId}:discovery`), { stage: 'discovery' });
        if (!executed.ok) return failure(executed.error.code, executed.error.message);
        latest = await this.bridge.getSession({ sessionId });
        if (!latest.ok) return failure(latest.error.code, latest.error.message);
        session = latest.data;
      }
      if (session.workflow.analysis === 'ready' || session.workflow.analysis === 'locked') {
        const executed = await this.bridge.executeStage(contextOf(session, `init:${bundle.ref.campaignId}:analysis`), { stage: 'analysis' });
        if (!executed.ok) return failure(executed.error.code, executed.error.message);
        latest = await this.bridge.getSession({ sessionId });
        if (!latest.ok) return failure(latest.error.code, latest.error.message);
        session = latest.data;
      }
      if (session.activeScriptVersionId !== version.versionId) {
        const selected = await this.bridge.selectScript(contextOf(session, `select:${bundle.ref.campaignId}:${version.versionId}`), {
          scriptVersionId: version.versionId,
        });
        if (!selected.ok) return failure(selected.error.code, selected.error.message);
        latest = await this.bridge.getSession({ sessionId });
        if (!latest.ok) return failure(latest.error.code, latest.error.message);
        session = latest.data;
      }
      await this.storage.putWorkspaceLink({ campaignId: bundle.ref.campaignId, packageHash: bundle.ref.packageHash, sessionId: session.id });
      const exact = await this.queries.findVersion({ campaignId: bundle.ref.campaignId, versionId: version.versionId, sessionId: version.sessionId });
      return this.ok({ session, version: exact?.version ?? version });
    } catch (error) {
      return failure('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
    }
  }

  /** Explicit Play/Step/Restart: creates (once per creationKey) an isolated purpose=activity session. */
  async openActivityReplay(input: { campaignId: string; creationKey: string }): Promise<ApiResult<{ session: SessionView; lastSequence: number }>> {
    try {
      const bundle = await this.queries.getBundle(input?.campaignId);
      if (!bundle) return failure('NOT_FOUND', 'Unknown campaign for activity replay.');
      const created = await this.bridge.createSessionForPurpose({
        scenarioId: bundle.ref.scenarioId,
        scenarioVersion: bundle.ref.scenarioVersion,
        creationKey: `activity:${bundle.ref.campaignId}:${input.creationKey}`,
        purpose: 'activity',
      });
      if (!created.ok) return failure(created.error.code, created.error.message);
      const latest = await this.bridge.getSession({ sessionId: created.data.id });
      if (!latest.ok) return failure(latest.error.code, latest.error.message);
      const events = bundle.loaded.package.events.data.events;
      const completed = events.find((event) => event.stage === 'analysis' && event.type === 'stage.completed');
      return this.ok({ session: latest.data, lastSequence: completed?.sequence ?? 0 });
    } catch (error) {
      return failure('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
    }
  }

  /** Ordinary content-pack export. No confirmation, session creation or simulated email. */
  async exportScriptPack(input: ProductVersionRef & { idempotencyKey: string }): Promise<ApiResult<PreparedProductExport>> {
    try {
      const resolved = await this.queries.findVersion({
        campaignId: input?.campaignId,
        versionId: input?.versionId,
        sessionId: input?.sessionId ?? null,
      });
      if (!resolved) return failure('NOT_FOUND', 'The requested preset or saved version does not exist.');
      const { bundle, version } = resolved;
      const createdAt = this.now();
      const exportId = `prd-export.${shortKey(`${bundle.ref.campaignId}|${version.versionId}|${version.sessionId ?? 'preset'}|${input.idempotencyKey}`)}`;
      const existing = await this.storage.getProductExport(exportId);
      if (existing) return this.ok({ record: existing.record, download: existing.download });
      const built = await buildProductPack(bundle, version, exportId, createdAt);
      const record: ProductExportRecord = {
        id: exportId,
        campaign: bundle.ref,
        version: { campaignId: version.campaignId, versionId: version.versionId, sessionId: version.sessionId },
        language: version.language as ProductLocale,
        title: version.title,
        origin: version.origin,
        confirmationAtExport: version.confirmation,
        createdAt,
        status: 'prepared',
        archiveFilename: built.archiveFilename,
        archiveBytes: built.archiveBytes.byteLength,
        archiveSha256: built.archiveSha256,
        attachments: built.attachments,
        mode: 'mock',
        noVideo: true,
        noRealEmail: true,
      };
      const stored: StoredProductExport = {
        record,
        download: {
          blob: built.archiveBytes,
          filename: built.archiveFilename,
          mimeType: 'application/zip',
          bytes: built.archiveBytes.byteLength,
          sha256: built.archiveSha256,
        },
      };
      await this.storage.putProductExport(stored);
      const persisted = await this.storage.getProductExport(exportId);
      if (!persisted) return failure('STORAGE_UNAVAILABLE', 'The export record could not be stored; nothing was reported as downloaded.');
      return this.ok({ record: persisted.record, download: persisted.download });
    } catch (error) {
      return failure('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
    }
  }

  async getProductExport(input: { exportId: string }): Promise<ApiResult<PreparedProductExport>> {
    try {
      const stored = await this.storage.getProductExport(input?.exportId);
      if (!stored) return failure('NOT_FOUND', `Unknown export ${input?.exportId ?? ''}.`);
      return this.ok({ record: stored.record, download: stored.download });
    } catch (error) {
      return failure('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
    }
  }

  async markProductExportTriggered(input: { exportId: string }): Promise<ApiResult<ProductExportRecord>> {
    try {
      const existing = await this.storage.getProductExport(input?.exportId);
      if (!existing) return failure('NOT_FOUND', `Unknown export ${input?.exportId ?? ''}.`);
      if (existing.record.status === 'download_triggered') return this.ok(existing.record);
      const updated = await this.storage.updateProductExportStatus(input.exportId, 'download_triggered');
      if (!updated) return failure('STORAGE_UNAVAILABLE', 'The export record could not be updated.');
      return this.ok(updated.record);
    } catch (error) {
      return failure('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
    }
  }

  /** AS-005 bilingual campaign pack. Provided assets are included only when the sidecar is bound. */
  async exportCampaignPack(input: {
    campaignId: string;
    versions: CampaignVersionRef[];
    includeProvidedAssets: boolean;
    idempotencyKey: string;
  }): Promise<ApiResult<PreparedCampaignPack>> {
    try {
      if (!input?.campaignId || !Array.isArray(input.versions) || input.versions.length === 0) {
        return failure('INVALID_INPUT', 'campaignId and at least one version are required.');
      }
      const resolvedVersions: Array<{ version: ProductVersion; bundle: CampaignBundle }> = [];
      for (const reference of input.versions) {
        if (reference.campaignId !== input.campaignId) return failure('INVALID_INPUT', 'Every selected version must belong to the same campaign.');
        const resolved = await this.queries.findVersion({
          campaignId: reference.campaignId,
          versionId: reference.versionId,
          sessionId: reference.sessionId,
        });
        if (!resolved) return failure('NOT_FOUND', `The selected version ${reference.versionId} no longer exists.`);
        if (resolved.bundle.ref.scenarioVersion !== reference.scenarioVersion) {
          return failure('INVALID_INPUT', 'The selected version scenarioVersion does not match the campaign package.');
        }
        resolvedVersions.push(resolved);
      }
      const first = resolvedVersions[0];
      const createdAt = this.now();
      const exportId = `prd-campaign-pack.${shortKey(`${input.campaignId}|${input.versions.map((version) => version.versionId).join(',')}|${input.idempotencyKey}`)}`;
      const existing = await this.storage.getCampaignPackExport(exportId);
      if (existing) return this.ok({ record: existing.record, download: existing.download });

      let providedSet: ProvidedAssetSet | null = null;
      let providedAssets: Array<{ id: string; filename: string; mimeType: string; bytes: Uint8Array }> = [];
      if (input.includeProvidedAssets && this.providedAssetSource) {
        const set = await this.providedAssetSource.getAssetSet();
        if (!set) return failure('ASSET_UNAVAILABLE', 'No provided asset set is available for this campaign.');
        if (set.campaignId !== input.campaignId) return failure('NOT_FOUND', 'The provided asset set does not match this campaign.');
        if (set.scenarioVersion !== first.bundle.ref.scenarioVersion) {
          return failure('CONFIRMATION_REQUIRED', 'The provided SERENITY assets are not bound to the selected campaign version yet.');
        }
        if (set.contentStatus !== 'bound') {
          return failure('CONFIRMATION_REQUIRED', 'The provided SERENITY assets are still awaiting campaign content; no pack was created.');
        }
        providedSet = set;
        for (const asset of set.assets) {
          const bytes = await this.providedAssetSource.getAssetBytes(asset);
          if (!bytes) return failure('ASSET_UNAVAILABLE', `Provided asset ${asset.id} could not be read.`);
          if (bytes.byteLength !== asset.bytes || (await ascHex(bytes)) !== asset.sha256) {
            return failure('ASSET_UNAVAILABLE', `Provided asset ${asset.id} did not match the published bytes/hash.`);
          }
          const extension = asset.type === 'final_preview_video' ? 'mp4' : 'png';
          providedAssets.push({
            id: asset.id,
            filename: `provided/${safeName(asset.id.split('.').pop() ?? 'asset')}.${extension}`,
            mimeType: asset.mimeType,
            bytes,
          });
        }
      }

      const versionFiles: Array<{ filename: string; mimeType: string; bytes: Uint8Array }> = [];
      for (const { version, bundle } of resolvedVersions) {
        const built = await buildProductPack(bundle, version, `${exportId}.${version.language}`, createdAt);
        for (const file of built.files) {
          versionFiles.push({ ...file, filename: `${version.language}/${file.filename}` });
        }
      }
      const includedVersions = input.versions.map((version) => ({
        campaignId: version.campaignId,
        versionId: version.versionId,
        sessionId: version.sessionId,
        scenarioVersion: version.scenarioVersion,
      }));
      const noVideo = !providedAssets.some((asset) => asset.filename.endsWith('.mp4'));
      const readme = [
        'LAVISH INTERACTIVE MOCK PRODUCT · BILINGUAL CAMPAIGN PACK',
        '',
        `Campaign: ${first.bundle.campaign.name} (${input.campaignId})`,
        `Scenario: ${first.bundle.ref.scenarioId}@${first.bundle.ref.scenarioVersion}`,
        `Selected versions: ${resolvedVersions.map(({ version }) => `${version.language.toUpperCase()} ${version.versionId}`).join(' · ')}`,
        '',
        'Files:',
        '- en/, ar/ — brief, exact script JSON, matching VTT, static storyboard and referenced real images for each selected version',
        providedAssets.length > 0 ? '- provided/ — user-provided SERENITY hero, product identity and original MP4' : '- no provided video was included',
        '- README.txt',
        '- EXPORT.json',
        '',
        'The provided MP4 is a 10.08s / 3:4 supplied final preview, independent of the 15-second campaign scripts and not generated by this POC.',
        'No email was sent. The pack is a local mock export snapshot.',
        'MAISON INTELLIGENCE · Demo / Mock data',
      ].join('\n');
      const files = [
        ...versionFiles,
        ...providedAssets.map((asset) => ({ filename: asset.filename, mimeType: asset.mimeType, bytes: asset.bytes })),
        { filename: 'README.txt', mimeType: 'text/plain', bytes: utf8(readme) },
      ];
      const attachments: ContentAttachment[] = [];
      for (const file of files) {
        attachments.push({
          filename: file.filename,
          mimeType: file.mimeType,
          bytes: file.bytes.byteLength,
          sha256: await ascHex(file.bytes),
        });
      }
      const exportJson = JSON.stringify({
        schemaVersion: '1.0.0',
        mode: 'mock',
        kind: 'provided_asset_campaign_pack',
        exportId,
        createdAt,
        campaign: first.bundle.ref,
        includedVersions,
        providedAssetSetId: providedSet?.id ?? null,
        providedAssetIds: providedAssets.map((asset) => asset.id),
        noVideo,
        noRealEmail: true,
        attachments,
      }, null, 2);
      const archiveBytes = createZip([
        ...files.map((file) => ({ filename: file.filename, bytes: file.bytes })),
        { filename: 'EXPORT.json', bytes: utf8(exportJson) },
      ]);
      const className = safeName(first.bundle.loaded.package.manifest.slug);
      const archiveFilename = `${className}-${resolvedVersions.map(({ version }) => version.language).join('-')}-campaign-pack.zip`;
      const record: CampaignPackRecord = {
        id: exportId,
        kind: 'provided_asset_campaign_pack',
        campaign: first.bundle.ref,
        version: { campaignId: first.version.campaignId, versionId: first.version.versionId, sessionId: first.version.sessionId },
        language: first.version.language,
        title: first.version.title,
        origin: first.version.origin,
        confirmationAtExport: first.version.confirmation,
        createdAt,
        status: 'prepared',
        archiveFilename,
        archiveBytes: archiveBytes.byteLength,
        archiveSha256: await ascHex(archiveBytes),
        attachments,
        includedVersions,
        providedAssetSetId: providedSet?.id ?? null,
        providedAssetIds: providedAssets.map((asset) => asset.id),
        mode: 'mock',
        noVideo,
        noRealEmail: true,
      };
      await this.storage.putCampaignPackExport({
        record,
        download: {
          blob: archiveBytes,
          filename: archiveFilename,
          mimeType: 'application/zip',
          bytes: archiveBytes.byteLength,
          sha256: record.archiveSha256,
        },
      });
      const persisted = await this.storage.getCampaignPackExport(exportId);
      if (!persisted) return failure('STORAGE_UNAVAILABLE', 'The campaign pack record could not be stored; nothing was reported as downloaded.');
      return this.ok({ record: persisted.record, download: persisted.download });
    } catch (error) {
      return failure('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
    }
  }

  async listCampaignPackExports(input?: { campaignId?: string }): Promise<ApiResult<{ items: CampaignPackRecord[] }>> {
    try {
      const stored = await this.storage.listCampaignPackExports();
      return this.ok({
        items: stored
          .map((value) => value.record)
          .filter((record) => !input?.campaignId || record.campaign.campaignId === input.campaignId)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
      });
    } catch (error) {
      return failure('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
    }
  }

  async getCampaignPackExport(input: { exportId: string }): Promise<ApiResult<PreparedCampaignPack>> {
    try {
      const stored = await this.storage.getCampaignPackExport(input?.exportId);
      if (!stored) return failure('NOT_FOUND', `Unknown campaign pack export ${input?.exportId ?? ''}.`);
      return this.ok({ record: stored.record, download: stored.download });
    } catch (error) {
      return failure('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
    }
  }

  async markCampaignPackExportTriggered(input: { exportId: string }): Promise<ApiResult<CampaignPackRecord>> {
    try {
      const existing = await this.storage.getCampaignPackExport(input?.exportId);
      if (!existing) return failure('NOT_FOUND', `Unknown campaign pack export ${input?.exportId ?? ''}.`);
      if (existing.record.status === 'download_triggered') return this.ok(existing.record);
      const updated = await this.storage.updateCampaignPackExportStatus(input.exportId, 'download_triggered');
      if (!updated) return failure('STORAGE_UNAVAILABLE', 'The campaign pack record could not be updated.');
      return this.ok(updated.record);
    } catch (error) {
      return failure('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
    }
  }
}

export function createProductCommands(deps: ProductCommandDeps): ProductCommands {
  return new ProductCommands(deps);
}
