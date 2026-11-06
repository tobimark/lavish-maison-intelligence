#!/usr/bin/env node
/*
 * POC-002 media verifier.
 *
 * Read-only L5 checks for a scenario package's same-origin static media:
 *   HTTP GET (no external redirects), Content-Type/MIME, byte count + SHA-256,
 *   container signature, browser metadata/decode/play/seek, poster decode,
 *   WebVTT cue ranges, and optional local ffprobe codec/pixel-format checks.
 *
 * It never renders, transcodes, sends email or calls an external service.
 * `ffprobe` is optional: if absent, L5 is reported NOT_RUN (never PASS).
 *
 * Usage:
 *   node scripts/poc/verify-media.mjs --dir <scenario-version-dir> \
 *     --base-url http://127.0.0.1:3100 --report evidence/poc/media-a.json
 *
 * Exit codes: 0 = no detected failure (may still be not_run when ffprobe is
 * missing); 1 = validation failure; 2 = usage / IO / environment error.
 */

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const MEDIA_PREFIX = '/scenario-media/';
const SCHEMA_VERSION = '1.0.0';
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.vtt': 'text/vtt',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
};

const usage = `Usage:
  node scripts/poc/verify-media.mjs --dir <scenario-version-dir> --base-url <http://127.0.0.1:PORT> --report <path> [--ffprobe <path>]`;

function issue(code, jsonPointer, message, file = 'assets.json') {
  return { code, file, jsonPointer, message };
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function parseArgs(argv) {
  const options = { dir: null, baseUrl: null, report: null, ffprobe: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (['--dir', '--base-url', '--report', '--ffprobe'].includes(arg)) {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        console.error(`${arg} requires a value.`);
        console.error(usage);
        process.exit(2);
      }
      index += 1;
      if (arg === '--dir') options.dir = value;
      if (arg === '--base-url') options.baseUrl = value.replace(/\/+$/, '');
      if (arg === '--report') options.report = value;
      if (arg === '--ffprobe') options.ffprobe = value;
      continue;
    }
    console.error(`Unknown argument: ${arg}`);
    console.error(usage);
    process.exit(2);
  }
  if (!options.dir || !options.baseUrl) {
    console.error('Both --dir and --base-url are required.');
    console.error(usage);
    process.exit(2);
  }
  return options;
}

function assertLocalBaseUrl(baseUrl) {
  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    console.error(`Invalid --base-url: ${baseUrl}`);
    process.exit(2);
  }
  if (!['http:', 'https:'].includes(url.protocol) || !LOCAL_HOSTS.has(url.hostname)) {
    console.error('--base-url must point at a local host (127.0.0.1/localhost/::1); external servers are not allowed.');
    process.exit(2);
  }
  return url;
}

export function detectSignature(bytes, mimeType) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 12) return false;
  const ascii = (start, end) => bytes.toString('ascii', start, end);
  switch (mimeType) {
    case 'image/png':
      return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/jpeg':
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case 'image/webp':
      return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
    case 'video/mp4':
      return ascii(4, 8) === 'ftyp';
    case 'text/vtt':
      return bytes.toString('utf8').replace(/^\uFEFF/, '').trimStart().startsWith('WEBVTT');
    case 'audio/mpeg':
      return ascii(0, 3) === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
    case 'audio/mp4':
      return ascii(4, 8) === 'ftyp';
    default:
      return true;
  }
}

function normalizeCueText(text) {
  return text.normalize('NFC').replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').trim();
}

function parseVttTimestamp(value) {
  // Explicit VTT subset: HH:MM:SS.mmm (hours may be 2+ digits) and MM:SS.mmm.
  // Anything else is rejected explicitly; malformed cues are never skipped.
  const match = /^(\d{2,}):([0-5]\d)(?::([0-5]\d))?\.(\d{3})$/.exec(value);
  if (!match) return null;
  if (match[3] !== undefined) {
    return (
      Number(match[1]) * 3_600_000 +
      Number(match[2]) * 60_000 +
      Number(match[3]) * 1000 +
      Number(match[4])
    );
  }
  return Number(match[1]) * 60_000 + Number(match[2]) * 1000 + Number(match[4]);
}

