"use client";

import { useEffect} from "react";
import { useSearchParams } from "next/navigation";

/**
 * Processes invite codes from URL params (after Google OAuth redirect).
 * Placed inside dashboard layout to run after successful authentication.
 */
export default function InviteProcessor() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const invite = searchParams.get("invite");
    // Also check localStorage (set by login page before Google redirect)
    const storedInvite = localStorage.getItem("qcstats_invite");
    const code = invite || storedInvite;

    if (!code) return;

    const processInvite = async () => {
      try {
        const res = await fetch("/api/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invite_code: code }),
        });
        const data = await res.json();
        if (data.success) {
          console.log(`🤝 Auto-friended with invite from ${data.inviter}`);
        }
      } catch {
        // Silently fail
      } finally {
        localStorage.removeItem("qcstats_invite");
        // Clean invite from URL without reload
        if (invite) {
          const url = new URL(window.location.href);
          url.searchParams.delete("invite");
          window.history.replaceState({}, "", url.toString());
        }
      }
    };

    processInvite();
  }, [searchParams]);

  return null; // Invisible component
}
