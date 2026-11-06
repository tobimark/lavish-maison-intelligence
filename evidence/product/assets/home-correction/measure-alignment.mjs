import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch();
const results = [];
for (const width of [1440, 1366]) {
  const page = await browser.newPage({ viewport: { width, height: width === 1440 ? 900 : 768 } });
  await page.goto('http://127.0.0.1:3120/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const data = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('[data-stage]'));
    const measure = (el) => { const r = el.getBoundingClientRect(); return { top: +r.top.toFixed(2), bottom: +r.bottom.toFixed(2), left: +r.left.toFixed(2), right: +r.right.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) }; };
    return {
      h1: document.querySelector('h1')?.textContent,
      domOrder: cards.map((card) => card.getAttribute('data-stage')),
      introBottom: +document.querySelector('[aria-labelledby="overview-title"]').getBoundingClientRect().bottom.toFixed(2),
      conceptTop: +document.querySelector('[data-testid="home-creative-progression"]').getBoundingClientRect().top.toFixed(2),
      cards: cards.map((card) => {
        const media = card.querySelector('[data-testid$="-media"]');
        const caption = card.querySelectorAll('span')[3];
        const action = card.querySelectorAll('span')[4];
        return { stage: card.getAttribute('data-stage'), card: measure(card), media: measure(media), caption: caption ? measure(caption) : null, action: action ? measure(action) : null };
      }),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  results.push({ width, ...data });
  await page.close();
}
await browser.close();
const summary = results.map((r) => {
  const spread = (values) => +(Math.max(...values) - Math.min(...values)).toFixed(2);
  return {
    viewport: r.viewport,
    h1: r.h1,
    domOrder: r.domOrder,
    purposeFirst: r.introBottom <= r.conceptTop,
    cardWidthSpread: spread(r.cards.map((c) => c.card.width)),
    cardTopSpread: spread(r.cards.map((c) => c.card.top)),
    cardBottomSpread: spread(r.cards.map((c) => c.card.bottom)),
    mediaHeightSpread: spread(r.cards.map((c) => c.media.height)),
    mediaTopSpread: spread(r.cards.map((c) => c.media.top)),
    mediaBottomSpread: spread(r.cards.map((c) => c.media.bottom)),
    captionTopSpread: spread(r.cards.map((c) => c.caption?.top ?? 0)),
    actionTopSpread: spread(r.cards.map((c) => c.action?.top ?? 0)),
    mediaHeights: r.cards.map((c) => c.media.height),
    overflow: r.overflow,
    cards: r.cards,
  };
});
writeFileSync('evidence/product/assets/home-correction/alignment.json', JSON.stringify({ checkedAt: new Date().toISOString(), baseUrl: 'http://127.0.0.1:3120', results: summary }, null, 2) + '\n');
console.log(JSON.stringify(summary.map((s) => ({ viewport: s.viewport, purposeFirst: s.purposeFirst, domOrder: s.domOrder, cardWidthSpread: s.cardWidthSpread, cardTopSpread: s.cardTopSpread, cardBottomSpread: s.cardBottomSpread, mediaTopSpread: s.mediaTopSpread, mediaBottomSpread: s.mediaBottomSpread, mediaHeights: s.mediaHeights, mediaHeightSpread: s.mediaHeightSpread, captionTopSpread: s.captionTopSpread, actionTopSpread: s.actionTopSpread, overflow: s.overflow })), null, 2));