export function parseVtt(text, expectedDurationMs) {
  const issues = [];
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const blocks = normalized.split(/\n{2,}/).filter((block) => block.trim() !== '');

  if (!normalized.trimStart().startsWith('WEBVTT')) {
    issues.push({ code: 'SUBTITLE_FORMAT', message: 'Subtitle file does not start with WEBVTT.' });
  }

  const cues = [];
  for (const [blockIndex, rawBlock] of blocks.entries()) {
    const lines = rawBlock.replace(/\n+$/, '').split('\n');
    const firstLine = (lines[0] ?? '').trim();

    if (blockIndex === 0 && firstLine.startsWith('WEBVTT')) {
      continue; // legal header block, including optional WEBVTT metadata lines
    }

    // Legal non-cue blocks: NOTE (with optional text), STYLE and REGION.
    if (
      firstLine === 'NOTE' ||
      firstLine.startsWith('NOTE ') ||
      firstLine.startsWith('NOTE\t') ||
      firstLine === 'STYLE' ||
      firstLine === 'REGION'
    ) {
      continue;
    }

    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex === -1) {
      issues.push({
        code: 'SUBTITLE_BLOCK_UNRECOGNIZED',
        message: `Block ${blockIndex + 1} is neither a cue nor a legal NOTE/STYLE/REGION block; it cannot be ignored.`,
      });
      continue;
    }
    if (timingIndex > 1) {
      issues.push({
        code: 'SUBTITLE_CUE_STRUCTURE',
        message: `Block ${blockIndex + 1} has ${timingIndex} line(s) before its timing line; only an optional single cue identifier is allowed.`,
      });
      continue;
    }

    const timingLine = lines[timingIndex].trim();
    const timingParts = timingLine.split('-->');
    if (timingParts.length !== 2) {
      issues.push({ code: 'SUBTITLE_TIME_INVALID', message: `Cue timing line has an invalid arrow structure: ${JSON.stringify(timingLine)}.` });
      continue;
    }
    const startMs = parseVttTimestamp(timingParts[0].trim());
    const endToken = (timingParts[1].trim().split(/\s+/)[0] ?? '');
    const endMs = parseVttTimestamp(endToken);
    if (startMs === null || endMs === null) {
      issues.push({
        code: 'SUBTITLE_TIME_INVALID',
        message: `Cue timing line uses an unsupported/invalid timestamp: ${JSON.stringify(timingLine)}. Supported formats: HH:MM:SS.mmm or MM:SS.mmm.`,
      });
      continue;
    }
    if (!(startMs >= 0 && endMs > startMs)) {
      issues.push({ code: 'SUBTITLE_RANGE_INVALID', message: `Cue ${startMs}-${endMs}ms is not a valid range.` });
    }
    if (Number.isFinite(expectedDurationMs) && endMs > expectedDurationMs + 50) {
      issues.push({
        code: 'SUBTITLE_RANGE_INVALID',
        message: `Cue ends at ${endMs}ms beyond the expected ${expectedDurationMs}ms media duration.`,
      });
    }
    cues.push({
      startMs,
      endMs,
      text: normalizeCueText(lines.slice(timingIndex + 1).join('\n')),
    });
  }

  if (!cues.length) {
    issues.push({ code: 'SUBTITLE_EMPTY', message: 'Subtitle file has no parseable cues.' });
  }
  for (let index = 1; index < cues.length; index += 1) {
    if (cues[index].startMs < cues[index - 1].endMs) {
      issues.push({
        code: 'SUBTITLE_ORDER_INVALID',
        message: `Cue ${index + 1} starts at ${cues[index].startMs}ms before cue ${index} ends at ${cues[index - 1].endMs}ms (overlap/unsorted).`,
      });
    }
  }
  return { cues, issues };
}

export function evaluateSeekSamples(samples, expectedDurationMs) {
  const issues = [];
  for (const sample of samples) {
    if (!sample.seeked || Math.abs(sample.actualMs - sample.targetMs) > 1000) {
      issues.push({
        code: 'VIDEO_SEEK_FAILED',
        message: `Seek to ${sample.targetMs}ms did not settle (seeked=${Boolean(sample.seeked)}, actual=${sample.actualMs}ms).`,
      });
    }
  }
  if (expectedDurationMs && expectedDurationMs <= 0) {
    issues.push({ code: 'VIDEO_DURATION_INVALID', message: 'Expected video duration must be positive.' });
  }
  return issues;
}

