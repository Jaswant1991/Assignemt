function getConfig_() {
  var p = PropertiesService.getScriptProperties();
  return {
    spreadsheetId: p.getProperty('SPREADSHEET_ID') || '',
    authMode: p.getProperty('AUTH_MODE') || 'UNCONFIGURED',
    notificationsEnabled: p.getProperty('NOTIFICATIONS_ENABLED') === 'true'
  };
}
function requireSpreadsheetId_() {
  var id = getConfig_().spreadsheetId;
  if (!id || id.indexOf('REPLACE') !== -1) throw new Error('Spreadsheet is not configured.');
  return id;
}
