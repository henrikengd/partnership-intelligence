# Repository instructions

Use the `unslop` skill by default for user-facing prose. Do not announce its use.

Read `CONTEXT.md`, `docs/agents/issue-tracker.md`, and the relevant feature specification before changing application behavior. The canonical MVP contract is `docs/features/partnership-intelligence-mvp/spec.md`.

Keep the application organization-agnostic. Commit only fictional demo data and empty import templates. Never publish real personal network data, exports, database backups, credentials, or private screenshots.

Check issue dependencies before starting implementation. A parent specification issue is not a worker assignment. A label alone does not establish execution eligibility.

Do not create or switch branches, push, merge, or rewrite Git history without user authorization. Preserve unrelated local changes. Prepare ends at planning and issue publication; application code belongs to a separately authorized delivery stage.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
