# Apps Script API
Use google.script.run with both success and failure handlers. Every listed business method authenticates the caller; errors are thrown and shown through the failure handler.
Calendar dates are YYYY-MM-DD strings; timestamps ISO UTC. No input may contain server-owned fields.

| Method | Input / behavior |
| --- | --- |
| getSession() | Current active user and canonical role |
| getWorkspace() | Scoped tasks, recurring rules, doers, reference names/departments and dashboard |
| listTasks(), getDashboard(), listRecurring() | Scoped standalone data endpoints |
| listUsers() | Admin-only complete user directory |
| listDepartments() | Admin: all; MD: active; Manager/Staff: own active department |
| saveDepartment(input) | Admin; departmentId optional for create; departmentName, managerUserId optional, status required |
| saveUser(input) | Admin; userId and expectedUpdatedAt for edits; name, email, role, departmentId, managerUserId, mobile, status |
| createTask(input) | requestId, doerUserId, targetDate, description, priority, attachmentUrl optional |
| updateTask(taskId, changes, expectedVersion) | Managers: description, attachmentUrl, priority, doerUserId, targetDate, revisionReason, status, remarks. Staff: status and remarks only |
| saveRecurring(input) | ruleId/expectedVersion for edits, requestId for creates; taskName, description, doerUserId, frequency, startDate, endDate optional, priority, attachmentUrl optional, status |

requestId must be a fresh random 12–80 character alphanumeric/hyphen/underscore token per new form. Preserve it when retrying the same create request after a network failure. Browser forms generate UUIDs.
A duplicate task create returns the existing task without overwriting it; recurring create does likewise. A retry with changed content must use a new requestId to create a separate record.
Updates use optimistic concurrency; after a stale/ambiguous response, refresh and inspect the record before retrying.
There are no unauthenticated business methods, public worker/setup endpoints, password reset endpoints or browser role-switch APIs.

## Editor-only operations
- setupERP_: initialize missing database tables and first Admin.
- installWorkers_: install three hourly triggers under the approved worker account.
- generateRecurringOccurrences_: bounded occurrence generation.
- queueOverdueNotifications_: daily overdue reminders/escalations.
- processNotificationOutbox_: approved recipient mail delivery.
Do not remove the trailing underscore or expose these through a wrapper without re-evaluating authorization.