export function parseFfprobeJson(data, expected = {}) {
  const issues = [];
  const streams = Array.isArray(data?.streams) ? data.streams : [];
  const video = streams.find((stream) => stream.codec_type === 'video');
  const audio = streams.find((stream) => stream.codec_type === 'audio');
  if (!video) {
    issues.push({ code: 'FFPROBE_VIDEO_STREAM_MISSING', message: 'ffprobe found no video stream.' });
  } else {
    if (video.codec_name !== 'h264') {
      issues.push({ code: 'FFPROBE_CODEC_INVALID', message: `Expected H.264, found ${video.codec_name}.` });
    }
    if (video.pix_fmt !== 'yuv420p') {
      issues.push({ code: 'FFPROBE_PIXEL_FORMAT_INVALID', message: `Expected yuv420p, found ${video.pix_fmt}.` });
    }
    if (expected.width && video.width !== expected.width) {
      issues.push({ code: 'FFPROBE_WIDTH_INVALID', message: `Expected width ${expected.width}, found ${video.width}.` });
    }
    if (expected.height && video.height !== expected.height) {
      issues.push({ code: 'FFPROBE_HEIGHT_INVALID', message: `Expected height ${expected.height}, found ${video.height}.` });
    }
  }
  if (audio && audio.codec_name !== 'aac') {
    issues.push({ code: 'FFPROBE_AUDIO_CODEC_INVALID', message: `Expected AAC audio, found ${audio.codec_name}.` });
  }
  const rawDuration = data?.format?.duration;
  const formatDurationMs = Number.parseFloat(rawDuration);
  if (rawDuration === undefined || rawDuration === null || String(rawDuration).trim() === '' || !Number.isFinite(formatDurationMs) || formatDurationMs <= 0) {
    issues.push({
      code: 'FFPROBE_DURATION_INVALID',
      message: `ffprobe must report a finite positive format duration; found ${JSON.stringify(rawDuration)}.`,
    });
  } else if (expected.durationMs && Math.abs(formatDurationMs * 1000 - expected.durationMs) > 100) {
    issues.push({
      code: 'FFPROBE_DURATION_INVALID',
      message: `Expected ${expected.durationMs}ms, found ${Math.round(formatDurationMs * 1000)}ms (tolerance 100ms).`,
    });
  }
  return issues;
}

