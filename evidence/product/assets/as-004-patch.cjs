const fs=require('fs');
let p='apps/web/components/product/brief/CampaignBriefPage.tsx';
let s=fs.readFileSync(p,'utf8');
s=s.replace("import { getBrowserApi } from '../../poc/browser-api';","import { getBrowserApi } from '../../poc/browser-api';\nimport { ProvidedCampaignAssets } from '../shared/ProvidedAssets';");
s=s.replace("      </header>\n\n      <section className={styles.card} aria-label=\"Campaign brief details\">","      </header>\n\n      <ProvidedCampaignAssets campaignId={campaignId} variant=\"brief\" />\n\n      <section className={styles.card} aria-label=\"Campaign brief details\">");
fs.writeFileSync(p,s);
p='apps/web/components/product/atelier/AtelierPage.tsx';
s=fs.readFileSync(p,'utf8');
if (!s.includes('ProvidedCampaignAssets')) {
  s=s.replace("import { ScriptPreview, StoryboardPreview, VersionBadges } from '../shared/PreviewBlocks';","import { ScriptPreview, StoryboardPreview, VersionBadges } from '../shared/PreviewBlocks';\nimport { ProvidedCampaignAssets } from '../shared/ProvidedAssets';");
  s=s.replace("      </header>\n\n      {state === 'loading' ? (","      </header>\n\n      <ProvidedCampaignAssets campaignId={activeCampaign?.campaignId} variant=\"atelier\" />\n\n      {state === 'loading' ? (");
}
fs.writeFileSync(p,s);
console.log('patched');
