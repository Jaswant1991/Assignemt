# Setup and deployment
No live spreadsheet, deployment, trigger or email is created merely by committing these files.

## 1. Create a development project
Create an empty Google spreadsheet and a standalone Apps Script project under your approved Workspace administrator/service owner.
Copy all src/*.gs and src/*.html into the editor. Apps Script uses one flat namespace; keep the same file names. Enable manifest editing and replace appsscript.json with the supplied manifest.
For clasp, use a locally reviewed installation and an untracked .clasp.json whose rootDir is src and scriptId is your project ID. Review the target before pushing. Never commit OAuth files.

## 2. Set Script Properties
Use Project Settings → Script Properties:
| Property | Required value |
| --- | --- |
| SPREADSHEET_ID | Development spreadsheet ID, without URL |
| ALLOWED_DOMAIN | Your exact Workspace domain, lowercase, e.g. company.example |
| BOOTSTRAP_ADMIN_EMAIL | First Admin's Workspace email within that domain |
| WORKER_EMAIL | Google account that owns the script and scheduled workers |
| AUTH_MODE | Initially UNCONFIGURED; then GOOGLE_WORKSPACE after setup |
| NOTIFICATIONS_ENABLED | false until mail testing is approved |
| EMAIL_ALLOWLIST | Comma-separated approved recipients; empty means no delivery |
| ESCALATION_DAYS | Positive overdue-day threshold; defaults to 3 |

Use the same approved account for first Admin and worker owner for simplest setup. Domain aliases are not automatically accepted.
The manifest permits Apps Script to infer OAuth scopes from source. Since mail functions exist, authorization can request mail scope even when email delivery is disabled. Review the consent screen.

## 3. Initialize the database
Select setupERP_ in the Apps Script editor and Run. This checks the effective editor identity against WORKER_EMAIL, creates missing sheets with exact headers, formats new tables as text and creates the first Admin only when Users is empty.
It does not populate business data, overwrite tables or replace an existing Admin. Existing header mismatches abort setup.
The supplied manifest and date helpers use Asia/Kolkata. Dates are stored as YYYY-MM-DD text; timestamps are ISO 8601 UTC text.
Do not add blank rows inside source data, duplicate IDs, manual formulas or merged cells.

## 4. Validate account identity and deployment
This version uses Session.getActiveUser().getEmail(), checks ALLOWED_DOMAIN and resolves an ACTIVE Users record. It never treats a submitted email or Session.getEffectiveUser() as the caller identity.
Google documents that active email availability depends on execution context and may be blank in execute-as-owner web apps; same-Workspace deployments can have different availability. Test with your actual accounts. A blank email is denied with no fallback.

For a centrally owned, restricted spreadsheet, evaluate an execute-as-owner web deployment limited to the approved Workspace audience. Verify that real active caller emails are exposed for every supported account.
Do not solve blank identity by sharing the entire database with all employees. Executing as each accessing user may require granting direct Sheet access, which bypasses row permissions. If your environment cannot expose trusted same-domain identity while keeping the database private, this adapter is not suitable: add and validate another authentication adapter before rollout.
Personal Gmail/username-password login is not provided.

Deploy a private test version only after choosing the execution identity and approved audience. The code repository is public; that does not publish the web app or its spreadsheet.
Open the deployed URL and click Continue with your Google account. Use the account already signed into that web app. The Lock workspace button clears local display data; signing out of Google is handled by Google.

Official guidance:
- [Session identity](https://developers.google.com/apps-script/reference/base/session)
- [Web app deployment](https://developers.google.com/apps-script/guides/web)
- [Installable triggers](https://developers.google.com/apps-script/guides/triggers/installable)

## 5. Add users and tasks
Log in as Admin → User management. Create departments, then users using their exact Google Workspace email. HOD is stored as MANAGER and Employee as STAFF.
Add a manager after creating the department; then edit the department to select that manager.
User deactivation is the supported removal operation. At least one active Admin must remain.
Use Delegation to assign a task; select a Drive file link if needed. Only task managers may revise deadlines, with a required reason. Staff may update remarks, move to IN_PROGRESS or mark their own open task COMPLETED.
Admin/MD/department managers can reopen, cancel, reassign and revise tasks within scope.
User edits use updatedAt to detect stale submissions. Task and recurring edits use version numbers. Department edits are serialized, last write wins; refresh before editing.

## 6. Schedule workers and enable mail
After account/permission checks, run installWorkers_ in the editor as WORKER_EMAIL, which must also be an active Admin. It installs one hourly trigger per private worker for that account and avoids duplicates owned by that account.
Only one account should own these workers; triggers owned by another account are not visible to this installer. Do not duplicate them under another owner.
Workers run even when the web app is closed. Recurrence processing is independent of notifications.
- generateRecurringOccurrences_: at most 25 occurrences per rule and 100 total per run; oldest due dates are caught up first.
- queueOverdueNotifications_: daily per-task/version reminders to doer; escalation to assigner after ESCALATION_DAYS; bounded to roughly 100 new queue entries/run.
- processNotificationOutbox_: sends up to 20 queued messages/run within MailApp remaining daily recipient quota.

Keep NOTIFICATIONS_ENABLED=false until approval. Enable it only with EMAIL_ALLOWLIST containing sandbox recipients first. Only an active, still-authorized recipient on the allowlist can receive a message. Failed sends retry with exponential backoff up to 5 attempts; inspect FAILED rows in NotificationOutbox. No resend UI is implemented.
Assignment goes to doer; completion/deadline changes go to assigner. Overdue/escalation mail is skipped if no longer overdue. Other queued events use current task details when sent. Events created while notifications are disabled are not retroactively queued.
Review wording, recipients, calendar-day rules and sender ownership before production. Workers must be disabled/removed manually in Apps Script Triggers to stop scheduling.

## Recovery, retention and limits
Every domain write is journaled as PENDING then replayable upserts; DONE is marked after all writes flush. Each API/worker recovers pending operations under ScriptLock before reading tables. Do not manually edit the Operations payload.
This provides recoverable multi-table operations, not database transactions. A failed call can be committed during recovery. Retrying task/rule creation with the same requestId returns the existing record. Update callers must refresh after ambiguous failures or stale-version errors.
Email delivery is at least once: a crash after send but before SENT is recorded can duplicate mail. Do not use this outbox for financial execution or irreversible actions.
Operations stores snapshots including user/task data. Restrict the spreadsheet; archive DONE operations and sent notification history only under an approved backup/retention procedure. Never delete pending operations.
All source reads scan tables, and mail sends hold ScriptLock. Pilot with modest volumes. Load-test expected data size against Apps Script execution/quota limits before wider rollout.

## Acceptance before production
Test each role and unknown/inactive accounts in the deployed app; ensure the database is not shared with staff. Verify scope for lists, doers, dashboard, recurring rules and CSV.
Check deadline revisions, stale writes, double submits, month-end recurrence, paused/ended rules, inactive assignees and journal recovery using synthetic data. Check OAuth authorization, CDN rendering on mobile, real Sheet date/text behavior and approved test emails.
Make a backup, perform a restore drill, record ownership, and document trigger/deployment rollback before enabling business users.
