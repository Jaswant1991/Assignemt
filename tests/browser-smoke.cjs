// Optional: npm install --no-save playwright && npx playwright install chromium
// Exercises real DOM + RPC wiring against the in-memory Apps Script harness.
// CDN is blocked here; this checks behavior, not Bootstrap rendering.
const {chromium}=require('playwright');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const harness=require('./harness.cjs');
(async()=>{
 const h=harness(),root=path.join(__dirname,'..','src');
 h.create(h.other);
 let html=fs.readFileSync(path.join(root,'Index.html'),'utf8');
 for(const name of ['Styles','JavaScript']) html=html.replace("<?!= include_('"+name+"'); ?>",fs.readFileSync(path.join(root,name+'.html'),'utf8'));
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(html);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try {
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://cdn.jsdelivr.net/**',r=>r.abort());
  await page.exposeFunction('backend',async(name,args)=> {
    assert.ok(['getWorkspace','listUsers','listDepartments','saveUser','saveDepartment','createTask','updateTask','saveRecurring'].includes(name));
    return JSON.parse(JSON.stringify(h.ctx[name](...args)));
  });
  await page.addInitScript(()=>{
    const runner={};
    function chain(success,failure) {
      return new Proxy(runner,{get(_t,name){
        if(name==='withSuccessHandler')return fn=>chain(fn,failure);
        if(name==='withFailureHandler')return fn=>chain(success,fn);
        return (...args)=>window.backend(name,args).then(success).catch(e=>failure({message:e.message}));
      }});
    }
    window.google={script:{run:chain(()=>{},()=>{})}};
  });
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.locator('#loginButton').click();
  await page.locator('#workspace').waitFor({state:'visible'});
  await page.locator('[data-page="tasks"]').click();
  await page.locator('#taskDescription').fill('<img src=x onerror=alert(1)> shipment');
  await page.locator('#taskDoer').selectOption(h.staff.userId);
  await page.locator('#taskDue').fill('2026-11-02');
  await page.locator('#taskForm button[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('#message').textContent==='Task saved.');
  assert.equal(h.rows('Delegation').length,2);
  assert.equal(await page.locator('#taskRows img').count(),0);
  await page.locator('#taskSearch').fill('<img');
  assert.equal(await page.locator('#taskRows tr').count(),1);
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#exportTasks').click();
  const download=await downloadPromise,downloadPath=await download.path();
  const csv=fs.readFileSync(downloadPath,'utf8');assert.ok(csv.includes('shipment'));assert.ok(!csv.includes('Check shipment'));
  await page.locator('#taskRows button').first().click();
  await page.locator('#taskDue').fill('2026-11-03');
  await page.locator('#taskReason').fill('Customer revised plan');
  await page.locator('#taskForm button[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('#taskFormTitle').textContent==='Assign a task');
  assert.equal(h.rows('TaskRevisions').length,1);
  await page.locator('[data-page="recurring"]').click();
  await page.locator('#ruleName').fill('Weekly dispatch');
  await page.locator('#ruleDescription').fill('Review records');
  await page.locator('#ruleDoer').selectOption(h.staff.userId);
  await page.locator('#ruleFrequency').selectOption('WEEKLY');
  await page.locator('#ruleStart').fill('2026-11-01');
  await page.locator('#ruleForm button[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('#message').textContent==='Schedule saved.');
  assert.equal(h.rows('Recurring').length,1);
  await page.locator('[data-page="users"]').click();
  await page.locator('#userName').fill('New member');
  await page.locator('#userEmail').fill('new@example.com');
  await page.locator('#userDepartment').selectOption(h.d1.departmentId);
  await page.locator('#userForm button[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('#message').textContent==='User saved.');
  assert.ok(h.rows('Users').some(u=>u.email==='new@example.com'));
  h.login(h.staff);
  await page.locator('#refresh').click();
  await page.waitForFunction(()=>document.querySelector('#identity').textContent.includes('STAFF'));
  assert.equal(await page.locator('#usersNav').isVisible(),false);
  await page.locator('[data-page="tasks"]').click();
  assert.equal(await page.locator('#taskForm').isVisible(),false);
  await page.locator('#taskRows button').first().click();
  assert.equal(await page.locator('#taskDescription').isDisabled(),true);
  await page.locator('#taskStatus').selectOption('COMPLETED');
  await page.locator('#taskRemarks').fill('Completed safely');
  await page.locator('#taskForm button[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('#taskForm').hidden);
  assert.equal(h.rows('Delegation').filter(t=>t.doerUserId===h.staff.userId)[0].status,'COMPLETED');
  await page.locator('#logout').click();await page.locator('#login').waitFor({state:'visible'});
  assert.equal(await page.locator('#taskRows').textContent(),'');
  assert.deepEqual(errors,[]);
  console.log('PASS: login, create/revise/complete, recurrence, admin user creation, scope, safe rendering, filtered CSV, lock');
 } finally {if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
