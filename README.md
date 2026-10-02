# Partnership Intelligence

An open-source, relationship-aware partnership intelligence platform for nonprofits, student organizations, NGOs, and clubs.

The product connects organizational needs, company evidence, and existing professional relationships to explain why a partnership fits, who to approach, who can introduce the team, what to ask for, and what to do next.

## Project status

The MVP is specified and tracked in GitHub Issues. The first implementation slice provides a self-hosted Next.js/PostgreSQL app, invited private accounts, and an organization profile. Other product workflows are still under development.

[Start a private installation](docs/self-hosting.md) or read the [development contracts](docs/development-contracts.md). No AI key is required.

Each installation serves one organization and an invited partnership team. The planned MVP includes onboarding, manual/CSV imports, a relationship graph, transparent opportunity scoring, optional AI assistance, and basic outreach tracking. It excludes automatic LinkedIn scraping, autonomous email sending, and broad web discovery.

## Planning

- [MVP scope](docs/features/partnership-intelligence-mvp/scope.md)
- [Canonical MVP specification and ticket plan](docs/features/partnership-intelligence-mvp/spec.md)
- [Domain glossary](CONTEXT.md)
- [Technical feasibility research](docs/features/partnership-intelligence-mvp/notes/architecture-research.md)
- [Implementation issues](https://github.com/henrikengd/partnership-intelligence/issues)

## Data boundary

The public source contains code, schemas, configuration examples, and fictional demo data. Real member, alumni, contact, and relationship data belongs in private deployment storage. Do not submit private exports, screenshots, credentials, or network records to this repository or its issue tracker.

The generic application must remain independent of any particular deployment. The complete demo will use a fictional organization and will work without an AI API key.

## License

MIT. See [LICENSE](LICENSE).
