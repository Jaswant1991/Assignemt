# Role and access policy
| Capability | Admin | MD | Manager / HOD | Staff / Employee |
| --- | --- | --- | --- | --- |
| Tasks, dashboard, CSV, recurring visibility | All | All | Task/rule department matches own | Assigned to self |
| Assign tasks / recurring rules | Any active doer | Any active doer | Active doers in own department | No |
| Change doer, description, due, priority or attachment | All tasks | All tasks | Own department tasks | No |
| Progress / remarks / completion | All tasks | All tasks | Own department tasks | Own active tasks |
| Reopen / cancel | All tasks | All tasks | Own department tasks | No |
| User / department management | Yes | No | No | No |
| Deployment / Script Properties / worker configuration | Approved script editor only | No web control | No web control | No web control |

HOD aliases MANAGER; EMPLOYEE aliases STAFF. Unknown/inactive/missing identities are denied.
No Director alias is implemented; choose the intended canonical role explicitly.

## Scope enforcement
All public business APIs pass through api_, which takes a script lock, validates schema, recovers pending operations and resolves the current active Google identity.
Visibility rules are applied before returning lists, metrics, doer options, recurring rules or export source data. getWorkspace returns only user display names referenced by visible tasks/rules; it does not expose the complete directory to Staff.
Mutation endpoints load persisted records, check current scope and reject unsupported fields. Actor and department are always derived on the server. Staff cannot alter assignee/deadline/role with a forged request.
Task and rule updates require current versions; user edits require current updatedAt. Never trust browser navigation visibility as an authorization boundary.
Worker and setup functions have trailing underscores, preventing google.script.run invocation. Editor access remains privileged.

## Identity and spreadsheet access
Google Workspace login is implemented with Session.getActiveUser().getEmail(), an exact domain check and an active Users lookup. Blank identity fails closed.
No custom password, sessionStorage token or client-submitted email is used as authentication.
Deployment execution identity determines whether the caller email is available. See SETUP.md for account testing and the limitations of execute-as-user versus a private centrally owned Sheet.
Direct spreadsheet editors bypass all app rules. Web roles do not grant or revoke Google Sheet/Drive sharing. Restrict direct access and test attachment sharing separately.

## Transfers and directory changes
Task department is a snapshot; reassignments update it from the new doer's directory record. Staff retain own-task visibility after moving departments. A new manager of a department inherits its historical task visibility.
Recurring generation pauses implicitly when assigner loses permission or doer moves departments; an authorized schedule edit is required to resolve changed scope.
User removal uses INACTIVE status to preserve referential history. A hard-delete operation is not provided.
