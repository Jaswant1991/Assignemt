// Editor-only functions: trailing underscore prevents google.script.run access.
function setupERP_() {
  requireWorker_();
  var cfg = getConfig_(), email = email_(cfg.bootstrapAdmin);
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var db = SpreadsheetApp.openById(requireSpreadsheetId_());
    // Preflight existing sheets before creating anything. Never replace data.
    Object.keys(SCHEMA_).forEach(function(n) {
      var sh = db.getSheetByName(n);
      if (sh && sh.getLastRow()) assert_(sh.getLastColumn() === SCHEMA_[n].split(',').length &&
        sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].join(',') === SCHEMA_[n], 'Existing schema mismatch: ' + n);
    });
    Object.keys(SCHEMA_).forEach(function(n) {
      var sh = db.getSheetByName(n) || db.insertSheet(n), h = SCHEMA_[n].split(',');
      if (!sh.getLastRow()) {
        sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#17365d').setFontColor('#ffffff');
        sh.setFrozenRows(1);
        sh.getRange(2,1,Math.max(1,sh.getMaxRows()-1),h.length).setNumberFormat('@');
      }
    });
    recover_(db);
    if (!read_(db,'Users').length) {
      var ts=now_(), admin={userId:id_(),name:'ERP Administrator',email:email,role:'ADMIN',departmentId:'',
        managerUserId:'',mobile:'',status:'ACTIVE',createdAt:ts,updatedAt:ts};
      commit_(db,[{table:'Users',record:admin},audit_(admin,'User',admin.userId,'BOOTSTRAP','Initial administrator')]);
    }
    if (!read_(db,'Settings').some(function(s){return s.key === 'schemaVersion';}))
      commit_(db,[{table:'Settings',record:{key:'schemaVersion',value:'2',description:'ERP schema version',updatedByUserId:'SETUP',updatedAt:now_()}}]);
    return 'Database ready. Configure AUTH_MODE and test Google identity before deployment.';
  } finally {lock.releaseLock();}
}
function installWorkers_() {
  requireWorker_();
  withDb_(function(db){requireAdmin_(requireUser_(db));});
  ['generateRecurringOccurrences_','queueOverdueNotifications_','processNotificationOutbox_'].forEach(function(name) {
    if (!ScriptApp.getProjectTriggers().some(function(t){return t.getHandlerFunction() === name;}))
      ScriptApp.newTrigger(name).timeBased().everyHours(1).create();
  });
}
