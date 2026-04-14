"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import styles from "./login.module.css";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [inviteChecking, setInviteChecking] = useState(false);
  const [inviterName, setInviterName] = useState<string | null>(null);

  // Check for invite token in URL params
  useEffect(() => {
    const invite = searchParams.get("invite");
    if (invite) {
      setInviteToken(invite);
      localStorage.setItem("qcstats_invite", invite);
      // Validate first, then decide mode
      validateInviteToken(invite);
    } else {
      const stored = localStorage.getItem("qcstats_invite");
      if (stored) {
        setInviteToken(stored);
        validateInviteToken(stored);
      }
    }
  }, [searchParams]);

  const validateInviteToken = async (token: string) => {
    setInviteChecking(true);
    try {
      const res = await fetch(`/api/invite/validate?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      setInviteValid(data.valid);
      setInviterName(data.inviterName || null);
      if (data.valid) {
        setMode("register");
      } else {
        // Invalid token — stay in login mode, existing users can log in
        localStorage.removeItem("qcstats_invite");
        setMode("login");
      }
    } catch {
      setInviteValid(false);
      setMode("login");
    } finally {
      setInviteChecking(false);
    }
  };

  // Process invite token after successful auth
  const processInvite = async () => {
    const token = localStorage.getItem("qcstats_invite");
    if (!token) return;
    try {
      await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_token: token }),
      });
    } catch {
      // Silently fail – friendship is nice-to-have, not critical
    } finally {
      localStorage.removeItem("qcstats_invite");
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        // Registration requires invite token
        if (!inviteToken || !inviteValid) {
          setError("Rejestracja wymaga zaproszenia. Poproś kogoś z QCStats o link zaproszeniowy.");
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?invite=${inviteToken}`,
          },
        });
        if (error) throw error;
        setError("Sprawdź swoją skrzynkę email — kliknij link potwierdzający!");
        setLoading(false);
        return;
      }
      await processInvite();
      const redirectTo = searchParams.get("redirect") || "/dashboard";
      router.push(redirectTo);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Uwierzytelnianie nie powiodło się");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    // Build callback URL preserving invite token and redirect destination
    const redirectDest = searchParams.get("redirect") || "/dashboard";
    const params = new URLSearchParams();
    params.set("next", redirectDest);
    if (inviteToken) params.set("invite", inviteToken);
    const callbackUrl = `${window.location.origin}/auth/callback?${params.toString()}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
      },
    });
    if (error) setError(error.message);
  };

  const canRegister = inviteToken && inviteValid;

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginContainer}>
        {/* Invite Banner */}
        {inviteToken && inviteValid && inviterName && (
          <div className={styles.inviteBanner}>
            🎮 <strong>{inviterName}</strong> zaprasza Cię do QCStats!
          </div>
        )}

        {/* Invalid/expired invite — non-blocking info */}
        {inviteToken && inviteValid === false && !inviteChecking && (
          <div className={styles.inviteBannerError}>
            ℹ️ This invite link is invalid or expired. You can still log in
            if you already have an account.
          </div>
        )}

        {/* Logo */}
        <div className={styles.logo}>
          <span className={styles.logoQc}>QC</span>
          <span className={styles.logoStats}>STATS</span>
        </div>
        <p className={styles.tagline}>
          {canRegister
            ? "Zarejestruj się i dołącz do areny!"
            : mode === "login"
            ? "Wejdź na arenę. Śledź swoje statystyki."
            : "Rejestracja tylko na zaproszenie."}
        </p>

        {/* Google OAuth */}
        {(mode === "login" || canRegister) && (
          <button
            className={styles.googleBtn}
            onClick={handleGoogleLogin}
            type="button"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                fill="#EA4335"
              />
            </svg>
            {mode === "login" ? "Zaloguj przez Google" : "Zarejestruj przez Google"}
          </button>
        )}

        {/* Divider */}
        {(mode === "login" || canRegister) && (
          <div className={styles.divider}>
            <span>lub</span>
          </div>
        )}

        {/* Email Form — visible for login always, for register only with valid invite */}
        {(mode === "login" || canRegister) && (
          <form onSubmit={handleEmailAuth} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="gracz@arena.gg"
                required
                className={styles.input}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.label}>
                Hasło
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className={styles.input}
              />
            </div>

            {error && (
              <div
                className={`${styles.message} ${
                  error.includes("Sprawdź") ? styles.success : styles.errorMsg
                }`}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className={`btn btn-primary btn-lg ${styles.submitBtn}`}
              disabled={loading}
            >
              {loading
                ? "Ładowanie..."
                : mode === "login"
                ? "⚡ Wejdź na arenę"
                : "🎯 Utwórz konto"}
            </button>
          </form>
        )}

        {/* Invite-only notice for register without invite */}
        {mode === "register" && !canRegister && !inviteChecking && (
          <div className={styles.inviteOnlyNotice}>
            <span style={{ fontSize: "2rem" }}>🔒</span>
            <h3>Rejestracja tylko na zaproszenie</h3>
            <p>
              QCStats jest zamkniętą społecznością. Aby dołączyć, potrzebujesz
              zaproszenia od istniejącego gracza.
            </p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Już grasz z kimś z QCStats? Poproś go o zaproszenie emailowe!
            </p>
          </div>
        )}

        {/* Toggle mode */}
        <p className={styles.toggleMode}>
          {mode === "login" ? (
            <>
              Nowy na arenie?{" "}
              <button onClick={() => setMode("register")} type="button">
                Rejestracja
              </button>
            </>
          ) : (
            <>
              Masz już konto?{" "}
              <button onClick={() => setMode("login")} type="button">
                Zaloguj się
              </button>
            </>
          )}
        </p>

        {/* Back to landing */}
        <a href="/" className={styles.backLink}>
          ← Powrót do QCStats
        </a>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
