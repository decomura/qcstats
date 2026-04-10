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
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  // Check for invite code in URL params
  useEffect(() => {
    const invite = searchParams.get("invite");
    if (invite) {
      setInviteCode(invite);
      localStorage.setItem("qcstats_invite", invite);
      setMode("register");
    } else {
      const stored = localStorage.getItem("qcstats_invite");
      if (stored) setInviteCode(stored);
    }
  }, [searchParams]);

  // Process invite code after successful auth
  const processInvite = async () => {
    const code = localStorage.getItem("qcstats_invite");
    if (!code) return;
    try {
      await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: code }),
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
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setError("Check your email for the confirmation link!");
        setLoading(false);
        return;
      }
      await processInvite();
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    // Include invite code in redirect so auth callback can pass it through
    const callbackUrl = inviteCode
      ? `${window.location.origin}/auth/callback?invite=${inviteCode}`
      : `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
      },
    });
    if (error) setError(error.message);
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginContainer}>
        {/* Invite Banner */}
        {inviteCode && (
          <div className={styles.inviteBanner}>
            🎮 You've been invited to join QCStats!
          </div>
        )}

        {/* Logo */}
        <div className={styles.logo}>
          <span className={styles.logoQc}>QC</span>
          <span className={styles.logoStats}>STATS</span>
        </div>
        <p className={styles.tagline}>
          {inviteCode
            ? "Register to join your friend in the arena!"
            : mode === "login"
            ? "Enter the arena. Track your stats."
            : "Join the arena. Start tracking."}
        </p>

        {/* Google OAuth */}
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
          Continue with Google
        </button>

        {/* Divider */}
        <div className={styles.divider}>
          <span>or</span>
        </div>

        {/* Email Form */}
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
              placeholder="player@arena.gg"
              required
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
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
                error.includes("Check your email") ? styles.success : styles.errorMsg
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
              ? "Loading..."
              : mode === "login"
              ? "⚡ Enter Arena"
              : "🎯 Create Account"}
          </button>
        </form>

        {/* Toggle mode */}
        <p className={styles.toggleMode}>
          {mode === "login" ? (
            <>
              New to the arena?{" "}
              <button onClick={() => setMode("register")} type="button">
                Register
              </button>
            </>
          ) : (
            <>
              Already fragging?{" "}
              <button onClick={() => setMode("login")} type="button">
                Login
              </button>
            </>
          )}
        </p>

        {/* Back to landing */}
        <a href="/" className={styles.backLink}>
          ← Back to QCStats
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
