# Partnership Intelligence

Partnership Intelligence helps nonprofits, student organizations, NGOs and clubs turn their needs, company evidence and professional relationships into actionable partnership proposals.

Each opportunity answers **why this partner, who to approach, via whom, what to ask and how to begin**. Recorded facts, AI inferences and missing information stay separate. A recorded employer or job title never proves access to a decision-maker.

## Explore or self-host

- [Start the fictional Riverbend demo](docs/demo.md). It needs Docker Compose and no AI key. Its separate database contains 12 people, 6 companies, 4 needs, 3 partnerships and 8 opportunities.
- [Start a private installation](docs/self-hosting.md). Each installation serves one organization and an invited partnership team with administrator and editor roles.

The application includes resumable onboarding, manual records, previewed CSV imports, a relationship graph with textual paths, deterministic candidate generation, transparent scoring, reviewed opportunity plans, owned outreach and follow-ups, and partnership outcomes. Administrators can export permitted records and preview personal-data deletion.

AI is optional and disabled by default. An administrator chooses the model and the operator supplies its server credential. Every live draft request requires an editable context preview. Drafts stay suggestions for human review and never send outreach or change scores.

## How proposals work

1. Define an active need and add known candidate companies.
2. Record supplied sources and specific company capabilities or incentives.
3. Add people, their organization roles and explicitly sourced connections where available.
4. Generate proposals for one need and up to 20 saved companies.
5. Review the evidence, target, introduction route or cold approach, ask and first action.
6. Assign an owner, record actions and follow-ups, then preserve the result as an outcome or partnership.

Priority uses eight explicit factors. Unknown factors earn no points and remain visible; coverage shows how much of the rubric has a recorded value. Priority is not a success probability. Regeneration preserves manual edits and activity while appending an assessment version.

## Project boundaries

The MVP uses supplied research and known companies. It has no automatic web discovery, LinkedIn scraping, autonomous email sending, inbox integration, multi-organization hosting or learned success probabilities. It runs one application process per installation. Interrupted generation requires an explicit retry; there is no durable background queue.

The public repository contains application code, schemas, empty import templates, example configuration and fictional data. Keep real member, alumni, contact and relationship records in private deployment storage. Keep credentials, exports, uploads, backups and private screenshots outside Git and public issues. Organization identity and needs are editable configuration.

## Documentation

- [Self-hosting and first useful workflow](docs/self-hosting.md)
- [Backup and restore](docs/backup-restore.md)
- [CSV imports](docs/imports.md)
- [Private-data deletion and retention](docs/private-data-retention.md)
- [Optional AI and disclosure](docs/ai-assistance.md)
- [Architecture and development](docs/development-contracts.md)
- [Contributing](CONTRIBUTING.md) and [security](SECURITY.md)
- [Domain glossary](CONTEXT.md) and [canonical MVP specification](docs/features/partnership-intelligence-mvp/spec.md)
- [Delivery evidence](docs/features/partnership-intelligence-mvp/delivery.md) and [implementation issues](https://github.com/henrikengd/partnership-intelligence/issues)

## License

MIT. See [LICENSE](LICENSE).
