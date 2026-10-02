# MVP plan publication

- Specification revision: r1.
- Authorization: the user explicitly requested repository creation and Prepare issue publication on 2026-10-02.
- Repository: https://github.com/henrikengd/partnership-intelligence.
- Tracker: GitHub Issues.
- Parent specification: [#1](https://github.com/henrikengd/partnership-intelligence/issues/1).
- Outcome: one parent and ten implementation issues published; native parent/child and blocking relationships verified.
- Initially eligible work: T-01 only. No application implementation has started.

## Published implementation tickets

| Local ID | GitHub issue | Blocked by |
| --- | --- | --- |
| T-01 | [#2: Establish the self-hosted app and invited private access](https://github.com/henrikengd/partnership-intelligence/issues/2) | None |
| T-02 | [#3: Deliver the first complete deterministic partnership workflow](https://github.com/henrikengd/partnership-intelligence/issues/3) | [#2](https://github.com/henrikengd/partnership-intelligence/issues/2) |
| T-03 | [#4: Add resumable onboarding and validated CSV imports](https://github.com/henrikengd/partnership-intelligence/issues/4) | [#3](https://github.com/henrikengd/partnership-intelligence/issues/3) |
| T-04 | [#5: Find evidence-aware introduction paths and show a focused graph](https://github.com/henrikengd/partnership-intelligence/issues/5) | [#3](https://github.com/henrikengd/partnership-intelligence/issues/3) |
| T-05 | [#6: Generate candidate batches and preserve reviewed opportunity revisions](https://github.com/henrikengd/partnership-intelligence/issues/6) | [#5](https://github.com/henrikengd/partnership-intelligence/issues/5) |
| T-06 | [#7: Track owned outreach, follow-ups, and partnership outcomes](https://github.com/henrikengd/partnership-intelligence/issues/7) | [#6](https://github.com/henrikengd/partnership-intelligence/issues/6) |
| T-07 | [#8: Add optional AI briefs with evidence validation and context review](https://github.com/henrikengd/partnership-intelligence/issues/8) | [#6](https://github.com/henrikengd/partnership-intelligence/issues/6) |
| T-08 | [#9: Add admin-only exports, dependent-data deletion, and retention controls](https://github.com/henrikengd/partnership-intelligence/issues/9) | [#4](https://github.com/henrikengd/partnership-intelligence/issues/4), [#7](https://github.com/henrikengd/partnership-intelligence/issues/7), [#8](https://github.com/henrikengd/partnership-intelligence/issues/8) |
| T-09 | [#10: Complete the fictional demo and polish the accessible product workflow](https://github.com/henrikengd/partnership-intelligence/issues/10) | [#4](https://github.com/henrikengd/partnership-intelligence/issues/4), [#7](https://github.com/henrikengd/partnership-intelligence/issues/7), [#8](https://github.com/henrikengd/partnership-intelligence/issues/8) |
| T-10 | [#11: Verify self-hosting, restore, and document the MVP release](https://github.com/henrikengd/partnership-intelligence/issues/11) | [#9](https://github.com/henrikengd/partnership-intelligence/issues/9), [#10](https://github.com/henrikengd/partnership-intelligence/issues/10) |

## Verification and execution boundary

Verified 11 open issues, 10 native sub-issues and 14 native blocking edges. The parent has no ready-for-agent label. T-01 has implementation and ready-for-agent labels; every other child has implementation and blocked labels. Explicit blocker URLs remain in issue bodies as a readable fallback.

The dependency graph is acyclic and covers F-01 through F-18. Local links and scoring arithmetic were checked. No application tests or build exist yet, and no Docker run was claimed.

The default branch is main. Documentation is published to that branch through the GitHub API as a normal forward commit. No local branch was created/switched, no local commit or Git push was performed, and the local main remains unborn. Initialize a separate managed checkout from the verified remote before authorized implementation; preserve this planning workspace.

Next stage: `$deliver https://github.com/henrikengd/partnership-intelligence/issues/1`, with separate authorization for any branch creation/push required by the repository instructions.
