var SCHEMA_ = {
  Users: 'userId,name,email,role,departmentId,managerUserId,mobile,status,createdAt,updatedAt',
  Departments: 'departmentId,departmentName,managerUserId,status',
  Delegation: 'taskId,recurringRuleId,scheduledDate,assignerUserId,doerUserId,departmentId,assignedAt,targetDate,revisionDate,completedAt,description,attachmentUrl,priority,status,remarks,version,createdAt,updatedAt',
  Recurring: 'ruleId,taskName,description,doerUserId,assignerUserId,departmentId,frequency,startDate,endDate,nextDueDate,priority,attachmentUrl,status,version,createdAt,updatedAt',
  TaskRevisions: 'revisionId,taskId,oldTargetDate,newTargetDate,reason,changedByUserId,changedAt',
  NotificationOutbox: 'notificationId,eventKey,taskId,recipientUserId,eventType,status,attempts,nextAttemptAt,sentAt,lastError,createdAt',
  AuditLog: 'auditId,actorUserId,entityType,entityId,action,changeSummary,createdAt',
  Settings: 'key,value,description,updatedByUserId,updatedAt',
  Operations: 'operationId,status,payload,createdAt'
};
function openDatabase_() {
  var ss = SpreadsheetApp.openById(requireSpreadsheetId_());
  Object.keys(SCHEMA_).forEach(function(name) {
    var sh = ss.getSheetByName(name);
    assert_(sh && sh.getLastColumn() === SCHEMA_[name].split(',').length &&
      sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].join(',') === SCHEMA_[name],
      'Schema mismatch: ' + name + '. Run setupERP_ for a new database.');
  });
  return ss;
}
function read_(db, name) {
  var h = SCHEMA_[name].split(','), sh = db.getSheetByName(name);
  if (sh.getLastRow() < 2) return [];
  var values=sh.getRange(2,1,sh.getLastRow()-1,h.length).getValues(), seen={};
  values.forEach(function(r){assert_(r[0] !== '' && !seen[String(r[0])], 'Blank or duplicate record ID in ' + name);seen[String(r[0])]=true;});
  return values.map(function(r) {
    var o = {}; h.forEach(function(k,i) { o[k] = r[i] instanceof Date ? r[i].toISOString() : r[i]; }); return o;
  });
}
function cell_(v) {
  if (v === undefined || v === null) return '';
  return typeof v === 'string' && /^[=+\-@'\t\r\n]/.test(v) ? "'" + v : v;
}
function upsert_(db, name, record) {
  assert_(Object.prototype.hasOwnProperty.call(SCHEMA_,name), 'Invalid table.');
  var h = SCHEMA_[name].split(','), key = record[h[0]];
  assert_(key !== undefined && key !== '', 'Missing record ID.');
  var rows = read_(db,name), idx = rows.findIndex(function(r){return r[h[0]] === key;});
  // Blank rows are forbidden in initialized source tables.
  var sh = db.getSheetByName(name);
  var row = idx < 0 ? sh.getLastRow()+1 : idx+2;
  sh.getRange(row,1,1,h.length).setValues([h.map(function(k){return cell_(record[k]);})]);
}
function applyWrites_(db, writes) {
  writes.forEach(function(w){upsert_(db,w.table,w.record);});
  SpreadsheetApp.flush();
}
function recover_(db) {
  read_(db,'Operations').filter(function(o){return o.status === 'PENDING';}).forEach(function(o) {
    applyWrites_(db,JSON.parse(o.payload));
    o.status = 'DONE'; upsert_(db,'Operations',o); SpreadsheetApp.flush();
  });
}
function commit_(db, writes) {
  var payload = JSON.stringify(writes);
  assert_(payload.length <= 45000, 'Operation too large.');
  var op = {operationId:id_(),status:'PENDING',payload:payload,createdAt:now_()};
  upsert_(db,'Operations',op); SpreadsheetApp.flush();
  applyWrites_(db,writes);
  op.status = 'DONE'; upsert_(db,'Operations',op); SpreadsheetApp.flush();
}
function withDb_(fn) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try { var db = openDatabase_(); recover_(db); return fn(db); } finally { lock.releaseLock(); }
}
function api_(fn) { return withDb_(function(db){return fn(db,requireUser_(db));}); }
function audit_(actor, type, id, action, summary) {
  return {table:'AuditLog',record:{auditId:id_(),actorUserId:actor.userId,entityType:type,entityId:id,action:action,changeSummary:summary,createdAt:now_()}};
}
function find_(db, table, key) {
  var h = SCHEMA_[table].split(',')[0];
  var row = read_(db,table).find(function(r){return r[h] === key;});
  assert_(row, 'Record not found.'); return row;
}
