import { createServer, type Server } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';

import {
  evaluateSeekSamples,
  findFfprobe,
  parseFfprobeJson,
  parseVtt,
} from '../../scripts/poc/verify-media.mjs';

const ROOT = process.cwd();
const CLI = path.join(ROOT, 'scripts', 'poc', 'verify-media.mjs');
const MEDIA_DIR = path.join(ROOT, 'tests', 'fixtures', 'poc', 'media');
const SCENARIO_ID = 'scn-scent-layering';
const SCENARIO_VERSION = '1.0.0';
const MEDIA_ROOT = `/scenario-media/scent-layering/${SCENARIO_VERSION}`;
const SLOW_TEST_TIMEOUT_MS = 90_000;

const testSlow = (name: string, fn: () => void | Promise<void>) =>
  test(name, fn, SLOW_TEST_TIMEOUT_MS);

const tempDirs: string[] = [];
let server: Server;
let crossPortServer: Server;
let crossPortRequests = 0;
let crossPortUrl = '';
let baseUrl = '';

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function mediaFile(name: string): Buffer {
  return readFileSync(path.join(MEDIA_DIR, name));
}

function contentTypeFor(name: string): string {
  if (name.endsWith('.mp4')) return 'video/mp4';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.vtt')) return 'text/vtt';
  return 'application/octet-stream';
}

