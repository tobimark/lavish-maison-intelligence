#!/usr/bin/env node
/**
 * AS-001 · Validate the user-provided SERENITY assets and their sidecar mapping.
 *
 * This validator deliberately checks the real files rather than trusting the
 * mapping: PNG signature/IHDR dimensions, MP4 box metadata (duration,
 * dimensions, frame rate, H.264/AAC, chroma format from SPS), byte sizes and
 * SHA-256, then serves the published root over a temporary local HTTP server to
 * verify status, MIME and byte-range support.
 *
 * It does not force the provided 10.08s / 720x960 / 3:4 clip into the frozen
 * 15s vertical schema. Pixel format is parsed from the H.264 SPS when present
 * and reported as "not_parsed" otherwise.
 */
import { createHash } from 'node:crypto';
import { createReadStream, readFileSync } from 'node:fs';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MIME_BY_EXTENSION = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.vtt': 'text/vtt',
};
const ROLE_VALUES = ['hero', 'product_identity', 'storyboard_source', 'final_preview', 'deliverable_asset'];
const VISIBILITY_VALUES = ['overview', 'opportunity', 'campaign_brief', 'atelier', 'library', 'deliverables'];
const TYPE_VALUES = ['hero_image', 'product_original_image', 'final_preview_video'];

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export function parsePngHeader(buffer) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const signatureOk = signature.every((byte, index) => buffer[index] === byte);
  const ihdr = buffer.subarray(12, 16).toString('latin1') === 'IHDR';
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return {
    valid: signatureOk && ihdr,
    width: ihdr ? width : null,
    height: ihdr ? height : null,
    bitDepth: ihdr ? buffer[24] : null,
    colorType: ihdr ? buffer[25] : null,
    bytes: buffer.length,
    sha256: sha256(buffer),
  };
}

function readBoxes(buffer, start = 0, end = buffer.length) {
  const boxes = [];
  let offset = start;
  while (offset + 8 <= end) {
    let size = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('latin1');
    let header = 8;
    if (size === 1) {
      if (offset + 16 > end) break;
      const large = buffer.readBigUInt64BE(offset + 8);
      size = Number(large);
      header = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < header || offset + size > end) break;
    boxes.push({ type, start: offset, dataStart: offset + header, end: offset + size, size });
    offset += size;
  }
  return boxes;
}

function childBoxes(buffer, parent, wanted) {
  return readBoxes(buffer, parent.dataStart, parent.end).filter((box) => !wanted || wanted.includes(box.type));
}

function findPath(buffer, parent, types) {
  let current = parent;
  const trail = [];
  for (const wanted of types) {
    const next = childBoxes(buffer, current).find((box) => box.type === wanted);
    if (!next) return { box: null, trail };
    trail.push(wanted);
    current = next;
  }
  return { box: current, trail };
}

function readMvhd(buffer, box) {
  const version = buffer[box.dataStart];
  if (version === 1) {
    const timescale = buffer.readUInt32BE(box.dataStart + 20);
    const duration = Number(buffer.readBigUInt64BE(box.dataStart + 24));
    return { version, timescale, duration, durationMs: timescale ? Math.round((duration / timescale) * 1000) : null };
  }
  const timescale = buffer.readUInt32BE(box.dataStart + 12);
  const duration = buffer.readUInt32BE(box.dataStart + 16);
  return { version, timescale, duration, durationMs: timescale ? Math.round((duration / timescale) * 1000) : null };
}

function readTkhd(buffer, box) {
  const version = buffer[box.dataStart];
  const base = box.dataStart;
  const widthOffset = version === 1 ? 88 : 76;
  const heightOffset = version === 1 ? 92 : 80;
  const width = buffer.readUInt32BE(base + widthOffset) / 65536;
  const height = buffer.readUInt32BE(base + heightOffset) / 65536;
  const trackId = version === 1 ? buffer.readUInt32BE(base + 20) : buffer.readUInt32BE(base + 12);
  return { version, trackId, width, height };
}

function readMdhd(buffer, box) {
  const version = buffer[box.dataStart];
  if (version === 1) {
    return { timescale: buffer.readUInt32BE(box.dataStart + 20) };
  }
  return { timescale: buffer.readUInt32BE(box.dataStart + 12) };
}

