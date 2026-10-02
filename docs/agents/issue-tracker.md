# Issue tracker

- Tracker: GitHub Issues.
- Repository: `henrikengd/partnership-intelligence`.
- Remote: `https://github.com/henrikengd/partnership-intelligence.git`.
- Verified default branch: `main` on 2026-10-02.
- Canonical specification: `docs/features/partnership-intelligence-mvp/spec.md`.

Use `gh` for tracker operations. Always pass `--repo henrikengd/partnership-intelligence` when the local checkout has not yet been initialized from the remote. Use body files for multiline descriptions. Verify existing state before retrying an uncertain mutation.

## Labels and execution eligibility

- `feature`: parent specification issue, never an implementation assignment.
- `implementation`: child implementation ticket.
- `ready-for-agent`: child ticket with no open blockers. It is eligible for an authorized delivery stage, not an instruction to start immediately.
- `blocked`: child ticket with unresolved dependencies.

Use native sub-issues and native blocking dependencies when available. Keep explicit parent, local ticket ID, and blocker links in issue bodies as a readable fallback. Before scheduling, check the live state of blockers. Remove `blocked` and add `ready-for-agent` only after prerequisite behavior has been integrated and verified, not merely after an agent has produced a branch.

Close tickets with integrated verification evidence. PRs as an incoming feature-request source are disabled. No automatic merge is authorized.
