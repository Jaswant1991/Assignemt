function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate().setTitle('Task Management ERP');
}
function include_(name) {
  if (['Styles', 'JavaScript'].indexOf(name) === -1) throw new Error('Invalid template.');
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}