function readHandlerType(buffer, box) {
  return buffer.subarray(box.dataStart + 8, box.dataStart + 12).toString('latin1');
}

function readSttsFps(buffer, sttsBox, timescale) {
  const entryCount = buffer.readUInt32BE(sttsBox.dataStart + 4);
  if (entryCount === 0) return null;
  const sampleCount = buffer.readUInt32BE(sttsBox.dataStart + 8);
  const sampleDelta = buffer.readUInt32BE(sttsBox.dataStart + 12);
  if (!sampleCount || !sampleDelta || !timescale) return null;
  return Math.round((timescale / sampleDelta) * 1000) / 1000;
}

function readStsdCodec(buffer, stsdBox) {
  const entryCount = buffer.readUInt32BE(stsdBox.dataStart + 4);
  if (!entryCount) return null;
  return buffer.subarray(stsdBox.dataStart + 12, stsdBox.dataStart + 16).toString('latin1');
}

function readAvcC(buffer, stsdBox) {
  const entriesStart = stsdBox.dataStart + 8;
  let offset = entriesStart;
  while (offset + 8 <= stsdBox.end) {
    const size = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('latin1');
    if (size < 8) break;
    if (type === 'avc1' || type === 'avc3') {
      const childStart = offset + 8 + 78; // VisualSampleEntry fixed fields
      const children = readBoxes(buffer, childStart, offset + size);
      const avcC = children.find((box) => box.type === 'avcC');
      return avcC ? { fourcc: type, avcC } : { fourcc: type, avcC: null };
    }
    offset += size;
  }
  return null;
}

/** Removes H.264 emulation-prevention bytes. */
function removeEmulationPrevention(bytes) {
  const output = [];
  let zeros = 0;
  for (const byte of bytes) {
    if (zeros >= 2 && byte === 0x03) {
      zeros = 0;
      continue;
    }
    output.push(byte);
    zeros = byte === 0 ? zeros + 1 : 0;
  }
  return Uint8Array.from(output);
}

class BitReader {
  constructor(bytes) {
    this.bytes = bytes;
    this.bit = 0;
  }
  u(count) {
    let value = 0;
    for (let index = 0; index < count; index += 1) {
      const byteIndex = Math.floor(this.bit / 8);
      const bitIndex = 7 - (this.bit % 8);
      const bit = byteIndex < this.bytes.length ? (this.bytes[byteIndex] >> bitIndex) & 1 : 0;
      value = (value << 1) | bit;
      this.bit += 1;
    }
    return value;
  }
  ue() {
    let zeros = 0;
    while (this.u(1) === 0 && zeros < 32) zeros += 1;
    let value = 1;
    for (let index = 0; index < zeros; index += 1) value = (value << 1) | this.u(1);
    return value - 1;
  }
}

function chromaFormatFromSps(avcCBox, buffer) {
  const data = buffer.subarray(avcCBox.dataStart, avcCBox.end);
  if (data.length < 8) return null;
  const numSps = data[5] & 0x1f;
  if (!numSps) return null;
  const spsLength = data.readUInt16BE(6);
  const sps = data.subarray(8, 8 + spsLength);
  if (!sps.length) return null;
  // Skip NAL header if present (0x67 baseline SPS).
  const rbsp = removeEmulationPrevention(sps[0] === 0x67 || sps[0] === 0x27 ? sps.subarray(1) : sps);
  const reader = new BitReader(rbsp);
  const profileIdc = reader.u(8);
  reader.u(8); // constraint flags
  reader.u(8); // level_idc
  reader.ue(); // seq_parameter_set_id
  const highProfiles = new Set([100, 110, 122, 244, 44, 83, 86, 118, 128, 138, 139, 134, 135]);
  if (!highProfiles.has(profileIdc)) return 'yuv420p';
  const chromaFormatIdc = reader.ue();
  if (chromaFormatIdc === 0) return 'monochrome';
  if (chromaFormatIdc === 1) return 'yuv420p';
  if (chromaFormatIdc === 2) return 'yuv422p';
  if (chromaFormatIdc === 3) return 'yuv444p';
  return null;
}

