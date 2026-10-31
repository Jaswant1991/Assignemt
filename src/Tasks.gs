function effectiveDue_(task) { return task.revisionDate || task.targetDate; }
function taskManager_(user,task) {
  return canViewTask_(user,task) && ['ADMIN','MD','MANAGER'].indexOf(canonicalRole_(user.role)) >= 0;
}
function listTasks() {return api_(function(db,user){return visibleTasks_(db,user);});}
function visibleTasks_(db,user) {
  return read_(db,'Delegation').filter(function(t){return canViewTask_(user,t);});
}
function newTask_(user,doer,input,taskId,recurringRuleId,scheduledDate) {
  var ts=now_();
  return {taskId:taskId || id_(),recurringRuleId:recurringRuleId || '',scheduledDate:scheduledDate || '',
    assignerUserId:user.userId,doerUserId:doer.userId,departmentId:doer.departmentId,assignedAt:ts,
    targetDate:date_(input.targetDate,true),revisionDate:'',completedAt:'',
    description:text_(input.description,3000,true),attachmentUrl:attachment_(input.attachmentUrl || ''),
    priority:enum_(input.priority,['LOW','NORMAL','HIGH','URGENT']),status:'OPEN',remarks:'',version:1,createdAt:ts,updatedAt:ts};
}
function createTask(input) {
  return api_(function(db,user) {
    fields_(input,['requestId','doerUserId','targetDate','description','attachmentUrl','priority']);
    assert_(/^[a-zA-Z0-9_-]{12,80}$/.test(input.requestId || ''), 'A unique request ID is required.');
    var key='T-' + user.userId + '-' + input.requestId;
    var existing=read_(db,'Delegation').find(function(t){return t.taskId === key;});
    if (existing) {assert_(canViewTask_(user,existing), 'Access denied.');return existing;}
    var doer=find_(db,'Users',input.doerUserId);
    assert_(canAssignTo_(user,doer), 'You cannot assign to this user.');
    var task=newTask_(user,doer,input,key);
    commit_(db,[{table:'Delegation',record:task},audit_(user,'Task',task.taskId,'CREATE','Task assigned')].concat(notificationWrites_(db,task,'ASSIGNED',[doer.userId])));
    return task;
  });
}
function updateTask(taskId, changes, expectedVersion) {
  return api_(function(db,user) {
    var old=find_(db,'Delegation',taskId);
    assert_(canViewTask_(user,old), 'Access denied.');
    assert_(Number(expectedVersion) === Number(old.version), 'Task changed. Refresh before saving.');
    var manager=taskManager_(user,old), own=old.doerUserId === user.userId;
    fields_(changes,manager ? ['description','attachmentUrl','priority','doerUserId','targetDate','revisionReason','status','remarks'] : ['status','remarks']);
    assert_(manager || own, 'Access denied.');
    var t=Object.assign({},old), writes=[], events=[];
    if ('remarks' in changes) t.remarks=text_(changes.remarks,2000,false);
    if ('status' in changes) {
      t.status=enum_(changes.status,['OPEN','IN_PROGRESS','COMPLETED','CANCELLED']);
      if (!manager) {
        assert_(['OPEN','IN_PROGRESS'].indexOf(old.status) >= 0, 'Closed tasks require manager action.');
        assert_(['IN_PROGRESS','COMPLETED'].indexOf(t.status) >= 0, 'Invalid staff transition.');
      }
      t.completedAt=t.status === 'COMPLETED' ? (old.completedAt || now_()) : '';
      if (t.status === 'COMPLETED' && old.status !== 'COMPLETED') events.push('COMPLETED');
    }
    if ('description' in changes) t.description=text_(changes.description,3000,true);
    if ('attachmentUrl' in changes) t.attachmentUrl=attachment_(changes.attachmentUrl);
    if ('priority' in changes) t.priority=enum_(changes.priority,['LOW','NORMAL','HIGH','URGENT']);
    if ('doerUserId' in changes && changes.doerUserId !== old.doerUserId) {
      var doer=find_(db,'Users',changes.doerUserId);
      assert_(canAssignTo_(user,doer), 'Invalid assignee scope.');
      t.doerUserId=doer.userId; t.departmentId=doer.departmentId; events.push('ASSIGNED');
    }
    if ('targetDate' in changes && changes.targetDate !== effectiveDue_(old)) {
      t.revisionDate=date_(changes.targetDate,true);
      writes.push({table:'TaskRevisions',record:{revisionId:id_(),taskId:t.taskId,oldTargetDate:effectiveDue_(old),
        newTargetDate:t.revisionDate,reason:text_(changes.revisionReason || '',500,true),changedByUserId:user.userId,changedAt:now_()}});
      events.push('DEADLINE_CHANGED');
    }
    t.version=Number(old.version)+1; t.updatedAt=now_();
    writes.push({table:'Delegation',record:t},audit_(user,'Task',t.taskId,'UPDATE',Object.keys(changes).join(', ')));
    events.forEach(function(e){writes=writes.concat(notificationWrites_(db,t,e,e === 'ASSIGNED' ? [t.doerUserId] : [t.assignerUserId]));});
    commit_(db,writes); return t;
  });
}
