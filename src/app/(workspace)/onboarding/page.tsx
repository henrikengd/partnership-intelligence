import { headers } from "next/headers";
import Link from "next/link";
import { requirePageActor } from "@/server/auth/page";
import { getOrganization } from "@/server/organization";
import { getWorkspaceData } from "@/modules/records/service";
import { getOnboarding, readiness, steps } from "@/modules/onboarding/service";
import { OrganizationForm } from "@/components/settings-forms";
import { RecordEditor } from "@/components/record-editor";
import {
  GenerateFirst,
  OnboardingControls,
} from "@/components/onboarding-controls";
import { RecordedGraphPanel } from "@/components/recorded-graph";
import { projectRecordedGraph } from "@/modules/network/projection";
import styles from "@/components/setup-workflow.module.css";
export default async function Page() {
  const h = await headers();
  const actor = await requirePageActor(h);
  const org = await getOrganization(h);
  const progress = await getOnboarding(h);
  const data = org ? await getWorkspaceData(h) : null;
  const step = progress.step;
  const ready = data ? readiness(data) : null;
  return (
    <div className={styles.workflow}>
      <span className="eyebrow">Set up your private workspace</span>
      <h1>Organization onboarding</h1>
      <p className="muted">
        Start with the records you have. A personal introduction is helpful, but
        you can assess a company without one.
      </p>
      <ol className={styles.steps}>
        {steps.map((label, index) => (
          <li
            key={label}
            aria-current={step === index ? "step" : undefined}
            className={step === index ? styles.active : ""}
          >
            <span>{index + 1}</span>
            {label}
            {progress.skippedSteps.includes(index) && <small>Skipped</small>}
          </li>
        ))}
      </ol>
      <h2>
        Step {step + 1}: {steps[step]}
      </h2>
      {step === 0 && (
        <section className="card">
          {actor.role === "admin" ? (
            <OrganizationForm initial={org} />
          ) : (
            <p>
              {org
                ? `${org.name} has a saved profile. An administrator can edit it in`
                : "An administrator must save the organization profile in"}{" "}
              <Link href="/settings">settings</Link>.
            </p>
          )}
        </section>
      )}
      {data && step === 1 && (
        <>
          <p>
            Define active needs with categories, urgency and the kind of support
            you could request.
          </p>
          <RecordEditor kind="needs" title="Need" data={data} />
        </>
      )}
      {data && step === 2 && (
        <>
          <p>
            Add people and candidate companies manually, or{" "}
            <Link href="/imports">import a CSV</Link>. External contacts can be
            saved without organization membership.
          </p>
          <div className="grid">
            <RecordEditor kind="people" title="Person" data={data} />
            <RecordEditor kind="companies" title="Company" data={data} />
          </div>
        </>
      )}
      {data && step === 3 && (
        <>
          <p>
            Record each employment period or known contact as a distinct
            relationship. Attribute observations and link capabilities to
            supplied sources.
          </p>
          <div className="grid">
            <RecordEditor kind="evidence" title="Evidence" data={data} />
            <RecordEditor kind="capabilities" title="Capability" data={data} />
            <RecordEditor
              kind="relationships"
              title="Relationship"
              data={data}
            />
          </div>
        </>
      )}
      {data && step === 4 && (
        <>
          <p>
            Save current and ended partnerships. Partnership history supplies
            context; it does not prove personal access.
          </p>
          <RecordEditor kind="partnerships" title="Partnership" data={data} />
        </>
      )}
      {data && step === 5 && (
        <>
          <p>
            Record previous outreach with its actual date and source. This does
            not send messages or mark a new action complete.
          </p>
          <RecordEditor
            kind="previousOutreach"
            title="Previous outreach"
            data={data}
          />
        </>
      )}
      {data && step === 6 && (
        <section className="card">
          <h3>Recorded graph preview</h3>
          <p>
            {data.organization.name} → {data.affiliations.length} recorded
            affiliations → {data.relationships.length} relationships →{" "}
            {data.companies.length} companies.
          </p>
          {data.relationships.length ? (
            <ul>
              {data.relationships.map((r) => (
                <li key={r.id}>
                  {data.people.find((p) => p.id === r.personId)?.name} →{" "}
                  {r.kind.replaceAll("_", " ")} →{" "}
                  {data.companies.find((c) => c.id === r.companyId)?.name ??
                    data.people.find((p) => p.id === r.targetPersonId)
                      ?.name}{" "}
                  · {r.state}
                </li>
              ))}
            </ul>
          ) : (
            <p>
              No personal relationship path recorded. Company evidence can still
              support a brief.
            </p>
          )}
          <RecordedGraphPanel
            projection={projectRecordedGraph(data)}
            data={data}
          />
          <Link href="/graph">Review the recorded relationship graph</Link>
        </section>
      )}
      {ready && step === 7 && (
        <section className="card">
          <h3>First-opportunity readiness</h3>
          <p>
            Supported pairs below have a matching capability and a supplied or
            reviewed source. Supplied claims still need human review. Unknown
            access, willingness and feasibility remain explicit in the brief.
          </p>
          {ready.tasks.map((t) => (
            <p key={t} className="notice">
              {t}{" "}
              <Link
                href={t.startsWith("Add an active") ? "/needs" : "/companies"}
              >
                Open relevant records
              </Link>
            </p>
          ))}
          {ready.supported.map((c) => (
            <GenerateFirst key={`${c.needId}:${c.companyId}`} candidate={c} />
          ))}
          {!data?.people.length && (
            <p className="muted">
              No people recorded. A cold approach and missing-contact questions
              are available; this does not block generation.
            </p>
          )}
        </section>
      )}
      {step === 8 && (
        <section className="card">
          <h3>Your workspace is ready to continue</h3>
          <p>
            You can return to onboarding, edit records and import more data at
            any time. Follow the readiness tasks for unsupported opportunities.
          </p>
          <Link href="/opportunities">Open opportunities</Link>
        </section>
      )}
      <OnboardingControls step={step} canContinue={Boolean(org)} />
      <p>
        <Link href="/imports">Data imports</Link> ·{" "}
        <Link href="/partnerships">Partnership and outreach history</Link> ·{" "}
        <Link href="/settings">Edit organization settings</Link>
      </p>
    </div>
  );
}