export function parseMp4(buffer) {
  const ftyp = readBoxes(buffer).find((box) => box.type === 'ftyp');
  const moov = readBoxes(buffer).find((box) => box.type === 'moov');
  const result = {
    valid: Boolean(ftyp && moov && buffer.subarray(4, 8).toString('latin1') === 'ftyp'),
    bytes: buffer.length,
    sha256: sha256(buffer),
    durationMs: null,
    timescale: null,
    video: null,
    audio: null,
    pixelFormat: 'not_parsed',
  };
  if (!moov) return result;
  const mvhdBox = childBoxes(buffer, moov, ['mvhd'])[0];
  if (mvhdBox) {
    const mvhd = readMvhd(buffer, mvhdBox);
    result.durationMs = mvhd.durationMs;
    result.timescale = mvhd.timescale;
  }
  for (const trak of childBoxes(buffer, moov, ['trak'])) {
    const tkhd = childBoxes(buffer, trak, ['tkhd'])[0];
    const mdia = childBoxes(buffer, trak, ['mdia'])[0];
    if (!tkhd || !mdia) continue;
    const hdlr = childBoxes(buffer, mdia, ['hdlr'])[0];
    const handler = hdlr ? readHandlerType(buffer, hdlr) : '';
    const mdhd = childBoxes(buffer, mdia, ['mdhd'])[0];
    const timescale = mdhd ? readMdhd(buffer, mdhd).timescale : null;
    const stbl = findPath(buffer, mdia, ['minf', 'stbl']).box;
    const stsd = stbl ? childBoxes(buffer, stbl, ['stsd'])[0] : null;
    if (handler === 'vide') {
      const dimensions = readTkhd(buffer, tkhd);
      const stts = stbl ? childBoxes(buffer, stbl, ['stts'])[0] : null;
      const codec = stsd ? readStsdCodec(buffer, stsd) : null;
      const avc = stsd ? readAvcC(buffer, stsd) : null;
      result.video = {
        width: dimensions.width,
        height: dimensions.height,
        fps: stts ? readSttsFps(buffer, stts, timescale) : null,
        codec: codec === 'avc1' || codec === 'avc3' ? 'h264' : codec,
        fourcc: codec,
      };
      if (avc?.avcC) {
        result.pixelFormat = chromaFormatFromSps(avc.avcC, buffer) ?? 'not_parsed';
      }
    } else if (handler === 'soun') {
      const codec = stsd ? readStsdCodec(buffer, stsd) : null;
      result.audio = { codec: codec === 'mp4a' ? 'aac' : codec, fourcc: codec };
    }
  }
  return result;
}

function sameUriHost(uri) {
  if (typeof uri !== 'string' || !uri.startsWith('/') || uri.startsWith('//')) return false;
  return !uri.split('/').includes('..');
}

function expectedMimeFor(uri) {
  return MIME_BY_EXTENSION[path.extname(uri).toLowerCase()] ?? null;
}

function safeResolve(root, uri) {
  const relative = uri.replace(/^\/+/, '');
  const resolved = path.resolve(root, relative);
  const rootResolved = path.resolve(root);
  if (!resolved.startsWith(`${rootResolved}${path.sep}`) && resolved !== rootResolved) return null;
  return resolved;
}

