function listTasks() {
  var user = requireUser_();
  // TODO: Read database and filter EACH row using canViewTask_(user, task).
  throw new Error('Task listing is not implemented.');
}
function createTask(input) {
  var user = requireUser_();
  // TODO: Resolve doer server-side; enforce canAssignTo_, validate input,
  // derive assigner/department, lock writes, issue UUID and append audit/outbox.
  throw new Error('Task creation is not implemented.');
}
function updateTask(taskId, changes, expectedVersion) {
  var user = requireUser_();
  // TODO: Fetch persisted task; enforce field permissions and optimistic version.
  throw new Error('Task updates are not implemented.');
}
