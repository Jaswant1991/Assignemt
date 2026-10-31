# Google Sheets data contract
Proposed version 1. Header names below are exact, ordered camelCase keys. One record per row; no merged cells or formulas in source tables. Readers must validate headers and fail on mismatch. IDs are server-generated UUID strings; email is normalized lowercase. Use native date cells for timestamps, serialize ISO 8601 to clients, and format business dates in Asia/Kolkata. Empty optional dates stay empty.

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

## Constraints
- Users: unique userId and email; role ADMIN/MD/MANAGER/HOD/STAFF/EMPLOYEE; status ACTIVE/INACTIVE. managerUserId optional. No password column.
- Departments: unique ID and name; manager must reference an active manager/admin. Scope uses departmentId, not display names.
- Delegation: doer/assigner/department references required; description and targetDate required; priority LOW/NORMAL/HIGH/URGENT. Status OPEN/IN_PROGRESS/COMPLETED/CANCELLED. completedAt required only when COMPLETED. version starts at 1 and increments on every change.
- TaskRevisions: preserve full deadline history; revisionDate in Delegation is the latest revised deadline. Effective due date is revisionDate when set, otherwise targetDate. Log old and new effective due dates.
- Recurring: frequency DAILY/WEEKLY/MONTHLY/QUARTERLY/YEARLY; status ACTIVE/PAUSED/ENDED; startDate <= endDate when present. Due dates are local calendar dates. Clamp month-end anniversaries to the last valid day; derive from original startDate to avoid drift. endDate is inclusive.
- Each recurrence generates an independent Delegation task. Unique (recurringRuleId, scheduledDate); blank recurring fields for one-time tasks. Advance nextDueDate only after a successful durable occurrence write.
- Outbox: unique eventKey includes task/version/event/recipient; status PENDING/PROCESSING/SENT/FAILED. Decide lease timeout, retry cap and quota policy before implementation. Email delivery may be at least once; document the send/mark crash window.
- Settings contains non-secret business values only (schemaVersion=1, display name, approved SLA rules). Script Properties hold deployment configuration; use an appropriate secret store for sensitive credentials.
- Attachment URLs optional; restrict to approved Drive links and sharing scope. Do not treat a link as authorization.

## Writes and reports
Validate references and enumerations on the server. Use LockService plus optimistic version checks. Google Sheets has no multi-table transaction: design idempotent operation IDs and recovery for partial task/audit/outbox writes. Escape formula-leading text (=, +, -, @) before writing user input to cells; reject invalid dates and unsafe URLs. Batch reads/writes as volume grows.
Dashboard definitions: pending = OPEN + IN_PROGRESS; overdue = pending with effective due date before today's local date; due soon = pending within the configured window. Completed metrics use completedAt. Exclude cancelled tasks from completion rates and document denominator. Reports aggregate only authorized rows.
