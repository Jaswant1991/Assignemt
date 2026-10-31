# Tech Auto — Task Management ERP
Google Apps Script + Google Sheets + HTML/CSS/Bootstrap.

**Status: implemented MVP, locally tested against an in-memory Apps Script adapter.** Google deployment, real Sheet integration, account authorization and email delivery still need environment testing. No live services were configured by this commit.

## Features
- Google Workspace account login; active directory lookup and server-side role checks on every API.
- Admin user/department management; deactivation preserves history; last active Admin protected.
- Admin/MD global visibility, Manager/HOD department visibility, Staff/Employee own-task visibility.
- Delegation with assignee dropdown/email, priority, Drive link, status, remarks and target-date revision history.
- Recurring daily/weekly/monthly/quarterly/yearly schedules; month-end clamping, inclusive end dates, pause/end and duplicate-safe occurrence generation.
- Scoped dashboard cards and doer performance table; search, status, date/deadline filters, manual refresh and filtered CSV export.
- Assignment, completion, deadline revision, daily overdue and escalation email queues. Disabled by default; delivery requires an explicit recipient allowlist.
- Write journal for replaying interrupted multi-tab operations before the next API read/write.

## Get running
1. Read [SETUP.md](docs/SETUP.md). Create a development spreadsheet and Apps Script project.
2. Copy **all** files in src into the Apps Script editor (flat file layout), including the manifest.
3. Set Script Properties using [the example](config/script-properties.example.json). Do not paste real IDs or credentials into this public repo.
4. Run editor-only `setupERP_` to create missing tables and the first Admin. No existing table is overwritten.
5. Set AUTH_MODE to GOOGLE_WORKSPACE, validate the deployment identity with approved Workspace accounts, and use the Google-account login screen.
6. Log in as Admin, add departments, then users. Create a task and verify role isolation before installing workers.
7. Run `installWorkers_` from the editor only after approving trigger ownership. Leave notifications off until recipients/rules are approved.

This implementation supports same-domain **Google Workspace identities**. It does not implement username/password or personal Gmail login. Blank/unavailable Google identity is denied; see deployment guidance.

## Files
| Folder / file | Purpose |
| --- | --- |
| src/Code.gs | HTML entry point and restricted template includes |
| src/Config.gs, Auth.gs, Permissions.gs | Configuration, identity, validation and scope helpers |
| src/Sheets.gs | Schema validation, row adapters, script lock and recovery journal |
| src/Setup.gs | Editor-only database bootstrap and worker installation |
| src/Users.gs | Admin user/department endpoints and scoped doer options |
| src/Tasks.gs | Delegation CRUD, revisions, permissions and notification events |
| src/Recurring.gs | Rule management and bounded scheduling worker |
| src/Dashboard.gs | Scoped workspace and performance aggregations |
| src/Notifications.gs | Outbox, overdue/escalation and mail worker |
| src/*.html | Responsive login, dashboards, forms and browser RPC wiring |
| docs/ | Setup, schema, role policy, API and rollout plan |
| tests/ | Core checks, in-memory integration harness, optional DOM/browser checks |

## Validation
Requires Node 18+; no dependency install for core tests:
```sh
node --test tests/*.test.cjs
```
Optional DOM workflow check:
```sh
npm install --no-save --package-lock=false jsdom@26.1.0
node tests/ui-dom.cjs
```
Optional real-browser check (requires Playwright + Chromium):
```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node tests/browser-smoke.cjs
```
Core tests and the DOM workflow passed during implementation. Real-browser execution was blocked by an unavailable Chromium binary and failed browser download. The browser check is supplied for local execution. DOM testing does not verify Bootstrap layout or Google OAuth.

## Boundaries
This is a small-team MVP: reads scan source tables and operations are serialized with ScriptLock. Direct spreadsheet editors bypass app permissions. Email send/record has an at-least-once crash window. [Setup](docs/SETUP.md) describes limits and production acceptance.
Voice transcription, binary file upload, charts/calendar/Kanban, password login, hard deletion and bulk import are not included. Drive attachment **links** are supported. Configuration changes use Script Properties; there is no general settings editor.
