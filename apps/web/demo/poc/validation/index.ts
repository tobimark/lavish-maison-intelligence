/**
 * Shared POC scenario semantics entry point (POC-001).
 *
 * The runtime implementation lives in `semantic-rules.mjs` so the Node
 * validation CLI can import it directly (native ESM, no build step), while the
 * `.d.mts` declaration file gives the future browser reducer generated,
 * type-checked signatures.
 */
export * from './semantic-rules.mjs';
