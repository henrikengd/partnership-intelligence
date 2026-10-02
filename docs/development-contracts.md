# Foundation development contracts

`src/server/db/index.ts` exports `db`, `pool`, the `Database` type, and each table. Schema ownership is centralized in `src/server/db/schema.ts`. Use Drizzle migrations under `db/migrations`; generate their metadata as part of the same change. Tables use UUID IDs and UTC timestamps. `organization` contains the single editable installation profile, constrained by `singleton_key=1`. Login `user` records remain separate from future network people.

`src/server/auth/auth.ts` exports lazy `getAuth()`. It configures Better Auth with its Drizzle adapter, database sessions, UUID IDs, database-backed rate limiting, and disabled registration. Do not expose new library endpoints without reviewing their access policy. The HTTP route only exposes signin, signout, get-session and current-password change.

`requireActor(headers)` returns `{ id, name, email, role }` after checking both a live library session and the active database user. `requireAdmin(headers)` additionally checks the current role. Every domain entry point for private records must call one of these; a layout check does not authorize a mutation. Page helpers may redirect unauthenticated users, but API handlers return an explicit 401/403.

`src/server/auth/service.ts` owns invitation/bootstrap/access transactions. Bootstrap and access changes share a PostgreSQL transaction advisory lock, and invitation acceptance locks its invitation row. Credential insertion uses Better Auth's exported password hash function and the adapter's credential schema. Admin service methods recheck the current actor inside their transaction.

`DomainError` contains a stable `code`, safe message, and HTTP `status`. `jsonRoute` maps these and Zod validation failures to safe JSON. Internal exceptions produce a generic response and minimal operational logging. `readJson` caps JSON input at 16 KiB before parsing. `checkOrigin` requires the configured app origin on custom mutation routes. Public setup/invitation endpoints use global per-installation database counters to bound attempts.

Use runtime validation for all new inputs. Domain logic belongs under `src/server` or future `src/modules`; client UI must not compute hidden scoring or trust submitted account roles. Protected pages use the `(workspace)` route group. Current UI routes are `/dashboard`, `/settings`, `/login`, `/setup`, and `/invite`.

All tests use fictional data. The integration helper refuses destructive reset unless both DB URLs match and use an isolated test name. Tests of future modules must avoid mutating another agent's database or development server. The foundation worker uses pi_t01 and port 3101; the feature integration database is pi_integration.

Node/runtime and package versions are pinned in `.nvmrc`, Dockerfile, package.json and package-lock.json. The current Drizzle Kit transitive esbuild override fixes a published dev-server advisory; migration generation and all project checks must still run when changing it.
