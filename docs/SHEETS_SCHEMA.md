# Google Sheets schema — version 2
Exact ordered headers are defined in src/Sheets.gs. setupERP_ creates missing tables and refuses mismatched existing headers.
One row per record, no merged cells, formulas, blank gaps or duplicate IDs. Data cells use plain-text formatting. IDs are server-generated UUIDs except deterministic task/rule/occurrence/event keys for retries. Calendar dates are YYYY-MM-DD strings; timestamps are ISO 8601 UTC strings. User text starting with spreadsheet formula characters is escaped on write. Numeric versions/attempts may be numeric cells.

| Tab | Ordered headers |
| --- | --- |
| Users | userId, name, email, role, departmentId, managerUserId, mobile, status, createdAt, updatedAt |
| Departments | departmentId, departmentName, managerUserId, status |
| Delegation | taskId, recurringRuleId, scheduledDate, assignerUserId, doerUserId, departmentId, assignedAt, targetDate, revisionDate, completedAt, description, attachmentUrl, priority, status, remarks, version, createdAt, updatedAt |
| Recurring | ruleId, taskName, description, doerUserId, assignerUserId, departmentId, frequency, startDate, endDate, nextDueDate, priority, attachmentUrl, status, version, createdAt, updatedAt |
| TaskRevisions | revisionId, taskId, oldTargetDate, newTargetDate, reason, changedByUserId, changedAt |
| NotificationOutbox | notificationId, eventKey, taskId, recipientUserId, eventType, status, attempts, nextAttemptAt, sentAt, lastError, createdAt |
| AuditLog | auditId, actorUserId, entityType, entityId, action, changeSummary, createdAt |
| Settings | key, value, description, updatedByUserId, updatedAt |
| Operations | operationId, status, payload, createdAt |

## Directory
Users emails are unique, normalized lowercase and must match ALLOWED_DOMAIN. Stored roles ADMIN/MD/MANAGER/STAFF; HOD and EMPLOYEE are accepted input aliases. Status ACTIVE/INACTIVE. Manager/Staff require an active department when saved.
Departments have unique names and IDs, optional active Admin/Manager managerUserId, and ACTIVE/INACTIVE status. Existing records are retained on deactivation.
managerUserId is a reporting reference, not an additional access grant. Team scope is the departmentId on the task/rule.

## Delegation and revisions
Required fields: doer, description and targetDate. Assigner is the authenticated user; department derives from the doer's current record.
Priority LOW/NORMAL/HIGH/URGENT. Status OPEN/IN_PROGRESS/COMPLETED/CANCELLED. completedAt is set on completion and cleared on reopen/cancel. version starts at 1.
Initial targetDate is preserved. revisionDate stores the latest revised deadline; effective due = revisionDate || targetDate. Each deadline change needs a reason and creates a TaskRevisions record.
Manager/Admin/MD can revise and reopen tasks in scope. Staff can only update their own active task to IN_PROGRESS/COMPLETED and add remarks.
Task department remains a historical snapshot until reassignment. A staff member transferring departments still sees their own tasks; managers see tasks whose stored department matches their current department. Reassign explicitly if historical scope must change.

## Recurrence
Frequency DAILY/WEEKLY/MONTHLY/QUARTERLY/YEARLY; status ACTIVE/PAUSED/ENDED. startDate/frequency cannot change after creation; endDate may be edited.
nextDueDate starts at startDate, which can be in the past. Month-end anniversaries clamp to the last valid day using the original start day, avoiding drift; leap-year anniversaries recover February 29 when valid. endDate is inclusive.
Worker checks assigner and doer are active and assignment is still permitted; a changed doer department suspends generation until an authorized rule edit updates the scope.
Each generated Delegation ID derives from ruleId + scheduledDate. Rules and tasks are written through one recovery operation. Completion of an occurrence does not control the next occurrence.
Paused schedules retain nextDueDate; resuming catches up missed dates within worker limits. Exhausted schedules require a new rule rather than an empty next date.

## Outbox, audit and journal
Notification event keys include taskId/version/event/recipient and a local date suffix for daily overdue/escalation deduplication. Status PENDING/SENT/FAILED/SKIPPED. Retry count increases on send/policy failures; up to 5 attempts. Only approved allowlisted recipients with current visibility can receive task details.
Audit records actor, entity, action and a concise change summary; it is not a complete field-by-field before/after log.
Operations contains JSON arrays of intended table/record upserts, status PENDING/DONE. It is internal recovery state, not a user-editable table. A replay uses stable IDs, so partially applied writes can be retried without extra records.
Settings currently records schemaVersion=2. Runtime policy/configuration is read from Script Properties, not arbitrary Settings values.

## Dashboard definitions
Pending = OPEN + IN_PROGRESS. Overdue = pending and effective due before today's Asia/Kolkata date. Due soon = pending due today through the next 7 calendar days inclusive.
Completion rate = completed / (total - cancelled), or zero if denominator is zero. Performance table groups the same authorized rows by doer.
Date filters use assignment date in Asia/Kolkata. CSV exports the currently filtered authorized task rows. There are no holiday/business-day adjustments.
