// Run from the repository root with Playwright available (NODE_PATH may point
// to the bundled runtime). No production writes: network and save calls are mocked.
// The test server exposes closure state in-memory only; the source keeps its CSP.
const {chromium}=require('playwright');
const fs=require('fs'),http=require('http'),path=require('path');
(async()=>{
 fs.mkdirSync('artifacts/programs',{recursive:true});
 const server=http.createServer((req,res)=>{const f=path.join(process.cwd(),decodeURIComponent(req.url.split('?')[0]));try{res.setHeader('Content-Type',f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'text/javascript':f.endsWith('.woff2')?'font/woff2':'application/octet-stream');res.end(f.endsWith('.html') ? fs.readFileSync(f,'utf8').replace('\n})();\n</script>','window.pgTest = code => eval(code); })();\n</script>') : fs.readFileSync(f));}catch(e){res.writeHead(404).end()}}).listen(8765,'127.0.0.1');
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
 const page=await browser.newPage({bypassCSP:true,viewport:{width:1440,height:1000}}),errors=[];
 const run=fn=>page.evaluate(code=>window.pgTest(code),'('+fn.toString()+')()');
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')console.log(m.text())});
 await page.route('https://**/*.supabase.co/**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
 await page.goto('http://127.0.0.1:8765/admin.html');await page.evaluate(()=>document.fonts.ready);

 await run(()=>{pgOwner='test';INFO={name:'كوتش زهراء'};buildExIndex();openProgram(blankProgram('training'));});
 await page.locator('#pg-title').fill('برنامج القوة والتوازن — ثمانية أسابيع');
 await page.locator('[data-pgadd="day"]').click();await page.locator('[data-pgadd="row"]').click();
 await page.locator('.n-in').fill('ضغط الصدر بالجهاز');
 await page.locator('.n-in').fill('السحب الأمامي بالجهاز');
 if(await page.locator('input.m-in').inputValue()!=='الظهر') throw Error('Autofill replacement failed');
 await page.locator('input.m-in').fill('تعديل يدوي');await page.locator('.n-in').fill('ضغط الصدر بالجهاز');
 if(await page.locator('input.m-in').inputValue()!=='تعديل يدوي') throw Error('Manual edit overwritten');
 await page.locator('input.rest-in').fill('٦٠ ثانية');await page.locator('input.note-in').fill('حركة بطيئة ومتحكم بها');
 await page.locator('[data-pgtool="copy"][data-kind="row"]').click();
 if(await page.locator('.erow').count()!==2)throw Error('Duplicate row failed');
 await page.locator('[data-pgtool="copy"][data-kind="day"]').click();
 if(await page.locator('details[data-day]').count()!==2)throw Error('Duplicate day failed');
 await page.locator('details[data-day="0"] .d-title').fill('First');
 await page.locator('details[data-day="1"] .d-title').fill('Second');
 await page.locator('[data-pgtool="up"][data-kind="day"]').last().click();
 if(await page.locator('details[data-day="0"] .d-title').inputValue()!=='Second')throw Error('Reorder failed');
 await page.locator('details[data-day="1"] .d-title').scrollIntoViewIfNeeded();
 await page.locator('[data-pgtool="up"][data-kind="day"]').last().click();
 if(await page.locator('details[data-day="0"] .d-title').inputValue()!=='First')throw Error('Reverse reorder failed');
 await run(()=>{syncProgram();persistPgDraft();if(!JSON.parse(localStorage.getItem(pgDraftKey)).program.content.days[0].rows[0].rest)throw Error('Draft fields missing')});
 page.on('dialog',d=>d.accept());
 await run(()=>{closeProgram();openProgram(blankProgram('training'))});
 if(await page.locator('#pg-title').inputValue()!=='برنامج القوة والتوازن — ثمانية أسابيع')throw Error('Restore failed');
 await run(()=>{PG.trainee={name:'سارة أحمد',height:'١٦٥ سم',weight:'٦٥ كغم',weeks:8,daysPerWeek:4,start:'2026-09-08',coach:'كوتش زهراء'};PG.design.cover=true;PG.content.days[0].title='الجزء العلوي — قوة وتحكم';PG.content.days[0].rows=Array.from({length:32},(_,i)=>({n:'تمرين '+(i+1)+' — ضغط الصدر بالجهاز',en:'CHEST PRESS MACHINE',m:'الصدر',sets:'3',reps:'10–12',rest:'٦٠ ثانية',note:'التركيز على التحكم بالحركة والتنفس',v:''}));drawProgram();drawPreview();buildPdf();});
 const layout=await run(()=>({pages:$('#pdfArea').children.length,heights:[...$('#pgPreviewSheet').children].map(x=>x.offsetHeight),count:$('#pgPrevCount').textContent,overflow:document.documentElement.scrollWidth>innerWidth}));
 if(layout.heights.some(h=>h>1000))throw Error('Page overflow '+JSON.stringify(layout));
 await page.screenshot({path:'artifacts/programs/program-editor-desktop.png'});
 await run(()=>{document.body.classList.add('printing');});
 await page.pdf({path:'artifacts/programs/program-preview.pdf',preferCSSPageSize:true,printBackground:true});
 await page.emulateMedia({media:'screen'});
 await run(()=>{document.body.classList.remove('printing');});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/programs/program-editor-mobile.png'});
 const mobileOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 if(mobileOverflow)throw Error('Mobile overflow');
 await page.locator('details[data-day="0"] .n-in').first().scrollIntoViewIfNeeded();
 await page.screenshot({path:'artifacts/programs/program-exercises-mobile.png'});
 await run(async()=>{
   const oldFrom=sb.from;
   sb.from=()=>({insert:()=>({select:()=>({single:async()=>{throw Error('offline')}})})});
   await saveProgram(); if(pgSaving || $('#pgSaveBtn').disabled || !PG)throw Error('Save failure recovery failed');
   sb.from=()=>({insert:payload=>({select:()=>({single:async()=>({data:{...payload,id:'test-program',created_at:new Date().toISOString()},error:null})})})});
   await saveProgram(); if(PG || !$('#pgModal').hidden || localStorage.getItem(pgDraftKey))throw Error('Save success failed');
   sb.from=oldFrom;
   dupProgram('test-program');
   if(PG.trainee.name || PG.trainee.height || PG.trainee.weight || PG.trainee.start)throw Error('Trainee data retained');
 });
 await run(()=>{
   closeProgram(true);openProgram(blankProgram('nutrition'));
   PG.title='Nutrition test';PG.content.meals=[{title:'Breakfast',rows:Array.from({length:50},()=>({n:'Meal item',m:'Protein',reps:'100 g'}))}];
   PG.content.habits=['Water'];drawProgram();drawPreview();
   if([...$('#pgPreviewSheet').children].some(x=>x.offsetHeight>1000))throw Error('Nutrition pagination overflow');
 });
 if(errors.length)throw Error(errors.join('\n'));
 console.log(JSON.stringify({passed:true,...layout,mobileOverflow}));
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
