import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The npm lockfile lives at the repository root (npm workspaces), so pin the
// workspace root explicitly instead of letting Next.js infer it from the
// nearest lockfile.
const appDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(appDir, '..', '..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: workspaceRoot,
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
