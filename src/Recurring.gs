function ruleVisible_(u,r) {return canViewTask_(u,r);}
function listRecurring() {return api_(function(db,u){return read_(db,'Recurring').filter(function(r){return ruleVisible_(u,r);});});}
function saveRecurring(input) {
  return api_(function(db,u) {
    fields_(input,['ruleId','expectedVersion','requestId','taskName','description','doerUserId','frequency','startDate','endDate','priority','attachmentUrl','status']);
    assert_(['ADMIN','MD','MANAGER'].indexOf(canonicalRole_(u.role)) >= 0, 'Assignment role required.');
    var old=input.ruleId ? find_(db,'Recurring',input.ruleId) : null;
    if (old) {
      assert_(ruleVisible_(u,old), 'Access denied.');
      assert_(Number(old.version) === Number(input.expectedVersion), 'Rule changed. Refresh.');
    }
    var doer=find_(db,'Users',input.doerUserId); assert_(canAssignTo_(u,doer), 'Invalid doer.');
    var start=date_(input.startDate,true), end=date_(input.endDate,false);
    assert_(!end || end >= start, 'End date precedes start date.');
    var frequency=enum_(input.frequency,['DAILY','WEEKLY','MONTHLY','QUARTERLY','YEARLY']);
    if (old) assert_(start === old.startDate && frequency === old.frequency, 'Create a new rule to change the schedule.');
    assert_(old || /^[a-zA-Z0-9_-]{12,80}$/.test(input.requestId || ''), 'Request ID required.');
    var ruleId=old ? old.ruleId : 'RULE-' + u.userId + '-' + input.requestId;
    var duplicate=read_(db,'Recurring').find(function(r){return r.ruleId === ruleId;});
    if (!old && duplicate) {assert_(ruleVisible_(u,duplicate),'Access denied.');return duplicate;}
    var ts=now_(), r={ruleId:ruleId,taskName:text_(input.taskName,200,true),description:text_(input.description,3000,true),
      doerUserId:doer.userId,assignerUserId:old ? old.assignerUserId : u.userId,departmentId:doer.departmentId,
      frequency:frequency,startDate:start,endDate:end,nextDueDate:old ? old.nextDueDate : start,
      priority:enum_(input.priority,['LOW','NORMAL','HIGH','URGENT']),attachmentUrl:attachment_(input.attachmentUrl || ''),
      status:enum_(input.status,['ACTIVE','PAUSED','ENDED']),version:old ? Number(old.version)+1 : 1,createdAt:old ? old.createdAt : ts,updatedAt:ts};
    if (r.status === 'ACTIVE') assert_(r.nextDueDate && (!end || r.nextDueDate <= end), 'Schedule exhausted. Create a new rule.');
    commit_(db,[{table:'Recurring',record:r},audit_(u,'Recurring',r.ruleId,old ? 'UPDATE' : 'CREATE',r.taskName)]);
    return r;
  });
}
function nextOccurrence_(r,current) {
  var start=new Date(r.startDate+'T00:00:00Z'), d=new Date(current+'T00:00:00Z');
  if (r.frequency === 'DAILY' || r.frequency === 'WEEKLY') d.setUTCDate(d.getUTCDate()+(r.frequency === 'DAILY' ? 1 : 7));
  else {
    var step={MONTHLY:1,QUARTERLY:3,YEARLY:12}[r.frequency];
    assert_(step, 'Invalid frequency.');
    var month=d.getUTCMonth()+step, year=d.getUTCFullYear();
    var last=new Date(Date.UTC(year,month+1,0)).getUTCDate();
    d=new Date(Date.UTC(year,month,Math.min(start.getUTCDate(),last)));
  }
  return d.toISOString().slice(0,10);
}
function generateRecurringOccurrences_() {
  requireWorker_();
  return withDb_(function(db) {
    var count=0, today=today_();
    read_(db,'Recurring').filter(function(r){return r.status === 'ACTIVE';}).forEach(function(r) {
      var assigner=find_(db,'Users',r.assignerUserId), doer=find_(db,'Users',r.doerUserId);
      if (!canAssignTo_(assigner,doer) || doer.departmentId !== r.departmentId) return;
      var perRule=0;
      while (r.nextDueDate && r.nextDueDate <= today && count < 100 && perRule < 25) {
        if (r.endDate && r.nextDueDate > r.endDate) {r.status='ENDED'; break;}
        var due=r.nextDueDate, key='OCC-' + r.ruleId + '-' + due;
        var exists=read_(db,'Delegation').some(function(t){return t.taskId === key;});
        var writes=[], next=nextOccurrence_(r,due);
        if (!exists) {
          var task=newTask_(assigner,doer,{description:r.taskName+'\n'+r.description,targetDate:due,priority:r.priority,attachmentUrl:r.attachmentUrl},key,r.ruleId,due);
          writes.push({table:'Delegation',record:task},audit_(assigner,'Task',key,'RECURRING','Scheduled occurrence'));
          writes=writes.concat(notificationWrites_(db,task,'ASSIGNED',[doer.userId]));
        }
        r.nextDueDate=next; r.version=Number(r.version)+1; r.updatedAt=now_();
        if (r.endDate && next > r.endDate) r.status='ENDED';
        writes.push({table:'Recurring',record:r});
        commit_(db,writes);count++;perRule++;
        if (r.status !== 'ACTIVE') break;
      }
      if (r.status === 'ENDED') commit_(db,[{table:'Recurring',record:r}]);
    });
    return {processed:count};
  });
}
