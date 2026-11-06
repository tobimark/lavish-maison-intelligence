const fs=require('fs'); const crypto=require('crypto');
let s=fs.readFileSync('apps/web/components/shell/AppShell.tsx','utf8');
s=s.replace("import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';\nimport type { ReactNode, RefObject } from 'react';\nimport { usePathname, useSearchParams } from 'next/navigation';","import { useCallback, useEffect, useMemo, useRef, useState } from 'react';\nimport type { ReactNode } from 'react';\nimport { usePathname } from 'next/navigation';");
const start=s.indexOf('type SidebarQuery');
const end=s.indexOf('export function AppShell');
s=s.slice(0,start)+s.slice(end);
s=s.replace("  const [isMobile, setIsMobile] = useState(false);\n\n  // WS-001/WS-FIX-001: the sidebar context is derived from Next's reactive\n  // search params in ReactiveSidebar below; no polling, storage or history\n  // monkey-patching is used.\n\n  const sidebarRef","  const [isMobile, setIsMobile] = useState(false);\n  const [contextQuery, setContextQuery] = useState('');\n\n  // WS-001: preserve the current case when navigating the six workspaces.\n  // Read `window.location.search` after mount instead of useSearchParams so the\n  // shell never needs an extra Suspense boundary and never writes business data.\n  useEffect(() => {\n    const params = new URLSearchParams(window.location.search);\n    const next = new URLSearchParams();\n    const campaignId = params.get('campaignId');\n    const scenarioVersion = params.get('scenarioVersion');\n    const language = params.get('language');\n    if (campaignId) next.set('campaignId', campaignId);\n    if (scenarioVersion) next.set('scenarioVersion', scenarioVersion);\n    if (language === 'en' || language === 'ar') next.set('language', language);\n    setContextQuery(next.toString());\n  }, [pathname]);\n\n  const navItems = useMemo<readonly ShellNavItem[]>(() => {\n    const query = contextQuery ? new URLSearchParams(contextQuery) : null;\n    return NAV_ITEMS.map((item) => {\n      if (!query) return item;\n      const next = new URLSearchParams();\n      const campaignId = query.get('campaignId');\n      const scenarioVersion = query.get('scenarioVersion');\n      const language = query.get('language');\n      if (campaignId) next.set('campaignId', campaignId);\n      if (scenarioVersion) next.set('scenarioVersion', scenarioVersion);\n      if (language && (item.id === 'atelier' || item.id === 'library' || item.id === 'deliverables')) {\n        next.set('language', language);\n      }\n      const suffix = next.toString();\n      return { ...item, href: suffix ? `${item.href}${item.href.includes('?') ? '&' : '?'}${suffix}` : item.href };\n    });\n  }, [contextQuery]);\n\n  const sidebarRef");
const suspenseStart=s.indexOf('      <Suspense');
const suspenseEnd=s.indexOf('      </Suspense>');
s=s.slice(0,suspenseStart)+`      <Sidebar
        navItems={navItems}
        currentPath={pathname}
        collapsed={collapsed}
        mobileOpen={menuOpen}
        onToggleCollapsed={toggleCollapsed}
        onCloseMobile={closeMenu}
        sidebarRef={sidebarRef}
        inert={isMobile && !menuOpen}
      />`+s.slice(suspenseEnd+'      </Suspense>'.length);
const hash=crypto.createHash('sha256').update(s).digest('hex');
fs.mkdirSync('evidence/product/workspace-integration/ws-fix-001/before',{recursive:true}); fs.writeFileSync('evidence/product/workspace-integration/ws-fix-001/before/AppShell.tsx',s);
console.log('hash',hash,'expected dbc6a09ea2334ab760027b8743cef80d381ce46a7f6d41b6c1bf1b3121444ab7','match',hash==='dbc6a09ea2334ab760027b8743cef80d381ce46a7f6d41b6c1bf1b3121444ab7');
