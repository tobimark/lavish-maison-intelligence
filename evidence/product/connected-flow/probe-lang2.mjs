import { chromium } from 'playwright';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://127.0.0.1:3150/campaigns/scn-scent-layering.brief.main/journey?scenarioVersion=1.1.0&stage=social',{waitUntil:'load'}); await p.waitForTimeout(800);
console.log('before', await p.getByTestId('SOC-language-en').getAttribute('aria-pressed'), await p.getByTestId('SOC-caption-input').inputValue());
await p.getByTestId('SOC-language-ar').click(); await p.waitForTimeout(100);
console.log('after100', await p.getByTestId('SOC-language-ar').getAttribute('aria-pressed'), await p.getByTestId('SOC-caption-input').inputValue());
await p.waitForTimeout(1000);
console.log('after1s', await p.getByTestId('SOC-language-ar').getAttribute('aria-pressed'), await p.getByTestId('SOC-caption-input').inputValue());
await b.close();
