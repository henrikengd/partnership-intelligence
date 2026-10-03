# Review cleanup: obsolete lifecycle paths

Removed the exported T-05 `startPursuing` implementation. Production already uses `transitionOpportunity`; the older helper updated state without saving lifecycle history and only remained in tests. Retained the shared readiness assertion used by the final lifecycle service.

Removed the unused `ActivityForm` and its private activity type from opportunity controls. The mounted `OutreachActivities` component remains the outreach entry point. Saved-value editor keys from the prerequisite repair remain intact.

Adapted only tests that called the removed helper. Successful pursuit now calls `transitionOpportunity` and asserts the persisted event, its previous/new states and readiness-review ID. Failed readiness gates leave event history unchanged. The selected-route browser scenario also checks its saved lifecycle event before reloading the action plan. One existing completed-contact fixture now supplies the explicit fictional actual date `2020-01-01`, as requested for the coordinator's separate date-validation repair.

Validation on isolated PostgreSQL 18.6 at port 5544 and Chromium app port 3104:

- Generation integration: 13 passed, rerun after the date-fixture change.
- Outreach/lifecycle integration: 9 passed.
- Generation and workflow Chromium: 6 passed, including saved-editor defaults and completed-action controls.
- Unit suite: 36 passed.
- ESLint, TypeScript and production build passed. Browser server stopped before the build.
- No remaining `startPursuing` or `ActivityForm` references under `src` or `tests`.

Prerequisites adopted separately: root `078c45c` and `979eff7`, local cherry-picks `a448d21` and `118e2d7`. They are not part of this cleanup's implementation handoff. No schema, AI service or outreach-service changes. No additional visual change or screenshot was needed for removal of an unmounted component.
