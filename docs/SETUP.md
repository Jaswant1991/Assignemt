# Configuration and deployment
No deployment or external data change is performed by committing this repository.

## Local checks
Install Node 18+ and run `node --test tests/*.test.cjs`.
These checks validate pure rules and fail-closed stubs, not Apps Script hosting or Google authorization.

## Apps Script preparation
1. Create a development spreadsheet with the tabs/headers in SHEETS_SCHEMA.md; use synthetic records.
2. Create a standalone Apps Script project. Copy src/*.gs and src/*.html into same-named editor files; enable manifest editing and copy src/appsscript.json.
3. Alternatively use clasp with a locally installed, reviewed version. Authenticate locally; create an untracked .clasp.json with your scriptId and rootDir set to src. Review the target before pushing. Never commit OAuth files.
4. In Project Settings > Script Properties, set SPREADSHEET_ID to the development spreadsheet ID. AUTH_MODE stays UNCONFIGURED until an authentication adapter is implemented. NOTIFICATIONS_ENABLED stays false.
5. Implement phases in order. Manually bootstrap the first Admin in the restricted Users sheet only after choosing the trusted identity mapping.
6. Review requested OAuth scopes as features are implemented; current manifest intentionally has no mail or Drive grants hardcoded.

## Deployment decisions (pending)
Record intended Workspace/domain audience, execute-as identity, identity availability, direct spreadsheet sharing, timezone and trigger owner before deploying. Confirm trusted caller identity with Admin, MD, Manager and Staff accounts. Restrict deployment audience to the approved users. Do not deploy a production ERP until scope isolation and unauthorized-access tests pass.

## Email and triggers (pending)
Approve recipients, overdue/escalation intervals, working days, timezone, templates and sender ownership. No trigger installation routine is supplied. Implement private workers first, then add time-driven triggers under the documented service owner. Disabled notifications must send nothing. Test with sandbox recipients before enabling delivery.

## Operational acceptance
Verify inactive/unknown users are denied, department/own-task filters cannot be bypassed, forged IDs and stale revisions fail, duplicate recurring runs produce one occurrence, retries are audited, and exports preserve authorized scope. Test quota failures and recovery. Back up the development spreadsheet; document restore and rollback before production.
