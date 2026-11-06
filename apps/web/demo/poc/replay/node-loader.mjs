/**
 * TEST_ONLY Node ESM loader for the POC-005 validator bridge.
 *
 * The authoritative replay reducer is TypeScript (`domain/replay.ts`). The
 * validator is a plain Node script, so this loader lets the script import the
 * same reducer without a build step: it resolves extensionless relative
 * imports to `.ts` and transpiles TypeScript in-memory with the already
 * installed TypeScript package. No product runtime uses this loader.
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const EXTENSIONS = ['.ts', '.mts', '.mjs', '.js'];

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (!specifier.startsWith('.') || !context.parentURL) throw error;
    for (const extension of EXTENSIONS) {
      const candidate = new URL(`${specifier}${extension}`, context.parentURL);
      if (candidate.protocol === 'file:' && existsSync(fileURLToPath(candidate))) {
        return { url: candidate.href, shortCircuit: true };
      }
    }
    throw error;
  }
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.ts') || url.endsWith('.mts')) {
    const source = readFileSync(fileURLToPath(url), 'utf8');
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        verbatimModuleSyntax: false,
        isolatedModules: true,
      },
      fileName: fileURLToPath(url),
    });
    return { format: 'module', source: output.outputText, shortCircuit: true };
  }
  return nextLoad(url, context);
}
