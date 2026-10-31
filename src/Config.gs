function getConfig_() {
  var p = PropertiesService.getScriptProperties();
  return {
    spreadsheetId: p.getProperty('SPREADSHEET_ID') || '',
    authMode: p.getProperty('AUTH_MODE') || 'UNCONFIGURED',
    allowedDomain: String(p.getProperty('ALLOWED_DOMAIN') || '').toLowerCase(),
    bootstrapAdmin: String(p.getProperty('BOOTSTRAP_ADMIN_EMAIL') || '').toLowerCase(),
    workerEmail: String(p.getProperty('WORKER_EMAIL') || '').toLowerCase(),
    notificationsEnabled: p.getProperty('NOTIFICATIONS_ENABLED') === 'true',
    emailAllowlist: String(p.getProperty('EMAIL_ALLOWLIST') || '').toLowerCase().split(',').map(function(s){return s.trim();}).filter(Boolean),
    escalationDays: Math.max(1, Number(p.getProperty('ESCALATION_DAYS')) || 3)
  };
}
function requireSpreadsheetId_() {
  var id = getConfig_().spreadsheetId;
  if (!/^[a-zA-Z0-9_-]{20,}$/.test(id) || /REPLACE/.test(id)) throw new Error('Configure SPREADSHEET_ID in Script Properties.');
  return id;
}
function now_() { return new Date().toISOString(); }
function today_() { return Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd'); }
function id_() { return Utilities.getUuid(); }
function assert_(condition, message) { if (!condition) throw new Error(message); }
function text_(value, max, required) {
  assert_(typeof value === 'string', 'Expected text.');
  var s = value.trim();
  assert_(s.length <= max && (!required || s.length > 0), 'Invalid text length.');
  return s;
}
function date_(value, required) {
  if (!value && !required) return '';
  assert_(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), 'Use YYYY-MM-DD dates.');
  var d = new Date(value + 'T00:00:00Z');
  assert_(!isNaN(d.getTime()) && d.toISOString().slice(0,10) === value, 'Invalid date.');
  return value;
}
function enum_(value, values) { assert_(values.indexOf(value) >= 0, 'Invalid option.'); return value; }
function email_(value) {
  var e = text_(value, 254, true).toLowerCase();
  assert_(/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(e), 'Invalid email.');
  var domain = getConfig_().allowedDomain;
  assert_(domain && e.split('@')[1] === domain, 'Email must belong to ALLOWED_DOMAIN.');
  return e;
}
function attachment_(value) {
  var s = text_(value || '', 500, false);
  assert_(!s || /^https:\/\/drive\.google\.com\/(file\/d\/[a-zA-Z0-9_-]+|open\?id=[a-zA-Z0-9_-]+)([/?#].*)?$/.test(s), 'Use a Google Drive file URL.');
  return s;
}
function fields_(input, allowed) {
  assert_(input && typeof input === 'object' && !Array.isArray(input), 'Expected a record.');
  Object.keys(input).forEach(function(k){assert_(allowed.indexOf(k) >= 0, 'Unsupported field: ' + k);});
}
