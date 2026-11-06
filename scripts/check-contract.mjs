#!/usr/bin/env node
/**
 * TASK-001 contract check entry point (`npm run check:contract`).
 *
 * Scope — deliberately structural, matching docs/API_CONTRACT.md's current
 * verification split:
 *   1. `contracts/openapi.json` parses and keeps the agreed base shape
 *      (OpenAPI 3.x, `/api/v1` server base, demoSession scheme, relative paths).
 *   2. Local `$ref`s resolve; operationIds are unique; error responses and path
 *      parameters are declared for every operation.
 *   3. The FastAPI skeleton stays a skeleton: exactly one route, the TASK-001
 *      `GET /api/v1/health` ops endpoint, payload `{ status: "ok" }` only.
 *
 * NOT verified here (deferred by docs/API_CONTRACT.md to TASK-002): a standard
 * OpenAPI validator and comparison against FastAPI's generated document.
 * This script must never be reported as "API contract fully validated".
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const checks = [];
const failures = [];
const skipped = [];

function check(name, ok, detail) {
  if (ok) {
    checks.push(name);
  } else {
    failures.push(detail ? `${name} — ${detail}` : name);
  }
}

const read = (relativePath) => readFile(path.join(root, relativePath), 'utf8');

let contract = null;
try {
  contract = JSON.parse(await read('contracts/openapi.json'));
  check('contracts/openapi.json parses as JSON', true);
} catch (error) {
  failures.push(`contracts/openapi.json does not parse: ${error.message}`);
}

if (contract) {
  check(
    'OpenAPI version is 3.x',
    typeof contract.openapi === 'string' && /^3\.\d+\.\d+$/.test(contract.openapi),
    `got ${JSON.stringify(contract.openapi)}`,
  );
  check(
    'Contract has info.title and info.version',
    typeof contract.info?.title === 'string' &&
      contract.info.title.length > 0 &&
      typeof contract.info?.version === 'string',
  );
  check(
    'Contract declares the /api/v1 base server',
    Array.isArray(contract.servers) && contract.servers.some((server) => server?.url === '/api/v1'),
  );
  check(
    'Contract declares the demoSession security scheme',
    Boolean(contract.components?.securitySchemes?.demoSession),
  );

  const paths = contract.paths ?? {};
  const pathKeys = Object.keys(paths);
  check('Contract defines at least one path', pathKeys.length > 0, `got ${pathKeys.length}`);
  check(
    'Every contract path is server-relative (no duplicated /api prefix)',
    pathKeys.every((key) => key.startsWith('/') && !key.startsWith('/api/')),
    pathKeys.filter((key) => !key.startsWith('/') || key.startsWith('/api/')).join(', '),
  );

  // Local $ref resolution.
  const unresolved = new Set();
  const walk = (value) => {
    if (!value || typeof value !== 'object') return;
    if (typeof value.$ref === 'string' && value.$ref.startsWith('#/')) {
      let target = contract;
      for (const part of value.$ref.replace(/^#\//, '').split('/')) {
        target = target?.[part];
      }
      if (target === undefined) unresolved.add(value.$ref);
    }
    Object.values(value).forEach(walk);
  };
  walk(contract);
  check('All local $refs resolve', unresolved.size === 0, [...unresolved].join(', '));

  // Per-operation checks.
  const operationIds = [];
  const methodNames = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
  for (const [pathKey, pathItem] of Object.entries(paths)) {
    for (const method of methodNames) {
      const operation = pathItem?.[method];
      if (!operation) continue;
      const label = `${method.toUpperCase()} ${pathKey}`;
      operationIds.push(operation.operationId);
      check(
        `${label} has an operationId`,
        typeof operation.operationId === 'string' && operation.operationId.length > 0,
      );
      check(
        `${label} declares 409 and 422 error responses`,
        Boolean(operation.responses?.['409']) && Boolean(operation.responses?.['422']),
      );
      const pathParams = [...pathKey.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
      check(
        `${label} declares every path parameter as required`,
        pathParams.every((name) =>
          (operation.parameters ?? []).some(
            (parameter) =>
              parameter?.in === 'path' && parameter?.name === name && parameter?.required === true,
          ),
        ),
        pathParams.join(', '),
      );
    }
  }
  const uniqueOperationIds = new Set(operationIds);
  check(
    'Operation IDs are unique',
    uniqueOperationIds.size === operationIds.length,
    `${operationIds.length - uniqueOperationIds.size} duplicate(s)`,
  );
  check('Every operation carries an operationId', operationIds.every(Boolean));

  // The FastAPI skeleton stays a skeleton.
  let mainSource = '';
  try {
    mainSource = await read('backend/app/main.py');
    check('backend/app/main.py is readable', true);
  } catch (error) {
    check('backend/app/main.py is readable', false, error.message);
  }

  if (mainSource) {
    const routeMatches = [...mainSource.matchAll(/@app\.(get|post|put|patch|delete)\(/g)];
    check(
      'FastAPI skeleton exposes exactly one route',
      routeMatches.length === 1,
      `found ${routeMatches.length}`,
    );
    check(
      'The single route is GET /api/v1/health',
      /@app\.get\(\s*"\/api\/v1\/health"/.test(mainSource),
    );
    check(
      'Health payload declares status: Literal["ok"]',
      /status\s*:\s*Literal\[\s*"ok"\s*\]/.test(mainSource),
    );
    const healthClass =
      mainSource.split(/class\s+HealthResponse/)[1]?.split(/\nclass\s|\ndef\s|\napp\s*=/)[0] ?? '';
    const declaredFields = healthClass.split('\n').filter((line) => /^\s{4}\w+\s*:/.test(line));
    check(
      'Health payload exposes no fields besides status',
      declaredFields.length === 1 && declaredFields[0].includes('status'),
      declaredFields.map((line) => line.trim()).join(' | '),
    );
  }

  skipped.push(
    Boolean(contract.paths?.['/api/v1/health']) || Boolean(contract.paths?.['/health'])
      ? 'Health endpoint is declared in contracts/openapi.json'
      : 'GET /api/v1/health is an ops endpoint added by TASK-001 and is intentionally NOT in contracts/openapi.json (the business contract stays frozen for downstream tasks)',
  );
  skipped.push(
    'Standard OpenAPI validator + comparison against the FastAPI-generated document: deferred to TASK-002 by docs/API_CONTRACT.md',
  );
}

const result = {
  checkedAt: new Date().toISOString(),
  scope:
    'Structural contract checks only; not a standard OpenAPI validation and not a business API test',
  passed: checks.length,
  failures,
  skipped,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length > 0) {
  console.error(`\ncheck:contract FAILED (${failures.length} failure(s))`);
  process.exitCode = 1;
} else {
  console.log(`\ncheck:contract passed (${checks.length} structural check(s), no failures)`);
}
