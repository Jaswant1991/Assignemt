# Role and access policy
Proposed baseline for implementation; changes require explicit business decisions.

| Capability | Admin | MD | Manager / HOD | Staff / Employee |
| --- | --- | --- | --- | --- |
| View tasks, metrics, exports | All | All | Own department | Assigned to self |
| Assign tasks / recurring rules | All active doers | All active doers | Active doers in own department | No |
| Update own task progress / remarks | Yes | Yes | Yes | Yes |
| Change assignee / target / priority | All | All | Own department | No |
| Mark own task complete | Yes | Yes | Yes | Yes |
| Reopen / cancel tasks | All | All | Own department | No |
| Manage users / roles / activation | Yes | No | No | No |
| Change global settings / email rules | Yes | No | No | No |

Managers use department scope in this starter. Cross-department teams, self-task entry and delegating across departments are pending decisions, not implicit grants.
Use immutable user IDs; department stored on task comes from doer's record at creation. Decide explicitly how transfers affect historical visibility.
Inactive users, missing IDs and unknown roles are denied. HOD maps to MANAGER; EMPLOYEE maps to STAFF.

## Enforcement requirements
Resolve identity on the server on every public endpoint. Apply scope before returning task lists, dropdowns, details, counts, charts, downloads or attachment URLs. Load the persisted task before updates; restrict writable fields by role, ownership and current state. Ignore submitted actor, role and department fields.
Audit reassignment, deadline revision, closure, user and permission changes.
An editor of the underlying spreadsheet can bypass application rules. Restrict direct Sheet/Drive sharing separately; web roles do not change Google sharing permissions.

## Authentication decision
No password login is implemented. Choose verified Google Workspace identity when deployment can reliably expose it, or design an approved external identity/token flow. Apps Script execution mode changes identity availability; blank identity must deny access. Never trust a supplied email, browser sessionStorage or Session.getEffectiveUser() as caller identity when executing as owner.
If custom passwords become required, design hashing, rate limits, reset, expiry and server-side sessions first; never store plaintext passwords in Sheets.
