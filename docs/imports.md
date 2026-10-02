# Import private partnership records

Open **Settings → CSV data imports** after an administrator saves the organization profile. Only invited partnership-team users can use imports. Editors can resume their own previews; administrators can inspect any preview in the installation. Business records remain shared with the invited team.

Download one of the empty templates from the import screen or `public/import-templates/`. Files must be UTF-8 CSV, at most 5 MiB and 5,000 data records, with unique column headers. Quoted commas and multiline fields work. A single record is limited to 64 KiB. Preview numbers count CSV records, including the header as record 1; quoted multiline fields do not add records.

1. Choose people, companies, relationships or partnerships and upload a file.
2. Read its columns, then map template fields to your column headers. Unmapped optional fields use the displayed defaults.
3. Validate the file. Review every normalized row, validation error, proposed identity match and warning.
4. Explicitly choose create, update a proposed identity, or exclude each row. Invalid rows must be corrected in the file or excluded. Two rows cannot update the same saved record in one commitment.
5. Commit the selected rows. They save in one database transaction. A failed later write rolls back earlier writes. Retrying the same committed batch returns its stored result.

Cancel before commitment leaves business records unchanged. A preview expires after one hour. Expired rows are cleared on the next import operation or visit to the imports page, rather than by a background timer. Pending normalized previews can remain in the private database while the installation is inactive. No original file is persisted, and cancel, expiry cleanup and commitment clear the normalized preview rows. Completed batches retain only their kind/status/timestamps, counts and row-to-record mappings. Preview references and summary pages can be reopened from the recent-batches list.

## The four templates

| Template      | Required fields                                                                                     | Other fields and references                                                                                                                                                                                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| People        | `name`, `roles`                                                                                     | `source_id`, `email`, `affiliation_state`, affiliation dates, `notes`. Separate roles with semicolons: member, alumni, advisor, board, contact. An external contact alone provides no internal introduction root.                                                                         |
| Companies     | `name`                                                                                              | `source_id`, HTTP/HTTPS `website`, `domain`, `description`. Domains contain a hostname without a URL or path.                                                                                                                                                                             |
| Relationships | `kind`, `person_id` or `person_source_id`, `evidence_id`, and the appropriate company/person target | Employment uses `company_id` or `company_source_id`; acquaintance uses `target_person_id` or `target_person_source_id`. Include `source_id`, title, current/ended/unknown state, dates, optional 0–4 strength and dated/source-attributed willingness. Previous employment must be ended. |
| Partnerships  | `company_id` or `company_source_id`, `title`, `type`                                                | `source_id`, current/ended/unknown state, start/end dates, description and optional existing `evidence_id`. Current records cannot have an end date.                                                                                                                                      |

Import people and companies first. Source-ID references must resolve to one already saved record in this installation. Record IDs are shown in the manual editors. Relationship evidence must already exist through the evidence form; importing an ID or URL does not verify a claim. Evidence and needs stay form-driven. Previous outreach is entered manually with its actual date, target person or role, channel, outcome, description and attribution.

## Identity and reimport

Use a stable `source_id` from your private source where possible. It is unique within an organization and record kind. Reimporting that ID proposes the existing record and requires an explicit update or exclusion. It cannot create a second record with that source ID. Exact normalized person email or company domain can also propose matches; ambiguous matches list their record IDs for explicit resolution. A matching name only produces a warning and never merges records.

Rows that repeat a source ID, email or company domain inside the same file require correction or exclusion. If a saved identity or its revision changes after preview, commitment fails before writing; upload again to review the latest records. Concurrent commits of different previews cannot silently bypass these checks. Records without a source ID or exact email/domain display a warning because a later file cannot identify them automatically. Keep the returned mappings and add source IDs in the manual editors before future reimports.

An explicit update replaces fields with the normalized values shown in its preview, including defaults for unmapped optional fields. Review those defaults before updating a record with richer existing information. There is no implicit merge of descriptions, roles or employment periods. Record each employment period separately.

Never commit real CSV files, previews, screenshots, exports or backups to the public repository. Its templates contain headers only. Formula-like text is displayed as text; this import workflow does not execute spreadsheet formulas or fetch source URLs.