beforeAll(async () => {
  server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (url.pathname.endsWith('/redirect.mp4')) {
      response.writeHead(302, { Location: 'https://example.invalid/evil.mp4' });
      response.end();
      return;
    }
    if (url.pathname.endsWith('/missing.mp4')) {
      response.writeHead(404, { 'Content-Type': 'text/plain' });
      response.end('not found');
      return;
    }
    if (url.pathname.endsWith('/no-range.mp4')) {
      // Deliberately no Accept-Ranges / 206 support: Chromium cannot seek this
      // response, which exercises the tool's unseekable-media detection.
      const body = mediaFile('good-1080x1920-15s.mp4');
      response.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': body.length });
      response.end(body);
      return;
    }
    if (url.pathname.endsWith('/cross-port.mp4')) {
      response.writeHead(302, { Location: `${crossPortUrl}/evil.mp4` });
      response.end();
      return;
    }
    if (url.pathname.endsWith('/mime-mismatch.mp4')) {
      const body = mediaFile('fake-png-as.mp4');
      response.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': body.length });
      response.end(body);
      return;
    }
    const name = path.basename(url.pathname);
    if (!name) {
      response.writeHead(200, { 'Content-Type': 'text/html' });
      response.end('<!doctype html><html><body>TEST_ONLY media fixture server</body></html>');
      return;
    }
    const fullPath = path.join(MEDIA_DIR, name);
    if (!existsSync(fullPath)) {
      response.writeHead(404, { 'Content-Type': 'text/plain' });
      response.end('not found');
      return;
    }
    const body = readFileSync(fullPath);
    const contentType = name === 'mime-mismatch.mp4' ? 'image/png' : contentTypeFor(name);
    const range = request.headers.range;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (match) {
        const start = match[1] ? Number(match[1]) : 0;
        const end = match[2] ? Math.min(Number(match[2]), body.length - 1) : body.length - 1;
        if (start <= end) {
          const slice = body.subarray(start, end + 1);
          response.writeHead(206, {
            'Content-Type': contentType,
            'Content-Length': slice.length,
            'Content-Range': `bytes ${start}-${end}/${body.length}`,
            'Accept-Ranges': 'bytes',
          });
          response.end(slice);
          return;
        }
      }
    }
    response.writeHead(200, { 'Content-Type': contentType, 'Content-Length': body.length, 'Accept-Ranges': 'bytes' });
    response.end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not start media test server');
  baseUrl = `http://127.0.0.1:${address.port}`;

  crossPortServer = createServer((request, response) => {
    crossPortRequests += 1;
    response.writeHead(200, { 'Content-Type': 'video/mp4' });
    response.end('cross-port should not be requested');
  });
  await new Promise<void>((resolve) => crossPortServer.listen(0, '127.0.0.1', () => resolve()));
  const crossAddress = crossPortServer.address();
  if (!crossAddress || typeof crossAddress === 'string') throw new Error('Could not start cross-port test server');
  crossPortUrl = `http://127.0.0.1:${crossAddress.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await new Promise<void>((resolve) => crossPortServer.close(() => resolve()));
});

afterEach(() => {
  while (tempDirs.length) rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

type AssetOverrides = {
  id?: string;
  kind?: string;
  mimeType?: string;
  fileName?: string;
  uri?: string;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
};

function createAsset(key: string, overrides: AssetOverrides = {}) {
  const fileName = overrides.fileName ?? 'good-1080x1920-15s.mp4';
  const body = existsSync(path.join(MEDIA_DIR, fileName)) ? mediaFile(fileName) : Buffer.from('missing');
  return {
    id: overrides.id ?? `scn-scent-layering.asset.${key}`,
    kind: overrides.kind ?? 'video',
    mimeType: overrides.mimeType ?? 'video/mp4',
    uri: overrides.uri ?? `${MEDIA_ROOT}/${fileName}`,
    bytes: body.length,
    sha256: sha256(body),
    width: overrides.width === undefined ? 1080 : overrides.width,
    height: overrides.height === undefined ? 1920 : overrides.height,
    durationMs: overrides.durationMs === undefined ? 15000 : overrides.durationMs,
    sourceUrl: null,
    sourceNote: 'TEST_ONLY synthetic technical media fixture; not customer content',
    rightsStatus: 'approved_for_demo',
    rightsNote: 'TEST_ONLY fixture only; never ship or register in catalog',
    productIds: [],
  };
}

function makePackage(
  assets: any[],
  options: {
    includeVideoJson?: boolean;
    subtitles?: Array<{ id: string; startMs: number; endMs: number; text: string }>;
    shots?: Array<{ id: string; startMs: number; durationMs: number }>;
  } = {},
): string {
  const root = mkdtempSync(path.join(tmpdir(), 'poc-002-'));
  tempDirs.push(root);
  const dir = path.join(root, 'scenario');
  mkdirSync(dir, { recursive: true });
  const manifest = {
    schemaVersion: '1.0.0',
    scenarioId: SCENARIO_ID,
    scenarioVersion: SCENARIO_VERSION,
    title: 'TEST_ONLY media verification fixture',
    slug: 'scent-layering',
    mode: 'mock',
    timeZone: 'Asia/Dubai',
    locales: ['en', 'ar'],
    stages: ['discovery', 'analysis', 'video', 'delivery'],
    entryBriefId: 'scn-scent-layering.brief.test',
    entryScriptVersionId: 'scn-scent-layering.scriptversion.test-en',
    entryVideoId: 'scn-scent-layering.video.test-video',
    entryDeliveryId: 'scn-scent-layering.deliveryplan.test',
    authoring: {
      producer: 'ChatGPT',
      authoredAt: '2026-11-03T00:00:00Z',
      reasoningSummary: 'TEST_ONLY technical fixture; no business content',
      assumptions: ['TEST_ONLY'],
      limitations: ['TEST_ONLY media fixture'],
      reviewStatus: 'pending',
    },
    files: [],
  };
  writeFileSync(path.join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  writeFileSync(
    path.join(dir, 'assets.json'),
    `${JSON.stringify({ schemaVersion: '1.0.0', scenarioId: SCENARIO_ID, scenarioVersion: SCENARIO_VERSION, data: { assets } }, null, 2)}\n`,
    'utf8',
  );
  if (options.includeVideoJson !== false) {
    const videoAsset = assets.find((asset) => asset.mimeType === 'video/mp4') ?? assets[0];
    const subtitleAsset = assets.find((asset) => asset.mimeType === 'text/vtt');
    const posterAsset = assets.find((asset) => asset.kind === 'poster');
    const shotIds = ['scn-scent-layering.shot.test-1', 'scn-scent-layering.shot.test-2', 'scn-scent-layering.shot.test-3', 'scn-scent-layering.shot.test-4'];
    const defaultShots = [
      { id: shotIds[0], startMs: 0, durationMs: 2000 },
      { id: shotIds[1], startMs: 2000, durationMs: 3000 },
      { id: shotIds[2], startMs: 5000, durationMs: 4000 },
      { id: shotIds[3], startMs: 9000, durationMs: 6000 },
    ];
    const shots = options.shots ?? defaultShots;
    const subtitles = options.subtitles ?? [
      { id: 'scn-scent-layering.subtitle.test-1', startMs: 0, endMs: 5000, text: 'TEST_ONLY cue one' },
      { id: 'scn-scent-layering.subtitle.test-2', startMs: 5000, endMs: 10000, text: 'TEST_ONLY cue two' },
      { id: 'scn-scent-layering.subtitle.test-3', startMs: 10000, endMs: 15000, text: 'TEST_ONLY cue three' },
    ];
    writeFileSync(
      path.join(dir, 'video.json'),
      `${JSON.stringify(
        {
          schemaVersion: '1.0.0',
          scenarioId: SCENARIO_ID,
          scenarioVersion: SCENARIO_VERSION,
          data: {
            videos: [
              {
                id: 'scn-scent-layering.video.test-video',
                scriptVersionId: 'scn-scent-layering.scriptversion.test-en',
                storyboardShotIds: shots.map((shot) => shot.id),
                mp4AssetId: videoAsset?.id,
                posterAssetId: posterAsset?.id,
                subtitleAssetIds: subtitleAsset ? [subtitleAsset.id] : [],
                durationMs: 15000,
                width: 1080,
                height: 1920,
                frameRate: 30,
                productionMode: 'preproduced',
                disclosure: 'Pre-produced TEST_ONLY media fixture',
              },
            ],
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    writeFileSync(
      path.join(dir, 'script.json'),
      `${JSON.stringify(
        {
          schemaVersion: '1.0.0',
          scenarioId: SCENARIO_ID,
          scenarioVersion: SCENARIO_VERSION,
          data: {
            versions: [
              {
                id: 'scn-scent-layering.scriptversion.test-en',
                briefId: 'scn-scent-layering.brief.test',
                version: 1,
                language: 'en',
                title: 'TEST_ONLY',
                hook: 'TEST_ONLY',
                message: 'TEST_ONLY',
                cta: 'TEST_ONLY',
                durationMs: 15000,
                shots,
                subtitles,
                caption: 'TEST_ONLY',
                hashtags: [],
              },
            ],
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
  }
  return dir;
}

async function runMedia(dir: string, reportName = 'media-report.json', extraEnv: Record<string, string> = {}) {
  const reportPath = path.join(path.dirname(dir), reportName);
  const result = await new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve) => {
    const child = spawn(process.execPath, [CLI, '--dir', dir, '--base-url', baseUrl, '--report', reportPath], {
      cwd: ROOT,
      env: { ...process.env, ...extraEnv },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
  const report = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, 'utf8')) : null;
  return { result, report, reportPath };
}

function videoAsset(fileName: string, overrides: AssetOverrides = {}) {
  return createAsset('test-video', { fileName, ...overrides });
}

function posterAsset(fileName = 'poster-1080x1920.png') {
  return createAsset('test-poster', {
    kind: 'poster',
    mimeType: 'image/png',
    fileName,
    width: 1080,
    height: 1920,
    durationMs: null,
  });
}

function subtitleAsset(fileName = 'good.vtt') {
  return createAsset('test-subtitle', {
    kind: 'subtitle',
    mimeType: 'text/vtt',
    fileName,
    width: null,
    height: null,
    durationMs: null,
  });
}

describe('POC-002 media verification helpers', async () => {
  testSlow('VTT parser accepts in-range cues with text and rejects out-of-range/overlap/bad files', async () => {
    const good = parseVtt(
      'WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nA\n\n00:00:05.000 --> 00:00:15.000\nB\n',
      15000,
    );
    expect(good.cues).toHaveLength(2);
    expect(good.cues[0].text).toBe('A');
    expect(good.issues).toEqual([]);

    const overlap = parseVtt(
      'WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nA\n\n00:00:04.000 --> 00:00:10.000\nB\n',
      15000,
    );
    expect(overlap.issues.map((item: any) => item.code)).toContain('SUBTITLE_ORDER_INVALID');

    const bad = parseVtt('WEBVTT\n\n00:00:00.000 --> 00:00:20.000\nB\n', 15000);
    expect(bad.issues.map((item: any) => item.code)).toContain('SUBTITLE_RANGE_INVALID');
    expect(parseVtt('not a vtt', 15000).issues.map((item: any) => item.code)).toEqual(
      expect.arrayContaining(['SUBTITLE_FORMAT', 'SUBTITLE_EMPTY']),
    );
  });

  testSlow('seek evaluator detects a video whose currentTime does not advance', async () => {
    const issues = evaluateSeekSamples(
      [
        { targetMs: 3750, actualMs: 0, seeked: false },
        { targetMs: 7500, actualMs: 7500, seeked: true },
      ],
      15000,
    );
    expect(issues.map((item: any) => item.code)).toEqual(['VIDEO_SEEK_FAILED']);
  });

  testSlow('ffprobe JSON parser rejects missing/NaN/Infinity duration and checks streams', async () => {
    const good = {
      format: { duration: '15.000000' },
      streams: [
        { codec_type: 'video', codec_name: 'h264', pix_fmt: 'yuv420p', width: 1080, height: 1920 },
        { codec_type: 'audio', codec_name: 'aac' },
      ],
    };
    expect(parseFfprobeJson(good, { width: 1080, height: 1920, durationMs: 15000 })).toEqual([]);

    for (const duration of [undefined, null, '', 'NaN', 'Infinity', '-1']) {
      const invalid = { format: duration === undefined ? {} : { duration }, streams: good.streams };
      expect(parseFfprobeJson(invalid, { width: 1080, height: 1920, durationMs: 15000 }).map((item: any) => item.code)).toContain(
        'FFPROBE_DURATION_INVALID',
      );
    }

    const bad = {
      format: { duration: '5.000000' },
      streams: [{ codec_type: 'video', codec_name: 'mpeg4', pix_fmt: 'yuv444p', width: 640, height: 360 }],
    };
    expect(
      parseFfprobeJson(bad, { width: 1080, height: 1920, durationMs: 15000 }).map((item: any) => item.code),
    ).toEqual(
      expect.arrayContaining([
        'FFPROBE_CODEC_INVALID',
        'FFPROBE_PIXEL_FORMAT_INVALID',
        'FFPROBE_WIDTH_INVALID',
        'FFPROBE_HEIGHT_INVALID',
        'FFPROBE_DURATION_INVALID',
      ]),
    );
  });
});

describe('POC-002 media verification CLI', async () => {
  testSlow('good technical media records actual metadata and keeps L5 PASS/NOT_RUN honest', async () => {
    const dir = makePackage([videoAsset('good-1080x1920-15s.mp4'), posterAsset(), subtitleAsset()]);
    const { result, report } = await runMedia(dir);
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(report).toBeTruthy();
    expect(report.errors).toEqual([]);
    expect(report.runnable).toBe(false);
    expect(report.packageHash).toMatch(/^[a-f0-9]{64}$/);
    const ffprobeAvailable = Boolean(findFfprobe());
    expect(report.ffprobe).toBe(ffprobeAvailable ? 'available' : 'not_run');
    expect(report.layers.find((layer: any) => layer.name === 'L5').status).toBe(
      ffprobeAvailable ? 'pass' : 'not_run',
    );
    const video = report.media.find((item: any) => item.kind === 'video');
    expect(video.video.durationMs).toBe(15000);
    expect(video.video.width).toBe(1080);
    expect(video.video.height).toBe(1920);
    expect(video.video.shotStartsMs).toEqual([0, 2000, 5000, 9000]);
    expect(video.video.seekTargetsMs).toEqual([2000, 5000, 9000, 14500]);
    expect(video.video.seeks.map((seek: any) => seek.targetMs)).toEqual([2000, 5000, 9000, 14500]);
    expect(video.video.seeks.every((seek: any) => seek.seeked)).toBe(true);
    expect(video.video.startAtZero).toBe(true);
    expect(video.video.canPlayReady).toBe(true);
    expect(video.video.playback.deltaMs).toBeGreaterThanOrEqual(100);
    expect(video.video.played).toBe(true);
    const poster = report.media.find((item: any) => item.kind === 'poster');
    expect(poster.image).toMatchObject({ width: 1080, height: 1920 });
    const subtitle = report.media.find((item: any) => item.kind === 'subtitle');
    expect(subtitle.subtitle.cues).toBe(3);
    expect(subtitle.subtitle.textMatched).toBe(true);
  });

  testSlow('corrupt/truncated MP4 fails video decode', async () => {
    const dir = makePackage([videoAsset('corrupt-truncated.mp4')]);
    const { result, report } = await runMedia(dir);
    expect(result.status).toBe(1);
    expect(report.layers.find((layer: any) => layer.name === 'L5').status).toBe('fail');
    expect(report.errors.some((error: any) => /VIDEO_|MEDIA_/.test(error.code))).toBe(true);
    expect(report.errors.every((error: any) => error.file === 'assets.json' && error.jsonPointer.startsWith('/data/assets/0'))).toBe(true);
  });

  testSlow('PNG bytes renamed .mp4 fail MIME/signature checks', async () => {
    const dir = makePackage([videoAsset('fake-png-as.mp4')]);
    const { result, report } = await runMedia(dir);
    expect(result.status).toBe(1);
    expect(report.errors.map((error: any) => error.code)).toContain('MEDIA_SIGNATURE_MISMATCH');
  });

  testSlow('wrong video dimensions are detected from actual browser metadata', async () => {
    const dir = makePackage([videoAsset('wrong-dimensions-640x360-15s.mp4')]);
    const { result, report } = await runMedia(dir);
    expect(result.status).toBe(1);
    expect(report.errors.map((error: any) => error.code)).toContain('VIDEO_WIDTH_MISMATCH');
    expect(report.errors.map((error: any) => error.code)).toContain('VIDEO_HEIGHT_MISMATCH');
  });

  testSlow('wrong duration is detected (100 ms tolerance)', async () => {
    const dir = makePackage([videoAsset('wrong-duration-1080x1920-5s.mp4')]);
    const { result, report } = await runMedia(dir);
    expect(result.status).toBe(1);
    expect(report.errors.map((error: any) => error.code)).toContain('VIDEO_DURATION_MISMATCH');
  });

  testSlow('HTTP 404 is a media failure, not a fake pass', async () => {
    const dir = makePackage([
      createAsset('test-video', {
        fileName: 'missing.mp4',
        uri: `${MEDIA_ROOT}/missing.mp4`,
      }),
    ]);
    const { result, report } = await runMedia(dir);
    expect(result.status).toBe(1);
    expect(report.errors.map((error: any) => error.code)).toContain('MEDIA_HTTP_STATUS');
  });

  testSlow('external redirect is rejected without following it', async () => {
    const dir = makePackage([
      createAsset('test-video', {
        fileName: 'good-1080x1920-15s.mp4',
        uri: `${MEDIA_ROOT}/redirect.mp4`,
      }),
    ]);
    const { result, report } = await runMedia(dir);
    expect(result.status).toBe(1);
    expect(report.errors.map((error: any) => error.code)).toContain('EXTERNAL_REDIRECT');
  });

  testSlow('Content-Type mismatch is detected', async () => {
    const dir = makePackage([
      createAsset('test-video', {
        fileName: 'mime-mismatch.mp4',
        uri: `${MEDIA_ROOT}/mime-mismatch.mp4`,
      }),
    ]);
    const { result, report } = await runMedia(dir);
    expect(result.status).toBe(1);
    expect(report.errors.map((error: any) => error.code)).toContain('MEDIA_MIME_MISMATCH');
  });

  testSlow('A video response without range support is detected as unseekable', async () => {
    const dir = makePackage([
      createAsset('test-video', {
        fileName: 'good-1080x1920-15s.mp4',
        uri: `${MEDIA_ROOT}/no-range.mp4`,
      }),
    ]);
    const { result, report } = await runMedia(dir);
    expect(result.status).toBe(1);
    expect(
      report.errors.some((error: any) =>
        ['VIDEO_SEEK_FAILED', 'VIDEO_UNSEEKABLE'].includes(error.code),
      ),
    ).toBe(true);
  });

  testSlow('Out-of-range VTT cues fail subtitle validation', async () => {
    const dir = makePackage([videoAsset('good-1080x1920-15s.mp4'), subtitleAsset('bad-range.vtt')]);
    const { result, report } = await runMedia(dir);
    expect(result.status).toBe(1);
    expect(report.errors.map((error: any) => error.code)).toContain('SUBTITLE_RANGE_INVALID');
  });

  testSlow('Cross-port redirect is rejected before the target receives any request', async () => {
    const before = crossPortRequests;
    const dir = makePackage([
      createAsset('test-video', {
        fileName: 'good-1080x1920-15s.mp4',
        uri: `${MEDIA_ROOT}/cross-port.mp4`,
      }),
    ]);
    const { result, report } = await runMedia(dir);
    expect(result.status).toBe(1);
    expect(report.errors.map((error: any) => error.code)).toContain('EXTERNAL_REDIRECT');
    expect(crossPortRequests).toBe(before);
  });

  testSlow('Controlled play() that resolves without advancing fails VIDEO_PLAYBACK_FAILED', async () => {
    const dir = makePackage([videoAsset('good-1080x1920-15s.mp4'), posterAsset(), subtitleAsset()]);
    const { result, report } = await runMedia(dir, 'playback-disabled.json', {
      POC_MEDIA_TEST_DISABLE_PLAYBACK: '1',
    });
    expect(result.status).toBe(1);
    const playbackError = report.errors.find((error: any) => error.code === 'VIDEO_PLAYBACK_FAILED');
    expect(playbackError).toBeTruthy();
    const video = report.media.find((item: any) => item.kind === 'video');
    expect(video.video.playback.playResolved).toBe(true);
    expect(video.video.playback.deltaMs).toBe(0);
    expect(video.video.played).toBe(false);
  });

  testSlow('Subtitle text that differs from the bound script is rejected', async () => {
    const dir = makePackage([videoAsset('good-1080x1920-15s.mp4'), subtitleAsset('wrong-text.vtt')]);
    const { result, report } = await runMedia(dir);
    expect(result.status).toBe(1);
    expect(report.errors.map((error: any) => error.code)).toContain('SUBTITLE_TEXT_MISMATCH');
  });

  testSlow('Subtitle with missing or extra cues is rejected', async () => {
    const missing = makePackage([videoAsset('good-1080x1920-15s.mp4'), subtitleAsset('missing-cue.vtt')]);
    const missingResult = await runMedia(missing);
    expect(missingResult.result.status).toBe(1);
    expect(missingResult.report.errors.map((error: any) => error.code)).toContain('SUBTITLE_CUE_COUNT_MISMATCH');

    const extra = makePackage([videoAsset('good-1080x1920-15s.mp4'), subtitleAsset('extra-cue.vtt')]);
    const extraResult = await runMedia(extra);
    expect(extraResult.result.status).toBe(1);
    expect(extraResult.report.errors.map((error: any) => error.code)).toContain('SUBTITLE_CUE_COUNT_MISMATCH');
  });

  testSlow('Overlapping/unsorted subtitle cues and wrong-language text are rejected', async () => {
    const unordered = makePackage([videoAsset('good-1080x1920-15s.mp4'), subtitleAsset('unordered.vtt')]);
    const unorderedResult = await runMedia(unordered);
    expect(unorderedResult.result.status).toBe(1);
    expect(unorderedResult.report.errors.map((error: any) => error.code)).toContain('SUBTITLE_ORDER_INVALID');

    const wrongLanguage = makePackage([videoAsset('good-1080x1920-15s.mp4'), subtitleAsset('wrong-language.vtt')]);
    const languageResult = await runMedia(wrongLanguage);
    expect(languageResult.result.status).toBe(1);
    expect(languageResult.report.errors.map((error: any) => error.code)).toContain('SUBTITLE_TEXT_MISMATCH');
  });

  testSlow('Extra MM:SS cue is counted and rejected (main-control recheck case)', async () => {
    const dir = makePackage([videoAsset('good-1080x1920-15s.mp4'), subtitleAsset('mixed-formats-extra.vtt')], {
      subtitles: [{ id: 'scn-scent-layering.subtitle.test-only', startMs: 0, endMs: 1000, text: 'Expected' }],
    });
    const { result, report } = await runMedia(dir);
    expect(result.status).toBe(1);
    const subtitle = report.media.find((item: any) => item.kind === 'subtitle');
    expect(subtitle.subtitle.cues).toBe(2);
    expect(subtitle.subtitle.textMatched).toBe(false);
    expect(report.errors.map((error: any) => error.code)).toContain('SUBTITLE_CUE_COUNT_MISMATCH');
  });

  testSlow('Mixed valid and invalid cue timing fails instead of silently dropping the bad cue', async () => {
    const dir = makePackage([videoAsset('good-1080x1920-15s.mp4'), subtitleAsset('mixed-invalid-time.vtt')]);
    const { result, report } = await runMedia(dir);
    expect(result.status).toBe(1);
    expect(report.errors.map((error: any) => error.code)).toContain('SUBTITLE_TIME_INVALID');
    expect(report.media.find((item: any) => item.kind === 'subtitle').subtitle.textMatched).toBe(false);
  });

  testSlow('Illegal time components are rejected explicitly', async () => {
    const dir = makePackage([videoAsset('good-1080x1920-15s.mp4'), subtitleAsset('illegal-time-components.vtt')]);
    const { result, report } = await runMedia(dir);
    expect(result.status).toBe(1);
    expect(report.errors.map((error: any) => error.code)).toContain('SUBTITLE_TIME_INVALID');
  });

  testSlow('Legal NOTE/STYLE/REGION blocks are recognized and not counted as cues', async () => {
    const dir = makePackage([videoAsset('good-1080x1920-15s.mp4'), subtitleAsset('legal-noncue.vtt')]);
    const { result, report } = await runMedia(dir);
    expect(result.status, result.stdout + result.stderr).toBe(0);
    const subtitle = report.media.find((item: any) => item.kind === 'subtitle');
    expect(subtitle.subtitle.cues).toBe(3);
    expect(subtitle.subtitle.textMatched).toBe(true);
  });

  testSlow('Unknown non-cue block is rejected, not silently skipped', async () => {
    const dir = makePackage([videoAsset('good-1080x1920-15s.mp4'), subtitleAsset('unknown-block.vtt')]);
    const { result, report } = await runMedia(dir);
    expect(result.status).toBe(1);
    expect(report.errors.map((error: any) => error.code)).toContain('SUBTITLE_BLOCK_UNRECOGNIZED');
  });

  testSlow('Main-control two-cue/one-cue recheck shape exits 1 with textMatched=false', async () => {
    const dir = makePackage([subtitleAsset('mixed-formats-extra.vtt')], {
      subtitles: [{ id: 'scn-scent-layering.subtitle.test-only', startMs: 0, endMs: 1000, text: 'Expected' }],
    });
    const { result, report } = await runMedia(dir);
    expect(result.status).toBe(1);
    const subtitle = report.media.find((item: any) => item.kind === 'subtitle');
    expect(subtitle.subtitle.cues).toBe(2);
    expect(subtitle.subtitle.scriptVersionId).toBe('scn-scent-layering.scriptversion.test-en');
    expect(subtitle.subtitle.textMatched).toBe(false);
    expect(report.errors.map((error: any) => error.code)).toContain('SUBTITLE_CUE_COUNT_MISMATCH');
    expect(report.errors.every((error: any) => error.file === 'assets.json' && error.jsonPointer.startsWith('/data/assets/'))).toBe(true);
  });

  testSlow('missing scenario package is NOT_RUN (exit 2) and produces no media report', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'poc-002-missing-'));
    tempDirs.push(root);
    const reportPath = path.join(root, 'report.json');
    const result = spawnSync(
      process.execPath,
      [CLI, '--dir', path.join(root, 'nope'), '--base-url', baseUrl, '--report', reportPath],
      { cwd: ROOT, encoding: 'utf8', timeout: 30_000 },
    );
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('NOT_RUN');
    expect(existsSync(reportPath)).toBe(false);
  });
});


