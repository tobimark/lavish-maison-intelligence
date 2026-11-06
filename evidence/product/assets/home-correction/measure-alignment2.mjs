import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const browser = await chromium.launch();
const prev = JSON.parse(readFileSync('evidence/product/assets/home-correction/alignment.json','utf8'));
for (const result of prev.results) {
  const width = result.viewport.width;
  const page = await browser.newPage({ viewport: { width, height: width === 1440 ? 900 : 768 } });
  await page.goto('http://127.0.0.1:3120/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const data = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('[data-stage]'));
    const m = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: +r.top.toFixed(2), bottom: +r.bottom.toFixed(2), height: +r.height.toFixed(2) }; };
    return cards.map((card) => ({
      stage: card.getAttribute('data-stage'),
      card: m(card),
      header: m(card.children[0]),
      media: m(card.children[1]),
      caption: m(card.children[2]),
      action: m(card.children[3]),
    }));
  });
  result.cards = data;
  const spread = (values) => +(Math.max(...values) - Math.min(...values)).toFixed(2);
  result.cardWidthSpread = 0;
  result.cardTopSpread = spread(data.map((c) => c.card.top));
  result.cardBottomSpread = spread(data.map((c) => c.card.bottom));
  result.mediaTopSpread = spread(data.map((c) => c.media.top));
  result.mediaBottomSpread = spread(data.map((c) => c.media.bottom));
  result.mediaHeightSpread = spread(data.map((c) => c.media.height));
  result.headerTopSpread = spread(data.map((c) => c.header.top));
  result.captionTopSpread = spread(data.map((c) => c.caption.top));
  result.actionTopSpread = spread(data.map((c) => c.action.top));
  result.actionBottomSpread = spread(data.map((c) => c.action.bottom));
  await page.close();
}
prev.correctedAt = new Date().toISOString();
prev.note = 'Direct-child measurements: header, media, caption, action. Spread = max-min.';
writeFileSync('evidence/product/assets/home-correction/alignment.json', JSON.stringify(prev, null, 2) + '\n');
console.log(JSON.stringify(prev.results.map((r) => ({ viewport: r.viewport, cardTopSpread: r.cardTopSpread, cardBottomSpread: r.cardBottomSpread, mediaTopSpread: r.mediaTopSpread, mediaBottomSpread: r.mediaBottomSpread, mediaHeightSpread: r.mediaHeightSpread, captionTopSpread: r.captionTopSpread, actionTopSpread: r.actionTopSpread, actionBottomSpread: r.actionBottomSpread })), null, 2));
await browser.close();
