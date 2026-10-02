"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
type Mode = "login" | "setup" | "invite";
export function AuthForm({ mode, token = "" }: { mode: Mode; token?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const endpoint =
      mode === "login"
        ? "/api/auth/sign-in/email"
        : mode === "setup"
          ? "/api/setup"
          : "/api/invitations/accept";
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, token }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error?.message ?? result.message ?? "The request failed.",
        );
      if (mode === "login") {
        router.push("/dashboard");
        router.refresh();
      } else setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <div className="notice">
        <p>Your account is ready. Sign in to continue.</p>
        <Link className="button" href="/login">
          Sign in
        </Link>
      </div>
    );
  return (
    <form onSubmit={submit}>
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
      {mode !== "login" && (
        <div>
          <label htmlFor="name">Your name</label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            required
            maxLength={120}
          />
        </div>
      )}
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
        />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={mode === "login" ? 1 : 12}
          maxLength={128}
          required
        />
        {mode !== "login" && (
          <span className="muted small">Use at least 12 characters.</span>
        )}
      </div>
      {mode === "setup" && (
        <div>
          <label htmlFor="secret">Installation setup secret</label>
          <input
            id="secret"
            name="secret"
            type="password"
            autoComplete="off"
            required
          />
          <span className="muted small">
            Your operator configured this secret on the server.
          </span>
        </div>
      )}
      <button disabled={busy}>
        {busy
          ? "Please wait…"
          : mode === "login"
            ? "Sign in"
            : mode === "setup"
              ? "Create administrator"
              : "Accept invitation"}
      </button>
    </form>
  );
}
