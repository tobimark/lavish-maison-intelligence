import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const url = process.env.QA_URL ?? 'http://127.0.0.1:5179/evidence/poc/storage/fix-01/qa.html';
const out = path.resolve('evidence/poc/reviews/POC-004/browser-recheck.json');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const pageA = await context.newPage();
const pageB = await context.newPage();
const result = {
  scope: 'TEST_ONLY real Chromium IndexedDB storage smoke; no product UI or customer content',
  url,
  browser: { name: 'chromium', version: browser.version() },
  checks: {},
  passed: false,
};
try {
  await pageA.goto(url, { waitUntil: 'networkidle' });
  await pageA.waitForFunction(() => Boolean(window.qa));
  await pageB.goto(url, { waitUntil: 'networkidle' });
  await pageB.waitForFunction(() => Boolean(window.qa));

  const refreshId = 'usr.qa-refresh';
  const created = await pageA.evaluate((id) => window.qa.create(id), refreshId);
  await pageA.evaluate(({ id }) => window.qa.mutate(id, 'refresh-mutate', 0), { id: refreshId });
  await pageA.reload({ waitUntil: 'networkidle' });
  await pageA.waitForFunction(() => Boolean(window.qa));
  const restored = await pageA.evaluate((id) => window.qa.get(id), refreshId);
  result.checks.refresh = { created: created.kind, restoredRevision: restored?.revision ?? null, passed: created.kind === 'created' && restored?.revision === 1 };

  const concurrentId = 'usr.qa-concurrent';
  await pageA.evaluate((id) => window.qa.create(id), concurrentId);
  const [tabA, tabB] = await Promise.all([
    pageA.evaluate(({ id }) => window.qa.mutate(id, 'tab-a', 0), { id: concurrentId }),
    pageB.evaluate(({ id }) => window.qa.mutate(id, 'tab-b', 0), { id: concurrentId }),
  ]);
  const successes = [tabA, tabB].filter((entry) => entry.ok);
  const conflicts = [tabA, tabB].filter((entry) => !entry.ok);
  const afterTabs = await pageA.evaluate((id) => window.qa.get(id), concurrentId);
  result.checks.twoTabCas = {
    tabA,
    tabB,
    successCount: successes.length,
    conflictCodes: conflicts.map((entry) => entry.code),
    storedRevision: afterTabs?.revision ?? null,
    passed: successes.length === 1 && conflicts.length === 1 && conflicts[0]?.code === 'REVISION_CONFLICT' && afterTabs?.revision === 1,
  };

  const corruptId = 'usr.qa-corrupt';
  await pageA.evaluate((id) => window.qa.create(id), corruptId);
  await pageA.evaluate((id) => window.qa.corrupt(id), corruptId);
  const rawExport = await pageA.evaluate((id) => window.qa.exportRaw(id), corruptId);
  let readError = null;
  try {
    await pageA.evaluate((id) => window.qa.get(id), corruptId);
  } catch (error) {
    readError = String(error);
  }
  result.checks.corruptRawExport = {
    status: rawExport?.status ?? null,
    errorCode: rawExport?.error?.code ?? null,
    invalidWorkflow: rawExport?.session?.state?.workflow?.video ?? null,
    receiptCount: rawExport?.receipts?.length ?? null,
    readError,
    passed: rawExport?.status === 'corrupt' && rawExport?.session?.state?.workflow?.video === 'INVALID_STATE' && Boolean(readError),
  };

  result.passed = Object.values(result.checks).every((check) => check.passed === true);
} catch (error) {
  result.error = error instanceof Error ? error.stack ?? error.message : String(error);
  result.passed = false;
} finally {
  writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
  await context.close();
  await browser.close();
}
if (!result.passed) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));