export function validateMapping(mapping, options = {}) {
  const errors = [];
  const warnings = [];
  const fail = (message) => errors.push(message);
  if (!mapping || typeof mapping !== 'object') return { errors: ['mapping must be an object'], warnings };
  if (mapping.mappingVersion !== '1.0.0') fail('mappingVersion must be 1.0.0');
  if (!mapping.id) fail('id is required');
  if (mapping.scenarioId !== 'scn-scent-layering') fail('scenarioId must be scn-scent-layering');
  if (mapping.scenarioVersion !== '1.1.0') fail('scenarioVersion must be the awaiting target 1.1.0');
  if (!mapping.campaignId) fail('campaignId is required');
  if (!['awaiting_serenity_content', 'bound'].includes(mapping.contentStatus)) fail('contentStatus is invalid');
  if (mapping.contentStatus === 'awaiting_serenity_content') {
    warnings.push('contentStatus remains awaiting_serenity_content: SERENITY 1.1.0 content is not yet received; the sidecar must not be bound early.');
  }
  const product = mapping.product ?? {};
  if (!product.id || !product.officialName) fail('product id/officialName are required');
  if (product.officialName !== 'SERENITY') fail('product.officialName must be SERENITY for this provided set');
  if (!product.sku || !product.factsSourceUrl) fail('product sku/factsSourceUrl are required');
  if (!Array.isArray(product.verifiedFacts) || product.verifiedFacts.length === 0) fail('product verifiedFacts are required');
  if (!product.identityAssetId) fail('product identityAssetId is required');

  const assets = Array.isArray(mapping.assets) ? mapping.assets : [];
  if (assets.length < 3) fail('at least the three provided assets are required');
  const ids = new Set();
  const types = new Set();
  for (const asset of assets) {
    const label = asset?.id ?? '<unknown asset>';
    if (!asset?.id) fail('asset id is required');
    if (ids.has(asset?.id)) fail(`duplicate asset id ${label}`);
    ids.add(asset?.id);
    if (!TYPE_VALUES.includes(asset?.type)) fail(`${label}: type is invalid`);
    types.add(asset?.type);
    if (!Array.isArray(asset.roles) || asset.roles.length === 0) fail(`${label}: roles are required`);
    for (const role of asset.roles ?? []) if (!ROLE_VALUES.includes(role)) fail(`${label}: unknown role ${role}`);
    if (!sameUriHost(asset.uri)) fail(`${label}: uri must be a safe same-origin path`);
    if (asset.mimeType !== expectedMimeFor(asset.uri)) fail(`${label}: mimeType does not match the published extension`);
    if (!Number.isInteger(asset.bytes) || asset.bytes <= 0) fail(`${label}: bytes must be a positive integer`);
    if (!/^[a-f0-9]{64}$/.test(asset.sha256 ?? '')) fail(`${label}: sha256 must be lowercase hex`);
    if (asset.productId !== product.id) fail(`${label}: productId must match product.id`);
    if (!Array.isArray(asset.visibility) || asset.visibility.length === 0) fail(`${label}: visibility is required`);
    for (const visibility of asset.visibility ?? []) if (!VISIBILITY_VALUES.includes(visibility)) fail(`${label}: unknown visibility ${visibility}`);
    if (asset.source !== 'user_provided') fail(`${label}: source must be user_provided`);
    if (asset.rightsScope !== 'internal_demo') fail(`${label}: rightsScope must be internal_demo`);
    const metadata = asset.metadata ?? {};
    if (!Number.isInteger(metadata.width) || !Number.isInteger(metadata.height)) fail(`${label}: metadata width/height must be integers`);
    if (!['not_applicable', 'independent_provided_preview'].includes(metadata.scriptBinding)) fail(`${label}: scriptBinding is invalid`);
    if (!metadata.disclosure) fail(`${label}: disclosure is required`);

    const resolved = sameUriHost(asset.uri) ? safeResolve(options.root, asset.uri) : null;
    if (!resolved) {
      fail(`${label}: uri escapes the static root`);
      continue;
    }
    let buffer;
    try {
      buffer = options.readFile ? options.readFile(resolved) : null;
    } catch {
      buffer = null;
    }
    asset.__resolvedPath = resolved;
    if (buffer) {
      const info = asset.type === 'hero_image' || asset.type === 'product_original_image'
        ? parsePngHeader(buffer)
        : parseMp4(buffer);
      asset.__fileInfo = info;
      if (info.bytes !== asset.bytes) fail(`${label}: actual bytes ${info.bytes} do not match mapping ${asset.bytes}`);
      if (info.sha256 !== asset.sha256) fail(`${label}: actual sha256 does not match mapping`);
      if (!info.valid) fail(`${label}: file format is invalid`);
      if (asset.type === 'hero_image' || asset.type === 'product_original_image') {
        if (info.width !== metadata.width || info.height !== metadata.height) {
          fail(`${label}: actual ${info.width}x${info.height} does not match metadata ${metadata.width}x${metadata.height}`);
        }
      } else {
        if (info.durationMs !== null && Math.abs(info.durationMs - metadata.durationMs) > 150) {
          fail(`${label}: actual duration ${info.durationMs}ms does not match metadata ${metadata.durationMs}ms`);
        }
        if (info.video) {
          if (Math.round(info.video.width) !== metadata.width || Math.round(info.video.height) !== metadata.height) {
            fail(`${label}: actual ${info.video.width}x${info.video.height} does not match metadata ${metadata.width}x${metadata.height}`);
          }
          if (metadata.frameRate !== null && info.video.fps !== null && Math.abs(info.video.fps - metadata.frameRate) > 0.1) {
            fail(`${label}: actual fps ${info.video.fps} does not match metadata ${metadata.frameRate}`);
          }
          if (metadata.videoCodec && info.video.codec !== metadata.videoCodec) {
            fail(`${label}: actual codec ${info.video.codec} does not match metadata ${metadata.videoCodec}`);
          }
        }
        if (metadata.audioCodec && info.audio && info.audio.codec !== metadata.audioCodec) {
          fail(`${label}: actual audio ${info.audio.codec} does not match metadata ${metadata.audioCodec}`);
        }
        if (metadata.pixelFormat && info.pixelFormat !== 'not_parsed' && info.pixelFormat !== metadata.pixelFormat) {
          fail(`${label}: actual pixel format ${info.pixelFormat} does not match metadata ${metadata.pixelFormat}`);
        }
        if (metadata.scriptBinding !== 'independent_provided_preview') fail(`${label}: final preview must be an independent provided preview`);
        if (metadata.posterAssetId && !ids.has(metadata.posterAssetId) && !assets.some((candidate) => candidate.id === metadata.posterAssetId)) {
          fail(`${label}: posterAssetId does not reference an asset in this mapping`);
        }
      }
    }
  }
  for (const type of TYPE_VALUES) if (!types.has(type)) fail(`missing provided asset type ${type}`);
  if (product.identityAssetId && !ids.has(product.identityAssetId)) fail('product.identityAssetId must reference an asset in this mapping');
  const identity = assets.find((asset) => asset.id === product.identityAssetId);
  if (identity && identity.type !== 'product_original_image') fail('identity asset must be product_original_image');
  const video = assets.find((asset) => asset.type === 'final_preview_video');
  if (video) {
    const ratio = video.metadata.width / video.metadata.height;
    if (Math.abs(ratio - 3 / 4) > 0.002) fail('provided final preview must keep its real 3:4 aspect ratio');
    if (video.metadata.durationMs === 15000) fail('provided final preview must not be labelled as the frozen 15s video');
  }

  if (options.receipt) {
    const receiptById = new Map((options.receipt.assets ?? []).map((asset) => [asset.id, asset]));
    for (const asset of assets) {
      const receipt = receiptById.get(asset.id);
      if (!receipt) {
        fail(`${asset.id}: missing from the provided-assets receipt`);
        continue;
      }
      if (receipt.bytes !== asset.bytes) fail(`${asset.id}: bytes differ from the receipt`);
      if (receipt.sha256 !== asset.sha256) fail(`${asset.id}: sha256 differs from the receipt`);
    }
    if ((options.receipt.assets ?? []).length !== assets.length) warnings.push('receipt asset count differs from mapping asset count');
  }

  return { errors, warnings };
}

