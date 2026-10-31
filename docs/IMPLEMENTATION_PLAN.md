# Phased implementation
Each phase finishes with a reviewable acceptance check before the next begins.

| Phase | Work | Exit check |
| --- | --- | --- |
| 0 — Foundation (this commit) | Folder layout, shell, manifest, policy helpers, schemas, setup, tests | Local checks pass; no live writes or deployment |
| 1 — Identity and directory | Approve authentication/deployment model; implement requireUser_; Users/Departments adapter; Admin user management | Four roles tested; inactive/unknown denied; forged roles rejected; MD cannot manage users |
| 2 — Delegation | Scoped lists and doer dropdowns; create/update/complete; target revisions; locks/versioning; audit | Department and own-task isolation; invalid inputs denied; stale writes fail; partial-write recovery tested |
| 3 — Recurring | Rule CRUD with same scope; calendar scheduling; idempotent generation; catch-up limits | Month-end/leap-year tests; duplicate/concurrent runs safe; pause/end respected |
| 4 — Dashboards and reports | Cards, filters, user/date performance, charts, export; manual refresh button | Totals reconcile with scoped task rows; exports and filters leak no other users' data |
| 5 — Notifications | Outbox, assignment/completion/deadline-change messages; approved overdue escalation | Disabled mode sends nothing; sandbox recipients only until approved; quota/retry/crash recovery verified |
| 6 — Pilot and production | Optional Drive attachments and voice-to-text; performance, backups, runbook; approved deployment and triggers | Pilot signoff, restore drill, access review, documented operational owner and rollback |

## Pending decisions
- Google Workspace identity feasibility and deployment execution mode.
- Spreadsheet IDs per environment; administrator and service owner.
- Department versus explicit team hierarchy, transfer policy, and self-task permission.
- Deadline time-of-day, holidays, escalation recipients, reminder cadence and due-soon window.
- Data retention, attachment sharing, notification content and expected scale.

## Completion criteria
This foundation is not a production release. Implement missing adapters and endpoint permissions, validate with synthetic data in Apps Script, and document deployment/operational decisions before enabling real users.
