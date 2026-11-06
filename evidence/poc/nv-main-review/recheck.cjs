// Main-controller browser probes; evidence only, no product code changes.
const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
 const browser = await chromium.launch({headless:true});
 const page = await browser.newPage({viewport:{width:1440,height:900}});
 const results = {};
 try {
  await page.goto('http://127.0.0.1:3101/');
  await page.getByTestId('home-start-enabled').first().click();
  await page.getByTestId('run-discovery').click();
  await page.getByRole('button',{name:/Analysis & script/}).click();
  await page.getByTestId('run-analysis').click();
  const original = await page.getByLabel('Script title',{exact:true}).inputValue();
  await page.getByLabel('Script title',{exact:true}).fill('MAIN DISCARDED TITLE MUST NOT RETURN');
  await page.getByRole('button',{name:'Discard edits',exact:true}).click();
  await expect(page.getByLabel('Script title',{exact:true})).toHaveValue(original);
  await page.getByTestId('save-script').click();
  await expect(page.getByText(/Saved EN script v/)).toBeVisible();
  results.discard = {original,visibleAfterDiscard:original,savedAfterDiscard:await page.getByLabel('Script title',{exact:true}).inputValue()};
  await page.screenshot({path:path.join(__dirname,'discard-resurrection.png'),fullPage:true});
  await page.getByTestId('confirm-script').click();
  await page.getByRole('button',{name:/Content delivery/}).click();
  await page.getByTestId('delivery-subject').fill('[SIMULATED] MAIN SAVED SUBJECT');
  await page.getByTestId('save-content-draft').click();
  await expect(page.getByTestId('content-attachments')).toBeVisible();
  await page.getByTestId('delivery-subject').fill('[SIMULATED] MAIN UNSAVED DISPLAY SUBJECT');
  await page.getByLabel('.invalid email',{exact:true}).first().fill('changed-recipient@lavish-demo.invalid');
  results.delivery = {displaySubject:await page.getByTestId('delivery-subject').inputValue(),buttonEnabled:await page.getByTestId('confirm-content-delivery').isEnabled()};
  await page.getByTestId('confirm-content-delivery').click();
  results.delivery.dialogRecipients = await page.getByTestId('content-delivery-confirm').innerText();
  await page.screenshot({path:path.join(__dirname,'unsaved-delivery-confirm.png'),fullPage:true});
  await page.getByTestId('confirm-content-simulate').click();
  await expect(page.getByTestId('attempt-table').locator('tbody tr')).toHaveCount(1);
  results.delivery.recordedRow=await page.getByTestId('attempt-table').innerText();
  const downloadWait=page.waitForEvent('download');
  await page.getByTestId('export-attempt').last().click();
  const download=await downloadWait;
  await download.saveAs(path.join(__dirname,'main-stale-delivery.zip'));
  await page.screenshot({path:path.join(__dirname,'unsaved-delivery-record.png'),fullPage:true});
  console.log(JSON.stringify(results,null,2));
 } finally {
  fs.writeFileSync(path.join(__dirname,'recheck-results.json'),JSON.stringify(results,null,2)+'\n');
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
