// Main-controller-owned additive contract. Original complete-video schema stays frozen.
import { readFile, writeFile } from 'node:fs/promises';
const original = JSON.parse(await readFile('contracts/poc/scenario.schema.json', 'utf8'));
const schema = structuredClone(original);
schema.$id = 'https://contracts.lavish-poc.invalid/v1/content-only.schema.json';
schema.title = 'Lavish content-only scenario input — pending video is not playable media';
const available = structuredClone(schema.$defs.asset);
const pending = structuredClone(available);
pending.properties.kind = { enum: ['video', 'poster'] };
pending.properties.bytes = { type: 'null' };
pending.properties.sha256 = { type: 'null' };
pending.properties.rightsStatus = { const: 'pending' };
schema.$defs.asset = { oneOf: [available, pending] };
await writeFile('contracts/poc/content-only.schema.json', JSON.stringify(schema, null, 2) + '\n');
console.log('Wrote additive content-only input schema; complete-video schema unchanged.');