export async function readReceipt(file) {
  if (!file) return null;
  return JSON.parse(await readFile(file, 'utf8'));
}

export async function vanillaReadFile(file) {
  return readFile(file);
}

export async function collectAssetFileInfo(mapping, options = {}) {
  const results = [];
  for (const asset of mapping.assets ?? []) {
    const resolved = safeResolve(options.root, asset.uri);
    const entry = { id: asset.id, type: asset.type, uri: asset.uri, resolvedPath: resolved };
    if (!resolved) {
      results.push({ ...entry, error: 'unsafe uri' });
      continue;
    }
    try {
      const buffer = await readFile(resolved);
      const info = asset.type === 'final_preview_video' ? parseMp4(buffer) : parsePngHeader(buffer);
      results.push({ ...entry, ...info, size: buffer.length });
    } catch (error) {
      results.push({ ...entry, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return results;
}

export function startStaticServer(root) {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      const resolved = safeResolve(root, decodeURIComponent(url.pathname));
      if (!resolved) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      let stats;
      try {
        stats = await stat(resolved);
      } catch {
        response.writeHead(404).end('Not found');
        return;
      }
      if (!stats.isFile()) {
        response.writeHead(404).end('Not found');
        return;
      }
      const mime = MIME_BY_EXTENSION[path.extname(resolved).toLowerCase()] ?? 'application/octet-stream';
      const total = stats.size;
      const range = request.headers.range;
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match) {
          response.writeHead(416, { 'Content-Range': `bytes */${total}` }).end();
          return;
        }
        const start = match[1] ? Number(match[1]) : 0;
        const end = match[2] ? Math.min(Number(match[2]), total - 1) : total - 1;
        if (start >= total || end < start) {
          response.writeHead(416, { 'Content-Range': `bytes */${total}` }).end();
          return;
        }
        response.writeHead(206, {
          'Content-Type': mime,
          'Content-Length': end - start + 1,
          'Accept-Ranges': 'bytes',
          'Content-Range': `bytes ${start}-${end}/${total}`,
        });
        createReadStream(resolved, { start, end }).pipe(response);
        return;
      }
      response.writeHead(200, { 'Content-Type': mime, 'Content-Length': total, 'Accept-Ranges': 'bytes' });
      createReadStream(resolved).pipe(response);
    } catch (error) {
      response.writeHead(500).end(error instanceof Error ? error.message : 'error');
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, port: address.port, origin: `http://127.0.0.1:${address.port}` });
    });
  });
}

