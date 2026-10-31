// Optional DOM integration check: npm install --no-save jsdom@26.1.0
const {JSDOM}=require('jsdom');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const harness=require('./harness.cjs');
(async()=>{
 const h=harness(),root=path.join(__dirname,'..','src');
 h.create(h.other);
 let html=fs.readFileSync(path.join(root,'Index.html'),'utf8'),downloadBlob;
 for(const name of ['Styles','JavaScript'])html=html.replace("<?!= include_('"+name+"'); ?>",fs.readFileSync(path.join(root,name+'.html'),'utf8'));
 const errors=[];
 const dom=new JSDOM(html,{url:'https://localhost/',runScripts:'dangerously',beforeParse(w){
  w.addEventListener('error',e=>errors.push(e.message));
  w.crypto.randomUUID=randomUUID;w.HTMLElement.prototype.scrollIntoView=function(){};
  w.Blob=Blob;w.URL.createObjectURL=b=>{downloadBlob=b;return 'blob:test';};w.URL.revokeObjectURL=()=>{};
  w.HTMLAnchorElement.prototype.click=function(){};
  function chain(success=()=>{},failure=()=>{}) {
   return new Proxy({}, {get(_target,name) {
    if(name==='withSuccessHandler')return fn=>chain(fn,failure);
    if(name==='withFailureHandler')return fn=>chain(success,fn);
    return (...args)=>Promise.resolve().then(()=>JSON.parse(JSON.stringify(h.ctx[name](...JSON.parse(JSON.stringify(args)))))).then(success).catch(e=>failure({message:e.message}));
   }});
  }
  w.google={script:{run:chain()}};
 }});
 const w=dom.window,d=w.document,$=id=>d.getElementById(id);
 async function settled(){for(let i=0;i<100;i++){await new Promise(r=>setTimeout(r,5));if(!d.body.classList.contains('busy'))return;}throw new Error('UI did not settle');}
 async function click(id){$(id).click();await settled();}
 async function submit(id){$(id).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settled();assert.ok(!$('message').classList.contains('alert-danger'),$('message').textContent);}
 await click('loginButton');assert.equal($('workspace').hidden,false);
 d.querySelector('[data-page="tasks"]').click();
 $('taskDescription').value='<img src=x onerror=alert(1)> shipment';
 $('taskDoer').value=h.staff.userId;$('taskDue').value='2026-11-02';
 await submit('taskForm');assert.equal(h.rows('Delegation').length,2);assert.equal(d.querySelectorAll('#taskRows img').length,0);
 $('taskSearch').value='<img';$('taskSearch').dispatchEvent(new w.Event('input'));
 assert.equal($('taskRows').children.length,1);
 await click('exportTasks');const csv=await downloadBlob.text();assert.ok(csv.includes('<img'));assert.ok(!csv.includes('Check shipment'));
 d.querySelector('#taskRows button').click();$('taskDue').value='2026-11-03';$('taskReason').value='Plan changed';
 await submit('taskForm');assert.equal(h.rows('TaskRevisions').length,1);
 d.querySelector('[data-page="recurring"]').click();
 $('ruleName').value='Weekly review';$('ruleDescription').value='Review operations';$('ruleDoer').value=h.staff.userId;$('ruleStart').value='2026-11-01';$('ruleFrequency').value='WEEKLY';
 await submit('ruleForm');assert.equal(h.rows('Recurring').length,1);
 d.querySelector('[data-page="users"]').click();
 $('userName').value='New member';$('userEmail').value='new@example.com';$('userDepartment').value=h.d1.departmentId;
 await submit('userForm');assert.ok(h.rows('Users').some(u=>u.email==='new@example.com'));
 assert.equal($('userForm').elements.userId.value,'');
 h.login(h.staff);await click('refresh');
 assert.equal($('usersNav').hidden,true);assert.equal($('userRows').children.length,0);
 d.querySelector('[data-page="tasks"]').click();assert.equal($('taskForm').hidden,true);
 d.querySelector('#taskRows button').click();assert.equal($('taskDescription').disabled,true);
 $('taskStatus').value='COMPLETED';$('taskRemarks').value='Finished';await submit('taskForm');
 assert.equal(h.rows('Delegation').find(t=>t.doerUserId===h.staff.userId).status,'COMPLETED');
 assert.equal($('taskForm').hidden,true);await click('logout');
 assert.equal($('workspace').hidden,true);assert.equal($('taskRows').textContent,'');
 assert.deepEqual(errors,[]);dom.window.close();
 console.log('PASS: DOM login, task create/revise/complete, safe rendering, CSV, recurring form, Admin users, Staff scope, workspace lock');
})().catch(e=>{console.error(e);process.exitCode=1;});