export function findFfprobe(explicitPath) {
  const candidates = [
    explicitPath,
    process.env.FFPROBE_PATH,
    process.env.FFPROBE,
    process.platform === 'win32' ? 'C:\\ffmpeg\\bin\\ffprobe.exe' : '/usr/bin/ffprobe',
    process.platform === 'win32' ? 'C:\\Program Files\\ffmpeg\\bin\\ffprobe.exe' : '/usr/local/bin/ffprobe',
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  const lookup = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(lookup, ['ffprobe'], { encoding: 'utf8' });
  if (result.status === 0) {
    const first = result.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
    if (first && existsSync(first)) return first;
  }
  return null;
}

async function fetchAsset(baseUrl, assetUri) {
  if (typeof assetUri !== 'string' || !assetUri.startsWith(MEDIA_PREFIX)) {
    return { error: issue('MEDIA_URI_INVALID', '/uri', `Asset uri ${JSON.stringify(assetUri)} is not a same-origin ${MEDIA_PREFIX} path.`) };
  }
  if (/%|\\|[?#]/.test(assetUri)) {
    return { error: issue('PATH_TRAVERSAL', '/uri', 'Asset uri must not contain percent-encoding, backslashes, query or fragment components.') };
  }
  const assetSegments = assetUri.slice(MEDIA_PREFIX.length).split('/');
  if (assetSegments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    return { error: issue('PATH_TRAVERSAL', '/uri', 'Asset uri must not contain empty, "." or ".." path segments.') };
  }
  let current = new URL(assetUri, `${baseUrl}/`);
  const baseOrigin = new URL(baseUrl).origin;
  if (current.origin !== baseOrigin) {
    return { error: issue('MEDIA_URI_EXTERNAL', '/uri', `Asset uri origin ${current.origin} does not match base origin ${baseOrigin}.`) };
  }
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetch(current.href, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
    const status = response.status;
    if (status >= 300 && status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        return { error: issue('EXTERNAL_REDIRECT', '/uri', `HTTP ${status} without a Location header.`) };
      }
      const target = new URL(location, current.href);
      if (target.origin !== baseOrigin) {
        return {
          error: issue(
            'EXTERNAL_REDIRECT',
            '/uri',
            `Asset redirects to a different origin (${target.origin}); same-origin scheme/host/port is required.`,
          ),
        };
      }
      current = target;
      continue;
    }
    const body = Buffer.from(await response.arrayBuffer());
    return {
      response,
      body,
      finalUrl: current,
      contentType: (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase(),
    };
  }
  return { error: issue('EXTERNAL_REDIRECT', '/uri', 'Too many redirects.') };
}

async function imageMetadata(page, url) {
  return page.evaluate(async (source) => {
    return await new Promise((resolve) => {
      const image = new Image();
      const timer = setTimeout(() => resolve({ error: 'timeout' }), 8000);
      image.onload = () => {
        clearTimeout(timer);
        resolve({ width: image.naturalWidth, height: image.naturalHeight });
      };
      image.onerror = () => {
        clearTimeout(timer);
        resolve({ error: 'decode-failed' });
      };
      image.src = source;
    });
  }, url);
}

async function videoMetadata(page, url, expectedDurationMs, seekTargetsMs) {
  return page.evaluate(async ({ source, expectedMs, targets }) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = source;
    document.body.appendChild(video);
    try {
      const loaded = await new Promise((resolve) => {
        const timer = setTimeout(() => resolve({ event: 'timeout' }), 12000);
        video.addEventListener(
          'loadedmetadata',
          () => {
            clearTimeout(timer);
            resolve({ event: 'loadedmetadata' });
          },
          { once: true },
        );
        video.addEventListener(
          'error',
          () => {
            clearTimeout(timer);
            resolve({ event: 'error', code: video.error?.code, message: video.error?.message });
          },
          { once: true },
        );
      });
      if (loaded.event !== 'loadedmetadata') return loaded;

      const result = {
        event: 'loadedmetadata',
        durationMs: Math.round(video.duration * 1000),
        width: video.videoWidth,
        height: video.videoHeight,
        seekableRanges: video.seekable.length,
        canPlayReady: video.readyState >= 2,
        startAtZero: Math.abs(video.currentTime) < 0.05,
        seekTargets: [],
        seeks: [],
        playback: null,
        played: false,
        errorCode: video.error?.code ?? null,
      };

      if (!result.canPlayReady) {
        result.canPlayReady = await new Promise((resolve) => {
          const timer = setTimeout(() => resolve(false), 5000);
          video.addEventListener(
            'canplay',
            () => {
              clearTimeout(timer);
              resolve(true);
            },
            { once: true },
          );
        });
      }

      result.seekTargets = Array.isArray(targets) ? targets.map((value) => Math.round(value)) : [];
      for (const targetMs of result.seekTargets) {
        const seeked = await new Promise((resolve) => {
          const timer = setTimeout(() => resolve({ seeked: false }), 6000);
          video.addEventListener(
            'seeked',
            () => {
              clearTimeout(timer);
              resolve({ seeked: true });
            },
            { once: true },
          );
          video.currentTime = targetMs / 1000;
        });
        await new Promise((resolve) => setTimeout(resolve, 250));
        result.seeks.push({
          targetMs,
          seeked: seeked.seeked && Math.abs(Math.round(video.currentTime * 1000) - targetMs) <= 1000,
          actualMs: Math.round(video.currentTime * 1000),
        });
      }

      // Playback must actually advance from the pre-play position. Comparing
      // only `currentTime > 0` is invalid after a seek. If a controlled player
      // resolves play() without advancing, this must fail.
      const beforeMs = Math.round(video.currentTime * 1000);
      try {
        await video.play();
        await new Promise((resolve) => setTimeout(resolve, 400));
        const afterMs = Math.round(video.currentTime * 1000);
        const deltaMs = afterMs - beforeMs;
        result.playback = { beforeMs, afterMs, deltaMs, playResolved: true };
        result.played = result.canPlayReady && deltaMs >= 100 && (video.error?.code ?? null) === null;
        video.pause();
      } catch (error) {
        result.playback = {
          beforeMs,
          afterMs: Math.round(video.currentTime * 1000),
          deltaMs: 0,
          playResolved: false,
          error: error instanceof Error ? error.message : String(error),
        };
        result.played = false;
      }
      result.errorCode = video.error?.code ?? null;
      return result;
    } finally {
      video.remove();
    }
  }, { source: url, expectedMs: expectedDurationMs, targets: seekTargetsMs ?? [] });
}

function extMime(uri) {
  return MIME_BY_EXT[path.extname(uri).toLowerCase()] ?? null;
}

function expectedVideoFor(assetId, videoEntries) {
  return videoEntries.find((video) => video.mp4AssetId === assetId) ?? null;
}

async function verifyAsset({
  context,
  page,
  baseUrl,
  asset,
  index,
  videoEntries,
  scriptVersions,
}) {
  const errors = [];
  const pointer = `/data/assets/${index}`;
  const uri = asset?.uri;
  const media = {
    id: asset?.id ?? null,
    kind: asset?.kind ?? null,
    uri: uri ?? null,
    status: 'not_run',
  };
  const fetched = await fetchAsset(baseUrl, uri);
  if (fetched.error) {
    errors.push({ ...fetched.error, jsonPointer: `${pointer}/uri` });
    return { errors, media: { ...media, status: 'fail' } };
  }
  const { response, body, finalUrl, contentType } = fetched;
  media.httpStatus = response.status;
  media.finalUrl = finalUrl.href;
  media.contentType = contentType;
  media.bytes = body.length;
  media.sha256 = sha256(body);
  if (response.status !== 200) {
    errors.push(issue('MEDIA_HTTP_STATUS', `${pointer}/uri`, `Expected HTTP 200, got ${response.status}.`));
  }
  const expectedMime = asset?.mimeType;
  if (contentType && expectedMime && contentType !== expectedMime) {
    errors.push(issue('MEDIA_MIME_MISMATCH', `${pointer}/mimeType`, `Server Content-Type ${contentType} does not match asset mimeType ${expectedMime}.`));
  }
  if (asset?.bytes !== body.length) {
    errors.push(issue('MEDIA_BYTES_MISMATCH', `${pointer}/bytes`, `Asset records ${asset?.bytes} bytes; HTTP body is ${body.length} bytes.`));
  }
  const actualHash = sha256(body);
  if (asset?.sha256 !== actualHash) {
    errors.push(issue('MEDIA_HASH_MISMATCH', `${pointer}/sha256`, `Asset records ${asset?.sha256}; actual SHA-256 is ${actualHash}.`));
  }
  if (expectedMime && !detectSignature(body, expectedMime)) {
    errors.push(issue('MEDIA_SIGNATURE_MISMATCH', `${pointer}/uri`, `HTTP body signature does not match ${expectedMime}.`));
  }

  const mustSkipDecode = errors.length > 0;
  if (!mustSkipDecode) {
    if (['image/png', 'image/jpeg', 'image/webp'].includes(expectedMime)) {
      const metadata = await imageMetadata(page, finalUrl.href);
      media.image = metadata;
      if (metadata.error) {
        errors.push(issue('IMAGE_DECODE_FAILED', `${pointer}/uri`, `Browser image decode failed (${metadata.error}).`));
      } else {
        if (asset?.width !== null && asset?.width !== undefined && metadata.width !== asset.width) {
          errors.push(issue('IMAGE_WIDTH_MISMATCH', `${pointer}/width`, `Asset records width ${asset.width}; decoded ${metadata.width}.`));
        }
        if (asset?.height !== null && asset?.height !== undefined && metadata.height !== asset.height) {
          errors.push(issue('IMAGE_HEIGHT_MISMATCH', `${pointer}/height`, `Asset records height ${asset.height}; decoded ${metadata.height}.`));
        }
      }
    }

    if (expectedMime === 'video/mp4') {
      const ownerVideo = expectedVideoFor(asset?.id, videoEntries);
      const ownerScript = ownerVideo
        ? scriptVersions.find((version) => version?.id === ownerVideo.scriptVersionId)
        : null;
      const expectedDurationMs = ownerScript?.durationMs ?? asset?.durationMs ?? ownerVideo?.durationMs ?? 15000;
      const shotStarts = Array.isArray(ownerScript?.shots)
        ? ownerScript.shots
            .map((shot) => Number(shot?.startMs))
            .filter((value) => Number.isFinite(value))
        : [];
      if (!ownerVideo) {
        errors.push(issue('VIDEO_SCRIPT_MISSING', `${pointer}/uri`, 'No video.json entry binds this MP4 asset to a scriptVersion.'));
      }
      if (!ownerScript) {
        errors.push(issue('VIDEO_SCRIPT_MISSING', `${pointer}/uri`, 'The bound ScriptVersion was not found; shot-based seek cannot be claimed.'));
      }
      if (!ownerScript || shotStarts.length < 4) {
        errors.push(
          issue(
            'VIDEO_SCRIPT_SHOTS_MISSING',
            `${pointer}/uri`,
            'The bound script must expose four shot startMs values; shot-point seeking was not performed.',
          ),
        );
      } else if (shotStarts[0] !== 0) {
        errors.push(issue('VIDEO_SHOT_START_INVALID', `${pointer}/uri`, `First shot must start at 0ms, found ${shotStarts[0]}ms.`));
      }
      const seekTargets = shotStarts.length >= 4
        ? [...shotStarts.slice(1).filter((value) => value > 0), Math.max(0, expectedDurationMs - 500)]
        : [];
      media.video = { shotStartsMs: shotStarts, seekTargetsMs: seekTargets };
      const metadata = await videoMetadata(page, finalUrl.href, expectedDurationMs, seekTargets);
      media.video = { ...media.video, ...metadata };
      if (metadata.event === 'error') {
        errors.push(issue('VIDEO_DECODE_FAILED', `${pointer}/uri`, `Browser video decode failed (code ${metadata.code}: ${metadata.message ?? 'unknown'}).`));
      } else if (metadata.event !== 'loadedmetadata') {
        errors.push(issue('VIDEO_DECODE_FAILED', `${pointer}/uri`, `Browser video metadata timed out (${metadata.event}).`));
      } else {
        if (!metadata.canPlayReady) {
          errors.push(issue('VIDEO_CANPLAY_TIMEOUT', `${pointer}/uri`, 'Video did not reach canplay before the timeout; cannot treat it as ready.'));
        }
        if (shotStarts.length >= 4 && metadata.startAtZero !== true) {
          errors.push(issue('VIDEO_START_NOT_ZERO', `${pointer}/uri`, `Expected first shot at 0ms but browser started at ${metadata.startAtZero}.`));
        }
        if (metadata.seekableRanges < 1) {
          errors.push(issue('VIDEO_UNSEEKABLE', `${pointer}/uri`, 'Video reports no seekable ranges.'));
        }
        if (seekTargets.length && (!Array.isArray(metadata.seeks) || metadata.seeks.length !== seekTargets.length)) {
          errors.push(issue('VIDEO_SEEK_FAILED', `${pointer}/uri`, 'Shot-based seek checks were not executed for every target.'));
        }
        errors.push(
          ...evaluateSeekSamples(metadata.seeks, expectedDurationMs).map((item) => ({
            ...item,
            file: 'assets.json',
            jsonPointer: `${pointer}/uri`,
          })),
        );
        if (!metadata.played) {
          const playback = metadata.playback ?? {};
          errors.push(
            issue(
              'VIDEO_PLAYBACK_FAILED',
              `${pointer}/uri`,
              `Video did not advance after play() (before=${playback.beforeMs}ms, after=${playback.afterMs}ms, delta=${playback.deltaMs}ms, playResolved=${playback.playResolved}).`,
            ),
          );
        }
        if (Number.isFinite(expectedDurationMs) && Math.abs(metadata.durationMs - expectedDurationMs) > 100) {
          errors.push(
            issue(
              'VIDEO_DURATION_MISMATCH',
              `${pointer}/durationMs`,
              `Expected ${expectedDurationMs}ms, browser reported ${metadata.durationMs}ms (tolerance 100ms).`,
            ),
          );
        }
        if (asset?.width !== null && asset?.width !== undefined && metadata.width !== asset.width) {
          errors.push(issue('VIDEO_WIDTH_MISMATCH', `${pointer}/width`, `Asset records width ${asset.width}; decoded ${metadata.width}.`));
        }
        if (asset?.height !== null && asset?.height !== undefined && metadata.height !== asset.height) {
          errors.push(issue('VIDEO_HEIGHT_MISMATCH', `${pointer}/height`, `Asset records height ${asset.height}; decoded ${metadata.height}.`));
        }
      }
    }

    if (expectedMime === 'text/vtt') {
      const ownerVideo = videoEntries.find((video) => Array.isArray(video?.subtitleAssetIds) && video.subtitleAssetIds.includes(asset?.id));
      const ownerScript = ownerVideo
        ? scriptVersions.find((version) => version?.id === ownerVideo.scriptVersionId)
        : null;
      const expectedDurationMs = ownerScript?.durationMs ?? ownerVideo?.durationMs ?? 15000;
      const text = body.toString('utf8');
      const parsed = parseVtt(text, expectedDurationMs);
      media.subtitle = {
        cues: parsed.cues.length,
        scriptVersionId: ownerScript?.id ?? null,
        textMatched: false,
        parseErrors: parsed.issues.map((item) => item.code),
      };
      for (const subtitleIssue of parsed.issues) {
        errors.push(issue(subtitleIssue.code, `${pointer}/uri`, subtitleIssue.message));
      }
      if (!ownerVideo || !ownerScript) {
        errors.push(
          issue(
            'SUBTITLE_SCRIPT_MISSING',
            `${pointer}/uri`,
            'No exact bound video/scriptVersion owns this subtitle; text matching against the script cannot be claimed.',
          ),
        );
      } else {
        const expectedCues = Array.isArray(ownerScript.subtitles) ? ownerScript.subtitles : [];
        if (parsed.cues.length !== expectedCues.length) {
          errors.push(
            issue(
              'SUBTITLE_CUE_COUNT_MISMATCH',
              `${pointer}/uri`,
              `Subtitle has ${parsed.cues.length} cue(s); bound script ${ownerScript.id} has ${expectedCues.length}.`,
            ),
          );
        }
        const compareCount = Math.min(parsed.cues.length, expectedCues.length);
        let allMatched = parsed.issues.length === 0 && parsed.cues.length === expectedCues.length;
        for (let cueIndex = 0; cueIndex < compareCount; cueIndex += 1) {
          const actual = parsed.cues[cueIndex];
          const expected = expectedCues[cueIndex];
          if (actual.startMs !== expected.startMs || actual.endMs !== expected.endMs) {
            errors.push(
              issue(
                'SUBTITLE_TIMECODE_MISMATCH',
                `${pointer}/uri`,
                `Cue ${cueIndex + 1} timecode ${actual.startMs}-${actual.endMs}ms does not match script ${expected.startMs}-${expected.endMs}ms.`,
              ),
            );
            allMatched = false;
          }
          if (actual.text !== normalizeCueText(String(expected.text ?? ''))) {
            errors.push(
              issue(
                'SUBTITLE_TEXT_MISMATCH',
                `${pointer}/uri`,
                `Cue ${cueIndex + 1} text does not match bound script ${ownerScript.id}.`,
              ),
            );
            allMatched = false;
          }
        }
        media.subtitle.textMatched = allMatched;
      }
    }
  }

  media.status = errors.length ? 'fail' : 'pass';
  return { errors, media };
}

async function runFfprobe(ffprobePath, asset, body, pointer, expected) {
  if (!ffprobePath) return { status: 'not_run', issues: [] };
  const tempFile = path.join(tmpdir(), `poc-media-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.media`);
  writeFileSync(tempFile, body);
  try {
    const result = spawnSync(
      ffprobePath,
      ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', tempFile],
      { encoding: 'utf8', timeout: 20_000 },
    );
    if (result.status !== 0) {
      return {
        status: 'fail',
        issues: [
          issue('FFPROBE_FAILED', pointer, `ffprobe exited ${result.status}: ${(result.stderr ?? '').trim() || 'no output'}`),
        ],
      };
    }
    let data;
    try {
      data = JSON.parse(result.stdout);
    } catch {
      return { status: 'fail', issues: [issue('FFPROBE_OUTPUT_INVALID', pointer, 'ffprobe did not return JSON.')] };
    }
    const issues = parseFfprobeJson(data, expected).map((item) => ({
      ...item,
      jsonPointer: pointer,
    }));
    return { status: issues.length ? 'fail' : 'pass', issues };
  } finally {
    try {
      writeFileSync(tempFile, '');
    } catch {
      // ignore cleanup failure
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const baseUrl = assertLocalBaseUrl(options.baseUrl);
  const dir = path.resolve(process.cwd(), options.dir);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    console.error('NOT_RUN: scenario directory not found — the complete customer package/media has not been received; no media PASS is claimed.');
    process.exit(2);
  }
  const manifestPath = path.join(dir, 'manifest.json');
  const assetsPath = path.join(dir, 'assets.json');
  if (!existsSync(manifestPath) || !existsSync(assetsPath)) {
    console.error('NOT_RUN: manifest.json and assets.json are required to verify media; no complete package was supplied.');
    process.exit(2);
  }

  const manifestBytes = readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const assetsFile = JSON.parse(readFileSync(assetsPath, 'utf8'));
  const assets = Array.isArray(assetsFile?.data?.assets) ? assetsFile.data.assets : null;
  if (!assets) {
    console.error('NOT_RUN: assets.json has no data.assets array; no complete package was supplied.');
    process.exit(2);
  }
  const packageHash = sha256(manifestBytes);

  let videoEntries = [];
  let scriptVersions = [];
  for (const [fileName, dataKey] of [
    ['video.json', 'videos'],
    ['script.json', 'versions'],
  ]) {
    const fullPath = path.join(dir, fileName);
    if (!existsSync(fullPath)) continue;
    try {
      const parsed = JSON.parse(readFileSync(fullPath, 'utf8'));
      if (fileName === 'video.json') videoEntries = parsed?.data?.[dataKey] ?? [];
      else scriptVersions = parsed?.data?.[dataKey] ?? [];
    } catch {
      // Media verification reports structure issues elsewhere; keep going with assets-only checks.
    }
  }

  const errors = [];
  const warnings = [];
  const mediaResults = [];
  const ffprobePath = findFfprobe(options.ffprobe);
  if (!ffprobePath) {
    warnings.push(
      'ffprobe is NOT_RUN: no local ffprobe executable was found. Browser metadata/playback/seek checks still run, but L5 cannot be reported as PASS without codec/pixel-format/duration probing.',
    );
  }

  const browser = await chromium.launch({ headless: true });
  let probeAttempted = false;
  let probeFailed = false;
  try {
    const context = await browser.newContext();
    // Browser-side same-origin guard: media/font/script subresources may only
    // come from the scenario server origin. External requests are aborted
    // before they leave the browser.
    await context.route('**/*', (route) => {
      const requestUrl = new URL(route.request().url());
      if (requestUrl.origin === baseUrl.origin || requestUrl.protocol === 'data:') {
        route.continue();
      } else {
        route.abort();
      }
    });
    if (process.env.POC_MEDIA_TEST_DISABLE_PLAYBACK === '1') {
      // Test-only seam used by the regression suite to prove a controlled
      // play() that resolves without advancing is rejected.
      await context.addInitScript(() => {
        HTMLMediaElement.prototype.play = function playWithoutAdvancing() {
          return Promise.resolve();
        };
      });
    }
    const page = await context.newPage();
    // Use the scenario server's origin as the document origin so images/videos
    // are same-origin subresources (an about:blank document blocks them in
    // Chromium). A 404 root is fine: the origin is what matters.
    await page.goto(`${baseUrl.origin}/`, { waitUntil: 'domcontentloaded' }).catch(() => {});

    for (const [index, asset] of assets.entries()) {
      const result = await verifyAsset({ context, page, baseUrl, asset, index, videoEntries, scriptVersions });
      errors.push(...result.errors);
      mediaResults.push(result.media);

      if (ffprobePath && asset?.mimeType === 'video/mp4') {
        const fetched = await fetchAsset(baseUrl, asset?.uri);
        if (fetched.body) {
          probeAttempted = true;
          const pointer = `/data/assets/${index}`;
          const ownerVideo = expectedVideoFor(asset?.id, videoEntries);
          const ownerScript = ownerVideo
            ? scriptVersions.find((version) => version?.id === ownerVideo.scriptVersionId)
            : null;
          const probe = await runFfprobe(ffprobePath, asset, fetched.body, pointer, {
            width: asset?.width,
            height: asset?.height,
            durationMs: ownerScript?.durationMs ?? asset?.durationMs ?? ownerVideo?.durationMs,
          });
          mediaResults[mediaResults.length - 1].ffprobe = probe.status;
          if (probe.status === 'fail') probeFailed = true;
          errors.push(...probe.issues);
        }
      }
    }

    await context.close();
  } finally {
    await browser.close();
  }

  const l5Status = errors.length ? 'fail' : ffprobePath ? 'pass' : 'not_run';
  if (errors.length) {
    // keep the structured failures; L5 is fail
  } else if (!ffprobePath) {
    warnings.push('L5 is NOT_RUN because ffprobe is missing; do not treat browser-only results as full media PASS.');
  }
  if (probeFailed) warnings.push('ffprobe failed for at least one video; see errors for exact asset pointers.');

  const report = {
    schemaVersion: SCHEMA_VERSION,
    checkedAt: new Date().toISOString(),
    scope: 'scenario',
    scenarioId: manifest?.scenarioId ?? null,
    scenarioVersion: manifest?.scenarioVersion ?? null,
    packageHash,
    layers: [
      { name: 'L1', status: 'not_run' },
      { name: 'L2', status: 'not_run' },
      { name: 'L3', status: 'not_run' },
      { name: 'L4', status: 'not_run' },
      { name: 'L5', status: l5Status },
    ],
    errors,
    warnings,
    runnable: false,
    media: mediaResults,
    baseUrl: `${baseUrl.protocol}//${baseUrl.host}`,
    ffprobe: ffprobePath ? 'available' : 'not_run',
    probeAttempted,
  };

  if (options.report) {
    const reportPath = path.resolve(process.cwd(), options.report);
    mkdirSync(path.dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`Report written to ${reportPath}`);
  }

  console.log(`Scenario: ${report.scenarioId ?? '(unknown)'} ${report.scenarioVersion ?? ''}`);
  console.log(`Package hash: ${packageHash}`);
  console.log(`L5: ${l5Status}; ffprobe: ${report.ffprobe}; runnable=false`);
  for (const item of errors) console.log(`- [${item.code}] ${item.file}${item.jsonPointer}: ${item.message}`);
  for (const warning of warnings) console.log(`! ${warning}`);
  process.exit(errors.length ? 1 : 0);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(`Media verification failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
    process.exit(2);
  });
}
