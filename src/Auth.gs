function requireUser_(db) {
  var cfg = getConfig_();
  assert_(cfg.authMode === 'GOOGLE_WORKSPACE' && cfg.allowedDomain, 'Authentication is not configured. Access denied.');
  var email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  assert_(email && email.split('@')[1] === cfg.allowedDomain, 'Google identity unavailable or outside allowed domain. Access denied.');
  var matches = read_(db,'Users').filter(function(u){return u.email === email;});
  assert_(matches.length === 1 && isActiveUser_(matches[0]), 'User is missing, inactive or invalid. Access denied.');
  return matches[0];
}
function getSession() {
  return api_(function(db,user){return {user:user,role:canonicalRole_(user.role)};});
}
function requireAdmin_(user) { assert_(canManageUsers_(user), 'Admin access required.'); }
function requireWorker_() {
  var configured = getConfig_().workerEmail;
  assert_(configured && String(Session.getEffectiveUser().getEmail() || '').toLowerCase() === configured, 'Worker owner is not configured or does not match.');
}
