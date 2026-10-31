const {test}=require('node:test');
const assert=require('node:assert/strict');
const harness=require('./harness.cjs');

test('paused rules, transferred doers and inactive assigners do not generate tasks',()=>{
 const h=harness();
 const input={requestId:'paused-schedule-123',taskName:'Check',description:'Review',doerUserId:h.staff.userId,frequency:'DAILY',startDate:'2026-10-31',priority:'NORMAL',status:'PAUSED'};
 const rule=h.ctx.saveRecurring(input);
 assert.equal(h.ctx.generateRecurringOccurrences_().processed,0);
 h.ctx.saveRecurring({...input,ruleId:rule.ruleId,expectedVersion:1,status:'ACTIVE'});
 h.ctx.upsert_(h.db,'Users',{...h.staff,departmentId:h.d2.departmentId});
 assert.equal(h.ctx.generateRecurringOccurrences_().processed,0);
 h.ctx.upsert_(h.db,'Users',{...h.staff});
 h.ctx.upsert_(h.db,'Users',{...h.admin,status:'INACTIVE'});
 assert.equal(h.ctx.generateRecurringOccurrences_().processed,0);
});
test('forged actor fields, invalid URLs and schema corruption are rejected',()=>{
 const h=harness();
 assert.throws(()=>h.create(h.staff,{assignerUserId:h.md.userId}),/Unsupported/);
 assert.throws(()=>h.create(h.staff,{attachmentUrl:'javascript:alert(1)'}),/Drive/);
 h.db.getSheetByName('Users').rows[0][0]='wrongHeader';
 assert.throws(()=>h.ctx.getWorkspace(),/Schema mismatch/);
});
test('trusted identity, inactive users, domain and unconfigured auth fail closed',()=>{
 const h=harness();
 assert.equal(h.ctx.getSession().user.userId,h.admin.userId);
 for(const email of ['', 'unknown@example.com','admin@evil.com']){h.login(email);assert.throws(()=>h.ctx.getWorkspace(),/denied/);}
 h.login(h.admin);h.props.AUTH_MODE='UNCONFIGURED';assert.throws(()=>h.ctx.listTasks(),/denied/);
 h.props.AUTH_MODE='GOOGLE_WORKSPACE';const input={...h.staff,expectedUpdatedAt:h.staff.updatedAt,status:'INACTIVE'};delete input.createdAt;delete input.updatedAt;
 h.ctx.saveUser(input);h.login(h.staff);assert.throws(()=>h.ctx.getWorkspace(),/inactive/);
});
test('role-scoped list, details, dashboard and doer choices',()=>{
 const h=harness(),a=h.create(),b=h.create(h.peer),c=h.create(h.other);
 h.login(h.staff);assert.equal(h.ctx.listTasks().length,1);assert.equal(h.ctx.getDashboard().total,1);
 assert.equal(h.ctx.listDepartments().length,1);assert.equal(h.ctx.listDepartments()[0].departmentId,h.d1.departmentId);
 assert.equal(h.ctx.getWorkspace().doers.length,0);
 assert.throws(()=>h.ctx.updateTask(b.taskId,{status:'COMPLETED'},1),/denied/);
 assert.throws(()=>h.create(h.peer),/cannot assign/);
 h.login(h.manager);assert.equal(h.ctx.listTasks().length,2);
 assert.equal(h.ctx.getWorkspace().doers.some(u=>u.userId===h.other.userId),false);
 assert.throws(()=>h.create(h.other),/cannot assign/);
 h.login(h.md);assert.equal(h.ctx.listTasks().length,3);assert.throws(()=>h.ctx.listUsers(),/Admin/);
});
test('task idempotency, revisions, optimistic concurrency and staff fields',()=>{
 const h=harness(),input={requestId:'same-request-123456',doerUserId:h.staff.userId,targetDate:'2026-11-01',description:'=formula text',priority:'NORMAL'};
 const a=h.ctx.createTask(input),b=h.ctx.createTask(input);assert.equal(a.taskId,b.taskId);assert.equal(h.rows('Delegation').length,1);
 assert.equal(h.rows('Delegation')[0].description,'=formula text');
 assert.throws(()=>h.ctx.updateTask(a.taskId,{targetDate:'2026-11-02'},1),/length/);
 const updated=h.ctx.updateTask(a.taskId,{targetDate:'2026-11-02',revisionReason:'Customer request'},1);
 assert.equal(updated.version,2);assert.equal(h.rows('TaskRevisions')[0].oldTargetDate,'2026-11-01');
 assert.throws(()=>h.ctx.updateTask(a.taskId,{remarks:'stale'},1),/changed/);
 h.login(h.staff);assert.throws(()=>h.ctx.updateTask(a.taskId,{doerUserId:h.peer.userId},2),/Unsupported/);
 const done=h.ctx.updateTask(a.taskId,{status:'COMPLETED',remarks:'Done'},2);
 assert.ok(done.completedAt);assert.throws(()=>h.ctx.updateTask(a.taskId,{status:'IN_PROGRESS'},3),/Closed/);
});
test('admin user management, last Admin and duplicate email protections',()=>{
 const h=harness();
 const edit={userId:h.admin.userId,name:h.admin.name,email:h.admin.email,role:'STAFF',departmentId:h.d1.departmentId,status:'ACTIVE',expectedUpdatedAt:h.admin.updatedAt};
 assert.throws(()=>h.ctx.saveUser(edit),/at least one/);
 assert.throws(()=>h.ctx.saveUser({name:'Duplicate',email:h.staff.email,role:'STAFF',departmentId:h.d1.departmentId,status:'ACTIVE'}),/already exists/);
 h.login(h.md);assert.throws(()=>h.ctx.saveDepartment({departmentName:'Test',status:'ACTIVE'}),/Admin/);
 h.login(h.manager);assert.throws(()=>h.ctx.listUsers(),/Admin/);
});
test('journal replays a partial task write without duplicating tasks or audits',()=>{
 const h=harness();h.failNext('AuditLog');
 const input={requestId:'retry-after-failure',doerUserId:h.staff.userId,targetDate:'2026-11-01',description:'Atomic task',priority:'NORMAL'};
 assert.throws(()=>h.ctx.createTask(input),/Injected/);
 assert.equal(h.rows('Operations').filter(o=>o.status==='PENDING').length,1);
 const task=h.ctx.createTask(input);
 assert.equal(h.rows('Delegation').filter(t=>t.taskId===task.taskId).length,1);
 assert.equal(h.rows('AuditLog').filter(a=>a.entityId===task.taskId).length,1);
 assert.equal(h.rows('Operations').filter(o=>o.status==='PENDING').length,0);
});
test('recurrence clamps anniversaries without month-end or leap-year drift',()=>{
 const h=harness();
 for(const [frequency,start,current,expected] of [
 ['MONTHLY','2024-01-31','2024-01-31','2024-02-29'],
 ['MONTHLY','2024-01-31','2024-02-29','2024-03-31'],
 ['QUARTERLY','2026-01-31','2026-01-31','2026-04-30'],
 ['YEARLY','2024-02-29','2027-02-28','2028-02-29'],
 ['WEEKLY','2026-12-28','2026-12-28','2027-01-04']]){
 assert.equal(h.ctx.nextOccurrence_({frequency,startDate:start},current),expected);
 }
 assert.throws(()=>h.ctx.date_('2026-02-30',true),/Invalid/);
});
test('recurring worker is bounded, duplicate-safe, scoped, and respects pause/end',()=>{
 const h=harness();h.props.NOTIFICATIONS_ENABLED='true';
 const input={requestId:'recurring-request-1',taskName:'Daily check',description:'Safety review',doerUserId:h.staff.userId,frequency:'DAILY',startDate:'2026-10-01',endDate:'2026-10-31',priority:'NORMAL',status:'ACTIVE'};
 const r=h.ctx.saveRecurring(input);assert.equal(h.ctx.saveRecurring(input).ruleId,r.ruleId);
 assert.equal(h.ctx.generateRecurringOccurrences_().processed,25);assert.equal(h.rows('Delegation').length,25);
 assert.equal(h.ctx.generateRecurringOccurrences_().processed,6);
 assert.equal(h.ctx.generateRecurringOccurrences_().processed,0);assert.equal(h.rows('Delegation').length,31);
 assert.equal(h.rows('NotificationOutbox').length,31);assert.equal(h.rows('Recurring')[0].status,'ENDED');
 h.effective('other@example.com');assert.throws(()=>h.ctx.generateRecurringOccurrences_(),/Worker/);
});
test('notifications default off; approved recipients only, retry and daily deduplication',()=>{
 const h=harness();h.create(h.staff,{targetDate:'2026-12-01'});assert.equal(h.rows('NotificationOutbox').length,0);
 assert.equal(h.ctx.processNotificationOutbox_().disabled,true);
 h.props.NOTIFICATIONS_ENABLED='true';h.props.EMAIL_ALLOWLIST=h.staff.email;
 const t=h.create();h.ctx.processNotificationOutbox_();assert.equal(h.messages.length,1);
 h.ctx.queueOverdueNotifications_();const count=h.rows('NotificationOutbox').length;h.ctx.queueOverdueNotifications_();
 assert.equal(h.rows('NotificationOutbox').length,count);
 h.ctx.updateTask(t.taskId,{status:'COMPLETED'},1);
 h.ctx.processNotificationOutbox_();
 assert.equal(h.rows('NotificationOutbox').some(n=>n.status==='SKIPPED'),true);
 assert.equal(h.messages.length,1); // Assigning Admin is absent from email allowlist.
 assert.equal(h.rows('NotificationOutbox').some(n=>n.attempts===1),true);
});
test('scoped aggregation and cancellation denominator',()=>{
 const h=harness();const a=h.create(),b=h.create();
 h.ctx.updateTask(a.taskId,{status:'COMPLETED'},1);h.ctx.updateTask(b.taskId,{status:'CANCELLED'},1);
 const d=h.ctx.getDashboard();assert.equal(d.pending,0);assert.equal(d.completionRate,100);
 h.ctx.installWorkers_();h.ctx.installWorkers_();assert.equal(h.triggers.length,3);
});