export async function collectHttpChecks(mapping, root) {
  const { server, origin } = await startStaticServer(root);
  const checks = [];
  try {
    for (const asset of mapping.assets ?? []) {
      const url = `${origin}${asset.uri}`;
      const get = await fetch(url);
      const buffer = Buffer.from(await get.arrayBuffer());
      const hash = sha256(buffer);
      const range = await fetch(url, { headers: { Range: 'bytes=0-15' } });
      const rangeBuffer = Buffer.from(await range.arrayBuffer());
      checks.push({
        id: asset.id,
        uri: asset.uri,
        url,
        status: get.status,
        mimeType: get.headers.get('content-type'),
        bytes: buffer.length,
        sha256: hash,
        matchesFile: hash === asset.sha256 && buffer.length === asset.bytes,
        rangeStatus: range.status,
        rangeBytes: rangeBuffer.length,
        supportsRange: range.status === 206 && range.headers.get('accept-ranges') === 'bytes',
      });
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  return checks;
}

export async function buildStaticReport(options) {
  const mappingPath = options.mapping ?? 'design/presentation-assets/scent-layering.json';
  const root = path.resolve(options.root ?? 'apps/web/public');
  const mapping = JSON.parse(await readFile(mappingPath, 'utf8'));
  const receipt = await readReceipt(options.receipt ?? 'evidence/brand/provided-serenity-assets-receipt.json');
  const validation = validateMapping(mapping, {
    root,
    receipt,
    readFile: (file) => readFileSync(file),
  });
  const files = await collectAssetFileInfo(mapping, { root });
  const http = await collectHttpChecks(mapping, root);
  const report = {
    checkedAt: new Date().toISOString(),
    mappingPath,
    root,
    receiptPath: options.receipt ?? 'evidence/brand/provided-serenity-assets-receipt.json',
    contentStatus: mapping.contentStatus,
    scenarioVersion: mapping.scenarioVersion,
    product: mapping.product,
    ok: validation.errors.length === 0 && http.every((check) => check.status === 200 && check.matchesFile && check.supportsRange),
    errors: validation.errors,
    warnings: validation.warnings,
    assets: files,
    http,
  };
  return report;
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--mapping') result.mapping = argv[++index];
    else if (arg === '--root') result.root = argv[++index];
    else if (arg === '--report') result.report = argv[++index];
    else if (arg === '--receipt') result.receipt = argv[++index];
  }
  return result;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = await buildStaticReport(options);
  if (options.report) {
    await mkdir(path.dirname(path.resolve(options.report)), { recursive: true });
    await import('node:fs/promises').then((fs) => fs.writeFile(path.resolve(options.report), `${JSON.stringify(report, null, 2)}\n`, 'utf8'));
  }
  const summary = {
    ok: report.ok,
    assets: report.assets.map((asset) => ({
      id: asset.id,
      bytes: asset.bytes ?? asset.size,
      sha256: asset.sha256,
      width: asset.width ?? asset.video?.width,
      height: asset.height ?? asset.video?.height,
      durationMs: asset.durationMs,
      fps: asset.video?.fps,
      codec: asset.video?.codec,
      pixelFormat: asset.pixelFormat,
    })),
    http: report.http.map((check) => ({ id: check.id, status: check.status, mimeType: check.mimeType, matchesFile: check.matchesFile, supportsRange: check.supportsRange })),
    errors: report.errors,
    warnings: report.warnings,
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (!report.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
