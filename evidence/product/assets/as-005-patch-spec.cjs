const fs=require('fs');
const p='apps/web/tests/product-provided-assets.spec.ts';
let s=fs.readFileSync(p,'utf8');
s=s.replace("test('bilingual campaign pack remains a real EN+AR ZIP without fabricated video while SERENITY content is pending', async ({ page }) => {","test('bilingual campaign pack includes the bound EN+AR content and the supplied original MP4', async ({ page }) => {");
s=s.replace("  const zipPath = path.join(EVIDENCE, 'bilingual-campaign-pack.zip');","  const zipPath = path.join(EVIDENCE, 'bilingual-campaign-pack-with-video.zip');");
s=s.replace("  expect(text).toContain('EXPORT.json');\n  expect(text.includes('.mp4')).toBe(false);","  expect(text).toContain('EXPORT.json');\n  expect(text).toContain('provided/final-preview.mp4');\n  expect(text).toContain('provided/hero-serenity.png');\n  expect(text).toContain('provided/product-serenity.png');\n  expect(text).toContain('\"noVideo\": false');\n  expect(text).toContain('\"providedAssetSetId\": \"provided.scent-layering.serenity-v1\"');");
fs.writeFileSync(p,s);
console.log('patched');
