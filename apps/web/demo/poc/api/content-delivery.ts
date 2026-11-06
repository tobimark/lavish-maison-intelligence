import { findPackageScript, findUserVersion, type ContentAttachment, type ContentDeliveryRecipient, type ScenarioPackage, type ScriptEditable } from '../domain';
import type { LoadedScenario, SessionView } from './types';

export interface ResolvedContentScript {
  id: string;
  language: 'en' | 'ar';
  title: string;
  versionLabel: string;
  content: ScriptEditable;
  packageScriptId: string;
  parentVersionId: string;
  isUserVersion: boolean;
  durationMs: number;
}

export interface ContentPackFile {
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
}

export interface BuiltContentPack {
  files: ContentPackFile[];
  attachments: ContentAttachment[];
}

export function listContentScripts(session: SessionView, loaded: LoadedScenario) {
  const packageScripts = loaded.package.script.data.versions.map((script) => ({
    id: script.id,
    language: script.language,
    title: script.title,
    versionLabel: `Preset ${script.language.toUpperCase()} v${script.version}`,
    isUserVersion: false,
  }));
  const userScripts = session.userVersions.map((version) => ({
    id: version.id,
    language: version.language,
    title: version.content.title,
    versionLabel: `Saved ${version.language.toUpperCase()} v${version.revision}`,
    isUserVersion: true,
  }));
  return [...packageScripts, ...userScripts];
}

export function resolveContentScript(session: SessionView, loaded: LoadedScenario, scriptVersionId: string): ResolvedContentScript | null {
  const packageScript = findPackageScript(loaded.package, scriptVersionId);
  if (packageScript) {
    return {
      id: packageScript.id,
      language: packageScript.language,
      title: packageScript.title,
      versionLabel: `Preset ${packageScript.language.toUpperCase()} v${packageScript.version}`,
      content: {
        title: packageScript.title,
        hook: packageScript.hook,
        message: packageScript.message,
        cta: packageScript.cta,
        shots: packageScript.shots.map((shot) => ({ ...shot, assetIds: [...shot.assetIds] })),
        subtitles: packageScript.subtitles.map((subtitle) => ({ ...subtitle })),
        caption: packageScript.caption,
        hashtags: [...packageScript.hashtags],
      },
      packageScriptId: packageScript.id,
      parentVersionId: packageScript.id,
      isUserVersion: false,
      durationMs: packageScript.durationMs,
    };
  }
  const user = findUserVersion(session, scriptVersionId);
  if (!user) return null;
  return {
    id: user.id,
    language: user.language,
    title: user.content.title,
    versionLabel: `Saved ${user.language.toUpperCase()} v${user.revision}`,
    content: {
      ...user.content,
      shots: user.content.shots.map((shot) => ({ ...shot, assetIds: [...shot.assetIds] })),
      subtitles: user.content.subtitles.map((subtitle) => ({ ...subtitle })),
      hashtags: [...user.content.hashtags],
    },
    packageScriptId: user.sourceScriptVersionId,
    parentVersionId: user.parentVersionId,
    isUserVersion: true,
    durationMs: 15000,
  };
}

export function defaultContentPlan(loaded: LoadedScenario) {
  const plans = loaded.package.delivery.data.plans;
  return plans.find((plan) => plan.scriptVersionId === loaded.package.manifest.entryScriptVersionId) ?? plans[0] ?? null;
}

export function defaultContentRecipients(loaded: LoadedScenario): ContentDeliveryRecipient[] {
  const plan = defaultContentPlan(loaded);
  if (!plan) return [];
  const recipients = loaded.package.delivery.data.recipients;
  return plan.recipientIds
    .map((id) => recipients.find((recipient) => recipient.id === id))
    .filter((recipient): recipient is NonNullable<typeof recipient> => Boolean(recipient))
    .map((recipient) => ({ id: recipient.id, displayName: recipient.displayName, email: recipient.email }));
}

export function defaultContentSubject(loaded: LoadedScenario, script: ResolvedContentScript): string {
  return `[SIMULATED · CONTENT ONLY] ${script.title} — ${loaded.package.manifest.title}`;
}

