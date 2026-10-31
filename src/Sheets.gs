function openDatabase_() {
  // TODO: Validate schema version/headers before returning a database adapter.
  requireSpreadsheetId_();
  throw new Error('Sheets adapter is not implemented.');
}
