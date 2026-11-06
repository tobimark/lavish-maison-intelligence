import type { DownloadResult } from './types';
import type { ProvidedAsset, ProvidedAssetSet } from './provided-asset-contract';

/**
 * AS-002 · Read-only provided-asset source.
 *
 * The single sidecar (`/presentation-assets/scent-layering.json`) is the only
 * mapping for the three user-provided SERENITY files. Pages must obtain asset
 * objects and bytes through the MockApi facade, never by hard-coding media
 * paths. Nothing here creates sessions, confirms scripts or logs exports.
 */
export interface ProvidedAssetSource {
  getAssetSet(): Promise<ProvidedAssetSet | null>;
  getAssetBytes(asset: ProvidedAsset): Promise<Uint8Array | null>;
}

export interface ProvidedAssetSourceOptions {
  loadAssetSet: () => ProvidedAssetSet | null | Promise<ProvidedAssetSet | null>;
  loadBytes?: (asset: ProvidedAsset) => Promise<Uint8Array | null>;
}

function isSafeUri(uri: string): boolean {
  return typeof uri === 'string' && uri.startsWith('/') && !uri.startsWith('//') && !uri.split('/').includes('..');
}

export function createProvidedAssetSource(options: ProvidedAssetSourceOptions): ProvidedAssetSource {
  return {
    async getAssetSet() {
      const set = await options.loadAssetSet();
      if (!set) return null;
      if (!Array.isArray(set.assets) || set.assets.length === 0) return null;
      return set;
    },
    async getAssetBytes(asset) {
      if (!options.loadBytes) return null;
      if (!isSafeUri(asset.uri)) return null;
      return options.loadBytes(asset);
    },
  };
}

/** Browser loader for the published sidecar and the real published bytes. */
export function createBrowserProvidedAssetSource(): ProvidedAssetSource {
  return createProvidedAssetSource({
    async loadAssetSet() {
      const response = await fetch('/presentation-assets/scent-layering.json', { cache: 'no-cache' });
      if (!response.ok) return null;
      return (await response.json()) as ProvidedAssetSet;
    },
    async loadBytes(asset) {
      const response = await fetch(asset.uri, { cache: 'no-cache' });
      if (!response.ok) return null;
      return new Uint8Array(await response.arrayBuffer());
    },
  });
}

export function providedDownloadFilename(asset: ProvidedAsset): string {
  const extension = asset.mimeType === 'video/mp4' ? '.mp4' : '.png';
  return `${asset.id.split('.').pop() ?? 'provided-asset'}${extension}`;
}

export function providedDownload(asset: ProvidedAsset, bytes: Uint8Array): DownloadResult {
  return {
    blob: bytes,
    filename: providedDownloadFilename(asset),
    mimeType: asset.mimeType,
    bytes: bytes.byteLength,
    sha256: asset.sha256,
  };
}
