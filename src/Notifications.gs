function notificationWrites_(db,task,event,recipients,suffix) {
  if (!getConfig_().notificationsEnabled) return [];
  var existing=read_(db,'NotificationOutbox');
  return recipients.filter(function(id,i,a){return id && a.indexOf(id) === i;}).map(function(recipient) {
    var key=[task.taskId,task.version,event,recipient,suffix || ''].join(':');
    if (existing.some(function(n){return n.eventKey === key;})) return null;
    return {table:'NotificationOutbox',record:{notificationId:key,eventKey:key,taskId:task.taskId,recipientUserId:recipient,
      eventType:event,status:'PENDING',attempts:0,nextAttemptAt:now_(),sentAt:'',lastError:'',createdAt:now_()}};
  }).filter(Boolean);
}
function queueOverdueNotifications_() {
  requireWorker_();
  if (!getConfig_().notificationsEnabled) return {queued:0,disabled:true};
  return withDb_(function(db) {
    var queued=0,today=today_(), cfg=getConfig_();
    read_(db,'Delegation').filter(function(t){return ['OPEN','IN_PROGRESS'].indexOf(t.status) >= 0 && effectiveDue_(t) < today;}).forEach(function(t) {
      if (queued >= 100) return;
      var age=Math.floor((new Date(today+'T00:00:00Z')-new Date(effectiveDue_(t)+'T00:00:00Z'))/86400000);
      var writes=notificationWrites_(db,t,'OVERDUE',[t.doerUserId],today);
      if (age >= cfg.escalationDays) writes=writes.concat(notificationWrites_(db,t,'ESCALATION',[t.assignerUserId],today));
      if (writes.length) {commit_(db,writes);queued+=writes.length;}
    });
    return {queued:queued};
  });
}
function processNotificationOutbox_() {
  var cfg=getConfig_();
  if (!cfg.notificationsEnabled) return {sent:0,disabled:true};
  requireWorker_();
  assert_(cfg.emailAllowlist.length, 'Set EMAIL_ALLOWLIST before email delivery.');
  return withDb_(function(db) {
    var sent=0,ts=now_(), quota=Math.min(20,MailApp.getRemainingDailyQuota());
    read_(db,'NotificationOutbox').filter(function(n){return n.status === 'PENDING' && n.nextAttemptAt <= ts;}).slice(0,quota).forEach(function(n) {
      try {
        var user=find_(db,'Users',n.recipientUserId), task=find_(db,'Delegation',n.taskId);
        // Recipient must still have task visibility at send time.
        assert_(canViewTask_(user,task) && cfg.emailAllowlist.indexOf(user.email) >= 0, 'Recipient inactive, out of scope, or absent from EMAIL_ALLOWLIST.');
        if (['OVERDUE','ESCALATION'].indexOf(n.eventType) >= 0 && (['OPEN','IN_PROGRESS'].indexOf(task.status) < 0 || effectiveDue_(task) >= today_())) {
          n.status='SKIPPED'; n.lastError='Task is no longer overdue.';
        } else {
          MailApp.sendEmail({to:user.email,subject:'ERP: '+n.eventType.replace(/_/g,' '),
            body:'Hello '+user.name+',\n\nTask: '+task.description+'\nStatus: '+task.status+'\nDue: '+effectiveDue_(task)+'\nTask ID: '+task.taskId+'\n\nPlease open your ERP dashboard for current details.'});
          n.status='SENT';n.sentAt=now_();sent++;
        }
      } catch (e) {
        n.attempts=Number(n.attempts)+1;n.lastError=String(e.message).slice(0,500);
        n.status=n.attempts >= 5 ? 'FAILED' : 'PENDING';
        n.nextAttemptAt=new Date(Date.now()+Math.pow(2,n.attempts)*3600000).toISOString();
      }
      commit_(db,[{table:'NotificationOutbox',record:n}]);
    });
    return {sent:sent};
  });
}
