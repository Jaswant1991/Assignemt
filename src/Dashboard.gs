function dashboard_(tasks) {
  var today=today_(), soon=new Date(today+'T00:00:00Z');soon.setUTCDate(soon.getUTCDate()+7);
  var end=soon.toISOString().slice(0,10), result={total:tasks.length,pending:0,completed:0,cancelled:0,overdue:0,dueSoon:0,byUser:{}};
  tasks.forEach(function(t) {
    var b=result.byUser[t.doerUserId] || {total:0,completed:0,pending:0,overdue:0};
    b.total++;
    if (t.status === 'COMPLETED') {result.completed++;b.completed++;}
    else if (t.status === 'CANCELLED') result.cancelled++;
    else {
      result.pending++; b.pending++;
      if (effectiveDue_(t) < today) {result.overdue++;b.overdue++;}
      else if (effectiveDue_(t) <= end) result.dueSoon++;
    }
    result.byUser[t.doerUserId]=b;
  });
  result.completionRate=result.total-result.cancelled ? Math.round(100*result.completed/(result.total-result.cancelled)) : 0;
  return result;
}
function getDashboard() {return api_(function(db,u){return dashboard_(visibleTasks_(db,u));});}
function getWorkspace() {
  return api_(function(db,u) {
    var tasks=visibleTasks_(db,u), users=read_(db,'Users'), needed={};needed[u.userId]=true;
    tasks.forEach(function(t){needed[t.doerUserId]=true;needed[t.assignerUserId]=true;});
    var rules=read_(db,'Recurring').filter(function(r){return ruleVisible_(u,r);});
    rules.forEach(function(r){needed[r.doerUserId]=true;});
    return {user:u,role:canonicalRole_(u.role),tasks:tasks,recurring:rules,doers:doers_(db,u),dashboard:dashboard_(tasks),
      names:users.filter(function(x){return needed[x.userId];}).map(function(x){return {userId:x.userId,name:x.name};}),
      departments:read_(db,'Departments').filter(function(d){return canonicalRole_(u.role) === 'ADMIN' || canonicalRole_(u.role) === 'MD' || d.departmentId === u.departmentId;})};
  });
}
