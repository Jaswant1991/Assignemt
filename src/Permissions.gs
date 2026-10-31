// Pure helpers. Call only with a server-resolved, active Users record.
function canonicalRole_(role) {
  var r = String(role || '').trim().toUpperCase();
  if (r === 'HOD') return 'MANAGER';
  if (r === 'EMPLOYEE') return 'STAFF';
  return ['ADMIN', 'MD', 'MANAGER', 'STAFF'].indexOf(r) >= 0 ? r : '';
}
function isActiveUser_(user) {
  return !!user && !!user.userId && user.status === 'ACTIVE' && !!canonicalRole_(user.role);
}
function canManageUsers_(user) {
  return isActiveUser_(user) && canonicalRole_(user.role) === 'ADMIN';
}
function canViewTask_(user, task) {
  if (!isActiveUser_(user) || !task) return false;
  var role = canonicalRole_(user.role);
  if (role === 'ADMIN' || role === 'MD') return true;
  if (role === 'MANAGER') return !!user.departmentId && task.departmentId === user.departmentId;
  return task.doerUserId === user.userId;
}
function canAssignTo_(actor, doer) {
  if (!isActiveUser_(actor) || !isActiveUser_(doer)) return false;
  var role = canonicalRole_(actor.role);
  return role === 'ADMIN' || role === 'MD' ||
    (role === 'MANAGER' && !!actor.departmentId && actor.departmentId === doer.departmentId);
}
