'use client';

import { createMockApi } from '../../demo/poc/api/mock-api';
import { createCatalogScenarioSource } from '../../demo/poc/api/scenario-source';
import { createBrowserProvidedAssetSource } from '../../demo/poc/api/provided-asset-source';
import { createBrowserCampaignPresentationSource } from '../../demo/poc/api/flow-source';
import type { FlowAwareMockApi } from '../../demo/poc/api/flow-contract';
import type { DownloadResult } from '../../demo/poc/api/types';
import { IndexedDbStorage } from '../../demo/poc/storage/indexeddb';

let sharedApi: FlowAwareMockApi | null = null;
const clockBase = typeof performance !== 'undefined' ? performance.now() : 0;

/**
 * Browser-only MockApi singleton. The approved content catalog is the only
 * scenario source; deferred video assets are never fabricated. The workflow
 * virtual clock is session-relative (page lifetime), never Unix epoch ms.
 * AS-002 adds the read-only provided-asset sidecar through the same facade.
 * FLOW-001 adds the connected-journey projection + local social workflow on
 * that same facade/storage (presentation sidecar, no second backend).
 */
export function getBrowserApi(): FlowAwareMockApi {
  if (sharedApi) return sharedApi;
  sharedApi = createMockApi({
    scenarioSource: createCatalogScenarioSource(),
    storage: new IndexedDbStorage({ dbName: 'lavish-poc-content-v1' }),
    now: () => new Date().toISOString(),
    virtualNow: () => Math.max(0, Math.round(performance.now() - clockBase)),
    providedAssetSource: createBrowserProvidedAssetSource(),
    presentationSource: createBrowserCampaignPresentationSource(),
  });
  return sharedApi;
}

export type { FlowAwareMockApi };

export function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Triggers a real browser download for bytes returned by the MockApi. */
export function triggerDownload(download: DownloadResult): void {
  const blob = new Blob([new Uint8Array(download.blob)], { type: download.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = download.filename;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function mediaUrl(uri: string): string {
  return uri;
}
