"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function Logout() {
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <div>
      <button
        className="secondary small"
        onClick={async () => {
          try {
            const r = await fetch("/api/auth/sign-out", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: "{}",
            });
            if (!r.ok) throw new Error();
            router.replace("/login");
            router.refresh();
          } catch {
            setError("Sign out failed. Try again.");
          }
        }}
      >
        Sign out
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
