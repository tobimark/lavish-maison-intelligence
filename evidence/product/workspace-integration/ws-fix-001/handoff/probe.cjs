const {createRequire}=require('node:module');
const {spawn}=require('node:child_process');
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const {chromium}=createRequire('D:/workspace/SILLAGE/package.json')('playwright');
const project='D:/workspace/maison-intelligence';const out=__dirname;
const base='http://127.0.0.1:3181';const A='scn-scent-layering.brief.main',B='scn-luxury-gifting.brief.main';
const files=['apps/web/components/shell/AppShell.tsx','apps/web/components/product/library/LibraryPage.tsx','apps/web/components/product/shared/workspace-routes.ts','apps/web/.next/BUILD_ID'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(project,f))).digest('hex')]));
const before=hashes();
const server=spawn(process.execPath,[path.join(project,'node_modules/next/dist/bin/next'),'start','-p','3181'],{cwd:path.join(project,'apps/web'),windowsHide:true,stdio:['ignore','pipe','pipe']});
const log=[];server.stdout.on('data',d=>log.push(String(d)));server.stderr.on('data',d=>log.push(String(d)));
process.on('exit',()=>server.kill());
(async()=>{
 let browser;
 try{
  for(let i=0;i<100;i++){try{const r=await fetch(base+'/library');if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
  browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));const states=[];
  async function snapshot(label){const data=await page.evaluate(()=>({url:location.href,selected:document.querySelector('[data-testid="LIB-campaign"]')?.value,nav:[...document.querySelectorAll('[data-testid^="shell-nav-"]')].map(e=>({id:e.dataset.testid,href:e.getAttribute('href'),active:e.getAttribute('aria-current')})),text:document.querySelector('main')?.innerText.slice(0,2500)}));states.push({label,...data});await page.screenshot({path:path.join(out,label+'.png')});return data;}
  await page.goto(base+`/library?campaignId=${A}&scenarioVersion=1.1.0&language=en`);await page.getByTestId('LIB-campaign').waitFor();await page.waitForTimeout(500);await snapshot('01-library-A');
  await page.getByTestId('LIB-campaign').selectOption(B);await page.waitForURL(u=>u.searchParams.get('campaignId')===B);await page.waitForTimeout(700);const switched=await snapshot('02-library-B-after-same-path-switch');
  await page.getByTestId('shell-nav-atelier').click();await page.waitForTimeout(700);await snapshot('03-atelier-after-sidebar-click');
  await page.reload();await page.waitForTimeout(500);await snapshot('04-atelier-after-refresh');
  await page.goBack();await page.waitForTimeout(500);await snapshot('05-library-after-back');
  await page.goto(base+`/deliverables?campaignId=${B}&scenarioVersion=1.1.0&language=en`);await page.waitForTimeout(700);await snapshot('06-B-with-stale-A-version');
  const result={checkedAt:new Date().toISOString(),scope:'Targeted browser reproduction only; no production edits, no old specs run',buildId:fs.readFileSync(path.join(project,'apps/web/.next/BUILD_ID'),'utf8').trim(),states,errors,hashesBefore:before,hashesAfter:hashes()};
  result.samePathSidebarStale=switched.nav.filter(n=>['shell-nav-atelier','shell-nav-deliverables'].includes(n.id)).some(n=>new URL(n.href,base).searchParams.get('campaignId')===A);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({samePathSidebarStale:result.samePathSidebarStale,states:states.map(s=>({label:s.label,url:s.url,selected:s.selected})),errors}));
 }finally{if(browser)await browser.close();server.kill();fs.writeFileSync(path.join(out,'server.log'),log.join(''));}
})().catch(e=>{console.error(e);process.exitCode=1;});
