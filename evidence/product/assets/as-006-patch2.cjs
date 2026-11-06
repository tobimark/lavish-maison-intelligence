const fs=require('fs');
const p='apps/web/tests/product-matrix-dom.spec.ts';
let s=fs.readFileSync(p,'utf8');
s=s.replace("  // ---------------------------------------------------------------- Opportunities",`  await page.goto(\`/campaigns/\${CAMPAIGNS[0].campaignId}/brief\`, { waitUntil: 'load' });
  await expect(page.getByTestId('campaign-brief-page')).toBeVisible();
  await audit.collect('campaign-brief');

  // ---------------------------------------------------------------- Opportunities`);
s=s.replace("  const asNotRunReasons: Record<string, string> = {","  const asNotRunReasons: Record<string, string> = {\n    'OV-explore': 'The FLOW batch replaced the original Overview “Explore opportunities” CTA with the connected-case Journey CTA (OV-explore-journey). The old CTA no longer exists; the new journey CTA is exercised in product-provided-assets.spec.ts.',\n    'OV-creative': 'The FLOW batch replaced the original Overview “Browse creative work” CTA with the six-workspace navigation/Journey links. The old CTA no longer exists and is not claimed as present.',");
fs.writeFileSync(p,s);
console.log('patched');
