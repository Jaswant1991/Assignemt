# Task Management ERP
Google Apps Script + Google Sheets + HTML/Bootstrap starter for Tech Auto Private Limited.

**Status: scaffold, not a deployed ERP.** The shell and pure permission helpers are implemented. Authentication, storage, task workflows, recurrence, dashboard metrics and email delivery deliberately fail closed until implemented.

## Structure
| Path | Purpose |
| --- | --- |
| src/Code.gs | HTML entry point |
| src/Config.gs | Script Properties adapter |
| src/Permissions.gs | Pure role and task visibility rules |
| src/Auth.gs | Authentication boundary (disabled) |
| src/Sheets.gs | Database adapter placeholder |
| src/Tasks.gs | Delegation endpoints (disabled) |
| src/Recurring.gs | Scheduled generation placeholder |
| src/Dashboard.gs | Dashboard endpoint (disabled) |
| src/Notifications.gs | Notification worker placeholder |
| src/Index.html, Styles.html, JavaScript.html | Responsive Bootstrap shell |
| src/appsscript.json | V8 manifest; Asia/Kolkata timezone |
| docs/ | Schema, permissions, setup and phased plan |
| tests/ | Local permission and fail-closed checks |

## Start here
1. Read [setup](docs/SETUP.md), [schema](docs/SHEETS_SCHEMA.md) and [permissions](docs/ROLE_PERMISSIONS.md).
2. Run `node --test tests/*.test.cjs` (Node 18+; no dependencies).
3. Follow [implementation phases](docs/IMPLEMENTATION_PLAN.md). Phase 1 identity and access checks must pass before connecting live data.
4. Copy the flat contents of src into an Apps Script project, or configure clasp locally as documented. HTML include files remain alongside backend files in Apps Script.

## Ready versus pending
- Ready: responsive static shell, manifest, server-side permission primitives, configuration adapter, documented data contracts and tests.
- Implementation required: trusted identity lookup, user directory, CRUD, revision/audit writes, recurring occurrences, dashboard queries and notification outbox.
- Configuration required: spreadsheet ID, authentication policy, deployment audience/execution identity, email rules and trigger ownership. See [configuration example](config/script-properties.example.json).
- No spreadsheet, trigger, deployment, email, password or credential is created by this scaffold. Never commit production records or secrets to this public repository.
