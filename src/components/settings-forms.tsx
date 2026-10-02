"use client";
import { useState } from "react";
type Organization = {
  name: string;
  mission: string;
  website: string | null;
  type: string;
  location: string;
  teamSize: number | null;
  timezone: string;
};
type Account = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor";
  active: boolean;
};
async function send(url: string, body: unknown, method = "POST") {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error?.message ?? result.message ?? "The request failed.",
    );
  return result;
}
export function OrganizationForm({
  initial,
}: {
  initial: Organization | null;
}) {
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        setSaved(false);
        const data = Object.fromEntries(new FormData(event.currentTarget));
        try {
          await send(
            "/api/organization",
            {
              ...data,
              teamSize: data.teamSize ? Number(data.teamSize) : null,
              website: data.website || null,
            },
            "PUT",
          );
          setSaved(true);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="notice">
          Organization profile saved.
        </p>
      )}
      <div>
        <label htmlFor="org-name">Organization name</label>
        <input
          id="org-name"
          name="name"
          defaultValue={initial?.name}
          required
          maxLength={160}
        />
      </div>
      <div>
        <label htmlFor="mission">Mission</label>
        <textarea
          id="mission"
          name="mission"
          defaultValue={initial?.mission}
          maxLength={4000}
        />
      </div>
      <div>
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="url"
          defaultValue={initial?.website ?? ""}
        />
      </div>
      <div>
        <label htmlFor="org-type">Organization type</label>
        <input
          id="org-type"
          name="type"
          defaultValue={initial?.type ?? "other"}
          required
          maxLength={100}
        />
      </div>
      <div>
        <label htmlFor="location">Location</label>
        <input
          id="location"
          name="location"
          defaultValue={initial?.location}
          maxLength={200}
        />
      </div>
      <div>
        <label htmlFor="team-size">Team size</label>
        <input
          id="team-size"
          name="teamSize"
          type="number"
          min={0}
          max={1000000}
          defaultValue={initial?.teamSize ?? ""}
        />
      </div>
      <div>
        <label htmlFor="timezone">Time zone</label>
        <input
          id="timezone"
          name="timezone"
          defaultValue={initial?.timezone ?? "UTC"}
          required
        />
        <span className="muted small">
          Use an IANA time zone such as Europe/Oslo.
        </span>
      </div>
      <button disabled={busy}>{busy ? "Saving…" : "Save organization"}</button>
    </form>
  );
}
export function AccessSettings({ accounts }: { accounts: Account[] }) {
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="stack">
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          setBusy(true);
          const data = Object.fromEntries(new FormData(event.currentTarget));
          try {
            const invite = await send("/api/admin/invitations", data);
            setLink(`${window.location.origin}/invite?token=${invite.token}`);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div>
          <label htmlFor="invite-email">Invite email</label>
          <input id="invite-email" name="email" type="email" required />
        </div>
        <div>
          <label htmlFor="invite-role">Access role</label>
          <select id="invite-role" name="role">
            <option value="editor">Editor</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
        <button disabled={busy}>
          {busy ? "Creating…" : "Create invitation"}
        </button>
      </form>
      {link && (
        <div className="notice" role="status">
          <p>Share this one-time link privately. It expires in 72 hours.</p>
          <code data-testid="invite-link">{link}</code>
        </div>
      )}
      <div>
        <h2>Team access</h2>
        {accounts.map((account) => (
          <div className="account" key={account.id}>
            <strong>{account.name}</strong>
            <p className="muted small">
              {account.email} · {account.role} ·{" "}
              {account.active ? "Active" : "Revoked"}
            </p>
            <div className="row">
              <button
                className="secondary"
                onClick={async () => {
                  setError("");
                  try {
                    await send("/api/admin/access", {
                      userId: account.id,
                      role: account.role,
                      active: !account.active,
                    });
                    window.location.reload();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Try again.");
                  }
                }}
              >
                {account.active ? "Revoke access" : "Restore access"}
              </button>
              <button
                className="secondary"
                onClick={async () => {
                  setError("");
                  try {
                    await send("/api/admin/access", {
                      userId: account.id,
                      active: account.active,
                      role: account.role === "admin" ? "editor" : "admin",
                    });
                    window.location.reload();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Try again.");
                  }
                }}
              >
                {account.role === "admin"
                  ? "Make editor"
                  : "Make administrator"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export function PasswordForm() {
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        const data = Object.fromEntries(new FormData(event.currentTarget));
        try {
          await send("/api/auth/change-password", {
            ...data,
            revokeOtherSessions: true,
          });
          setDone(true);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Try again.");
        }
      }}
    >
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="notice">
          Password changed. Other sessions were revoked.
        </p>
      )}
      <div>
        <label htmlFor="current-password">Current password</label>
        <input
          id="current-password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div>
        <label htmlFor="new-password">New password</label>
        <input
          id="new-password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
        />
      </div>
      <button>Change password</button>
    </form>
  );
}
