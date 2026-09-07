// Run against `npm run dev`; optionally compare a saved renderer. These
// diagnostic timings are observations, not environment-sensitive CI gates.
import { chromium, firefox } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openApp, mountCourse, settle } from '../browser/helpers.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
let baselinePath = null, baselineCssPath = null, reportPath = resolve(root, 'reports/sidebar-disclosure.json');
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const flag = args[i];
  if (!['--baseline', '--baseline-css', '--report'].includes(flag) || !args[i + 1] || args[i + 1].startsWith('--')) {
    throw new Error('Usage: node tools/sidebar-lab.mjs [--baseline view.js] [--baseline-css style.css] [--report output.json]');
  }
  const value = resolve(args[++i]);
  if (flag === '--baseline') baselinePath = value;
  else if (flag === '--baseline-css') baselineCssPath = value;
  else reportPath = value;
}
const current = await readFile(resolve(root, 'engine/view.js'), 'utf8');
const currentCss = await readFile(resolve(root, 'engine/style.css'), 'utf8');
const variants = baselinePath || baselineCssPath ? [
  ['before', baselinePath ? await readFile(baselinePath, 'utf8') : current,
    baselineCssPath ? await readFile(baselineCssPath, 'utf8') : currentCss],
  ['after', current, currentCss],
] : [['current', current, currentCss]];
const rows=[], errors=[];
for (const [name, launcher] of [['chromium',chromium], ['firefox',firefox]]) {
  const browser=await launcher.launch();
  try {
    for (const [variant,source,stylesheet] of variants) {
      const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
      await page.emulateMedia({reducedMotion:'no-preference'});
      page.on('pageerror',e=>errors.push({browser:name,variant,error:e.message}));
      await page.route('**/engine/view.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:source}));
      await page.route('**/engine/style.css',route=>route.fulfill({status:200,contentType:'text/css',body:stylesheet}));
      await openApp(page);
      for (const count of [100,250]) for (let repeat=0;repeat<4;repeat++) {
        await mountCourse(page,count);
        await page.evaluate(()=>testView.expand('root'));await settle(page);
        const collapsed=await page.evaluate(()=>({elements:document.querySelectorAll('#root *').length,
          topicRows:document.querySelectorAll('.pnextitem').length}));
        for (const action of ['first-open','close','reopen']) {
          const result=await page.evaluate(async()=>{
            const intervals=[],frames=[],transitions=[];let previous=null,firstFrameDelayMs=null,active=true;
            const start=performance.now();
            const list=document.querySelector('.pnextlist');
            const recordTransition=event=>{
              if(event.target===list)transitions.push({type:event.type,property:event.propertyName,atMs:performance.now()-start});
            };
            for(const type of ['transitionstart','transitionend','transitioncancel'])list.addEventListener(type,recordTransition);
            const tick=time=>{
              if(!active)return;
              if(previous===null)firstFrameDelayMs=performance.now()-start;
              else {intervals.push(time-previous);frames.push({atMs:time-start,intervalMs:time-previous});}
              previous=time;requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
            document.querySelector('.pnextbtn').click();
            const synchronousMs=performance.now()-start;
            await new Promise(resolve=>setTimeout(resolve,600));active=false;
            for(const type of ['transitionstart','transitionend','transitioncancel'])list.removeEventListener(type,recordTransition);
            intervals.sort((a,b)=>a-b);
            return {synchronousMs,firstFrameDelayMs,p95FrameMs:intervals[Math.floor(intervals.length*.95)],
              maxFrameMs:intervals.at(-1),slowFrames:intervals.filter(t=>t>34).length,
              elements:document.querySelectorAll('#root *').length,topicRows:document.querySelectorAll('.pnextitem').length,
              expanded:document.querySelector('.pnextbtn').getAttribute('aria-expanded'),frames,transitions};
          });
          rows.push({browser:name,version:browser.version(),variant,count,repeat,action,collapsed,...result});
        }
      }
      await page.close();
    }
  } finally {await browser.close();}
}
const groups=[];
for(const browser of ['chromium','firefox'])for(const count of [100,250])for(const [variant]of variants)for(const action of ['first-open','close','reopen']){
  const samples=rows.filter(r=>r.browser===browser&&r.count===count&&r.variant===variant&&r.action===action&&r.repeat>0);
  const stats=field=>{const v=samples.map(r=>r[field]).sort((a,b)=>a-b);return {min:v[0],median:v[Math.floor(v.length/2)],max:v.at(-1)};};
  groups.push({browser,count,variant,action,sync:stats('synchronousMs'),firstFrame:stats('firstFrameDelayMs'),
    p95:stats('p95FrameMs'),slowFrames:samples.reduce((n,r)=>n+r.slowFrames,0),collapsedElements:samples[0].collapsed.elements,openElements:samples[0].elements});
}
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath,JSON.stringify({measuredAt:new Date().toISOString(),
  method:'One browser/page at a time; generic 100/250-topic courses at 1440×1000 with reduced motion disabled. Each variant serves the recorded renderer and stylesheet; an omitted baseline file uses the current source for that file. Expand and settle the graph, then first-open, close and reopen the sidebar list, observing each action for 600 ms. Four repetitions per browser/source/count; retain the first as warmup but exclude it from groups. Click timing includes the synchronous disclosure handler, firstFrame records wall time to the first rAF callback, and intervals use consecutive rAF timestamps. Chronological frames and CSS transition events locate delays within the observation window. No physical presentation measurement or device guarantee.',
  rendererSources:Object.fromEntries(variants.map(([n,s])=>[n,createHash('sha256').update(s).digest('hex')])),
  stylesheetSources:Object.fromEntries(variants.map(([n,,s])=>[n,createHash('sha256').update(s).digest('hex')])),
  scriptSha256:createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex'),groups,rows,errors},null,2)+'\n');
console.log(JSON.stringify({groups,errors},null,2));
if(errors.length)process.exitCode=1;
