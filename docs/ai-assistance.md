# Optional AI drafts

The application works without an API key. AI starts disabled; deterministic assessments, reviewed action plans and manual briefs remain available in the fictional demo and private installations.

An administrator can configure a model in Settings and enable the OpenAI adapter after the host supplies `OPENAI_API_KEY` to the server environment. The credential is never stored in the database or returned to the browser. Use a model that supports Responses structured output; there is no default model. Keep the deployment environment file outside version control and restart the app after changing its credentials.

## Review before every request

Open an opportunity and choose **Review AI context**. The default packet contains the target company, partnership type/deadline, evidence references/review dates and up to three current recorded routes. Raw need titles/descriptions and source claims/excerpts stay in the local legend. Review that text and explicitly add sanitized need and evidence text to the outbound JSON if useful. This keeps unrecorded people mentioned in free text out of the default packet without claiming universal name recognition. Professional connection kinds and roles explain the route. Recorded personal names, email addresses, phone numbers and source links are redacted; people, routes and evidence use local pseudonyms. Pseudonyms can still identify people through context. Review the actual packet for personal or unnecessary information. A separate local reference legend identifies the need, source text, recorded people and routes; those names and labels are not part of the packet. Saved drafts also resolve their proposed contact and route locally.

A short generic professional role can be supplied before preview. Instruction-shaped or name-shaped suggestions are rejected; unusual terminology may need a broader generic role label. The preview freezes its allowed roles. Edit text or remove sources and routes in the JSON packet, while retaining reference IDs, dates, review states, company, partnership type and roles. No source links are fetched. The serialized outbound packet must fit within 12,000 characters; its HTTP envelope has a separate 64 KiB byte limit. More than 100 selected sources prevents preview and requires a smaller selection, rather than silently dropping sources.

Approve the edited packet to request a separate draft. The server validates the current opportunity and evidence revision before calling the provider and before saving its result. AI cannot modify records, assessments, scoring, readiness review, outreach activities or manual briefs. Copy useful text into a manual brief only after checking it against its sources.

## Output and request bounds

The adapter makes one Responses request without tools, streaming, background execution or automatic retry. It requests at most 2,000 output tokens, including generated reasoning, and stops waiting after 60 seconds across fetch and body consumption. Local abortion does not prove that remote computation stopped. Only one request can run at a time in the installation. Response bodies are bounded separately.

A strict schema, supplied-reference validation and privacy heuristics reject malformed output, unknown citations, incompatible route/contact references, refused introduction routes, invented named contacts, contact addresses, explicit success probabilities and rubric scores. These checks are structural and heuristic. They do not prove that a cited source supports prose or that a recommendation is correct. Every draft remains an inference pending human review. A recorded named contact must be the company-side terminal of the selected current route, with no recorded refusal. A cold draft can propose a generic role with no named person or route; the AI adapter does not yet include a separate evidence basis for named cold contacts. Existing manual review remains available for its supported recorded targets.

Refusal, incomplete output, provider failure, invalid output, timeout or process interruption leaves deterministic and manually reviewed data unchanged. Error categories contain no raw provider text. A failed or interrupted run permits one explicit retry with a newly loaded, reviewed packet. Repeated submissions of the same accepted action reuse its request key; a new preview or edited packet creates a new action. A late response from an interrupted attempt cannot overwrite the retry result.

## Storage and recovery

Provider requests set `store: false`. This disables response retrieval storage; provider abuse monitoring and prompt caching have separate retention controls. It does not promise zero retention. Consult the [provider data controls](https://developers.openai.com/api/docs/guides/your-data) when configuring a real deployment.

AI run packets, drafts and reference mappings are private database records. Authorized editors can view saved drafts; only administrators can change AI settings. Browser responses never include the private reference map. Names displayed alongside validated contact pseudonyms resolve locally. Run history remains available if later record edits prevent a new preview.

At process startup, call `recoverInterruptedAiRuns()` from `src/server/ai/recovery.ts` once before serving requests, alongside deterministic run recovery. Ordinary request handling does not recover running work. Run recovery marks unfinished requests interrupted; it never retries automatically. Concurrent processes serving the same installation require a stronger ownership/lease design before this startup policy can safely support them.

For person deletion, private `ai_run.reference_map` contains `personIds` for route/contact people and recorded people detected in selected source, need and connection-role text, plus evidence IDs, relationship IDs and route mappings. The run also stores its base assessment ID. Purge dependent run snapshots rather than merely clearing a displayed name; drafts stay bound to their run. Person deletion purges related private run material; administrator exports remain private copies. See [retention and deletion](private-data-retention.md).

The adapter is tested through injected providers and networking. No publicly selectable fake adapter or live-provider key is required for tests. The protocol contract and primary documentation links are recorded in [the provider note](features/partnership-intelligence-mvp/notes/t-07-provider-contract.md).


Prose validation conservatively rejects unknown capitalized full names and common named-contact actions. Drafts should use sentence case, generic roles and `[person]` placeholders. Exact supplied company, need and role labels are permitted. This lexical guard can reject unusual capitalization and cannot identify every name or unsupported claim across languages. It supplements strict person/route references; humans still verify every suggested contact and statement before outreach.