export function defaultContentBody(loaded: LoadedScenario, script: ResolvedContentScript): string {
  return [
    'SIMULATED CONTENT-ONLY DELIVERY — NO EMAIL WAS SENT.',
    '',
    `Scenario: ${loaded.package.manifest.title}`,
    `Script: ${script.language.toUpperCase()} ${script.versionLabel}`,
    'Attachment list: script JSON, subtitle VTT, email text, README, simulated delivery record.',
    '',
    'This content demo has no video and no poster. The missing video is marked deferred; no MP4 or poster is attached or implied.',
    'No real mail service, platform, renderer or external tracking was contacted. Recipient addresses use .invalid.',
    '',
    'Please review the selected script, subtitles and supplied content for tone, product identity and Arabic review.',
  ].join('\n');
}

export function vttTime(ms: number): string {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

export function scriptVtt(script: ResolvedContentScript): string {
  const cues = script.content.subtitles.map((subtitle, index) => {
    return `${index + 1}\n${vttTime(subtitle.startMs)} --> ${vttTime(subtitle.endMs)}\n${subtitle.text}`;
  });
  return `WEBVTT\n\n${cues.join('\n\n')}\n`;
}

export function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

export async function buildContentPackFiles(args: {
  loaded: LoadedScenario;
  script: ResolvedContentScript;
  subject: string;
  body: string;
  recipients: ContentDeliveryRecipient[];
  sha256: (text: string) => Promise<string>;
}): Promise<BuiltContentPack> {
  const { loaded, script, subject, body, recipients, sha256 } = args;
  const slug = safeName(loaded.package.manifest.slug);
  const scriptSuffix = safeName(script.id.split('.').slice(-1)[0]).replace(new RegExp(`^${script.language}-`), '');
  const scriptFilename = `${slug}-${script.language}-${scriptSuffix}-script.json`;
  const vttFilename = `${slug}-${script.language}-subtitles.vtt`;
  const emailFilename = `${slug}-${script.language}-email.txt`;
  const readmeFilename = 'README.txt';
  const scriptJson = JSON.stringify(
    {
      schemaVersion: '1.0.0',
      profile: 'content_only',
      mode: 'mock',
      id: script.id,
      scenarioId: loaded.package.manifest.scenarioId,
      scenarioVersion: loaded.package.manifest.scenarioVersion,
      packageHash: loaded.packageHash,
      language: script.language,
      title: script.content.title,
      hook: script.content.hook,
      message: script.content.message,
      cta: script.content.cta,
      durationMs: script.durationMs,
      shots: script.content.shots,
      subtitles: script.content.subtitles,
      caption: script.content.caption,
      hashtags: script.content.hashtags,
      packageScriptId: script.packageScriptId,
      parentVersionId: script.parentVersionId,
      source: script.isUserVersion ? 'user_derived' : 'author_preset',
    },
    null,
    2,
  );
  const vtt = scriptVtt(script);
  const email = [
    `To: ${recipients.map((recipient) => `${recipient.displayName} <${recipient.email}>`).join(', ')}`,
    `Subject: ${subject}`,
    '',
    body,
    '',
    'SIMULATED CONTENT PACK — no email was sent and no video is attached.',
  ].join('\n');
  const readme = [
    'LAVISH CONTENT-ONLY DEMO PACK',
    '',
    'This archive was generated locally by the MAISON INTELLIGENCE mock demo.',
    'No email was sent to any recipient. All addresses use the reserved .invalid domain.',
    'No MP4, poster or video download is included; video production is deferred.',
    `Scenario: ${loaded.package.manifest.title} (${loaded.package.manifest.scenarioId}@${loaded.package.manifest.scenarioVersion})`,
    `Script: ${script.language.toUpperCase()} ${script.id}`,
    '',
    'Files:',
    `- ${scriptFilename}`,
    `- ${vttFilename}`,
    `- ${emailFilename}`,
    '- SIMULATED-DELIVERY.json',
    '- README.txt',
    '',
    'The script JSON and VTT are generated from the selected script version; editing another version does not change this pack.',
  ].join('\n');
  const files: ContentPackFile[] = [
    { filename: scriptFilename, mimeType: 'application/json', bytes: new TextEncoder().encode(scriptJson) },
    { filename: vttFilename, mimeType: 'text/vtt', bytes: new TextEncoder().encode(vtt) },
    { filename: emailFilename, mimeType: 'text/plain', bytes: new TextEncoder().encode(email) },
    { filename: readmeFilename, mimeType: 'text/plain', bytes: new TextEncoder().encode(readme) },
  ];
  const attachments: ContentAttachment[] = [];
  for (const file of files) {
    attachments.push({
      filename: file.filename,
      mimeType: file.mimeType,
      bytes: file.bytes.byteLength,
      sha256: await sha256(new TextDecoder().decode(file.bytes)),
    });
  }
  return { files, attachments };
}
