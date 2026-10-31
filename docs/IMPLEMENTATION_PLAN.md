# Implementation and rollout
## Implemented in this version
| Phase | Implemented code | Validation performed |
| --- | --- | --- |
| Foundation | Layout, responsive shell, schema, configuration and setup | Manifest/source parsing; unconfigured auth denied |
| Identity/directory | Workspace identity, active users, roles, Admin user/department forms | In-memory role, inactive, unknown/domain, duplicate-email and last-Admin checks |
| Delegation | Create/update, staff transitions, deadline history, versions, scoped dropdowns, journal | Scope, stale writes, duplicate retries, partial-write replay and DOM form flows |
| Recurring | Rule CRUD, pause/end states, bounded catch-up, month-end anniversaries | Leap-year/month-end dates, end boundary, duplicates and worker ownership checks |
| Dashboard/reports | Scoped cards, performance table, filters, manual refresh, CSV | Scoped totals/denominator and DOM export/rendering checks |
| Notifications | Event outbox, overdue/escalation workers, quota bounds, allowlist/retries | Disabled mode, allowlist, duplicate daily events, closed-task skips in memory |

## Deployment phases still required
1. Configure a development spreadsheet/domain/owners and run setup in Apps Script.
2. Verify real Google identity and account authorization for every role under the selected deployment audience/execution mode.
3. Validate real Sheets value/formatting behavior, locks/recovery and expected data volumes.
4. Verify Bootstrap layout and mobile behavior in a real browser; DOM checks do not validate appearance.
5. Approve email recipients/cadence/templates; test sandbox delivery and failure recovery; install workers under one approved owner.
6. Back up data, test restore, document ownership/rollback, then approve a limited pilot before production.

## Optional next work
Voice-to-text, Drive binary upload, charts, calendar/Kanban, bulk user import and richer date/department/assignee analytics. Add an alternative verified authentication adapter only if Workspace identity cannot meet deployment needs.
Large-volume operation requires storage/query improvements beyond full-table Sheet scans; set scale expectations before extending the pilot.
