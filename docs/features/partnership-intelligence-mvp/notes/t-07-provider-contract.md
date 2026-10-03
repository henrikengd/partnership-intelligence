# Optional provider implementation contract

Read-only research on 3 October 2026 confirms the current official Responses API contract. This is implementation guidance for T-07, not proof of implemented behavior. The adapter uses a configured model and server-side key, with no hardcoded model name.

Send one ordinary POST to `https://api.openai.com/v1/responses`, using Bearer authentication. Trusted instructions remain separate from the approved, minimized user context packet. Set `max_output_tokens: 2000`, `store: false`, `stream: false`, `background: false`, and `tools: []`. Use `text.format` with `type: json_schema`, `name`, `strict: true`, and the application JSON schema. Every object rejects additional properties, requires its fields, and represents optional values as nullable required properties.

The output token bound includes non-visible generated tokens. Apply a local 60-second deadline to fetch and body consumption. Make no automatic retry; the application allows at most one explicit retry. An aborted local request does not prove remote computation stopped.

Require a validated response envelope with completed status. Traverse typed output items because reasoning can precede messages. Reject unexpected tools, any refusal block, incomplete status, missing or ambiguous output text, malformed JSON, schema failures and IDs outside the approved packet. A syntactically valid reference does not establish factual support. Save suggestions separately for human review; provider errors must not expose raw request or response text.

Inject networking and deadline controls for fictional fake-provider tests. Cover refusal, incomplete output, body-read timeout, malformed envelopes, unknown citations/contacts, HTTP errors and hostile source text. No live key is needed to verify those behaviors.

`store: false` prevents response retrieval storage, but does not promise zero retention. Abuse-monitoring logs and prompt caching have separate provider controls. Do not claim pseudonymous context is anonymous.

## Primary sources

- [Create a response](https://developers.openai.com/api/reference/typescript/resources/responses/methods/create)
- [Authentication](https://developers.openai.com/api/reference/overview#authentication)
- [Structured outputs, refusals and incomplete handling](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Typed text output](https://developers.openai.com/api/docs/guides/text)
- [Output token counts](https://developers.openai.com/api/docs/guides/token-counting#understand-output-token-counts)
- [Error codes](https://developers.openai.com/api/docs/guides/error-codes)
- [Responses migration and storage](https://developers.openai.com/api/docs/guides/migrate-to-responses)
- [Provider data controls](https://developers.openai.com/api/docs/guides/your-data)
