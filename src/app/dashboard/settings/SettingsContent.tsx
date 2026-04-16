"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./settings.module.css";

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_public: boolean;
  role: string;
  locale: string;
  game_nickname: string | null;
  game_nickname_changed_at: string | null;
  game_nickname_history: { old: string; new: string; date: string }[];
  invite_code: string | null;
  invite_count_remaining: number;
}

interface Props {
  profile: Profile | null;
  email: string;
}

const NICKNAME_COOLDOWN_DAYS = 30;

export default function SettingsContent({ profile, email }: Props) {
  const [username, setUsername] = useState(profile?.username || "");
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [gameNickname, setGameNickname] = useState(profile?.game_nickname || "");
  const [isPublic, setIsPublic] = useState(profile?.is_public ?? true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [invitesLeft, setInvitesLeft] = useState(profile?.invite_count_remaining ?? 3);

  // Calculate nickname cooldown
  const nicknameCooldown = useMemo(() => {
    if (!profile?.game_nickname_changed_at) return null;
    const changedAt = new Date(profile.game_nickname_changed_at);
    const cooldownEnd = new Date(changedAt.getTime() + NICKNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();
    if (now >= cooldownEnd) return null;
    const daysLeft = Math.ceil((cooldownEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      daysLeft,
      endDate: cooldownEnd.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" }),
    };
  }, [profile?.game_nickname_changed_at]);

  const isNicknameLocked = !!nicknameCooldown && !!profile?.game_nickname;
  const isAdmin = profile?.role === "admin";
  const nicknameChanged = gameNickname.trim() !== (profile?.game_nickname || "");

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const supabase = createClient();

      // Build update payload
      const updatePayload: Record<string, unknown> = {
        username: username.trim(),
        display_name: displayName.trim(),
        is_public: isPublic,
      };

      // Handle game_nickname change
      if (nicknameChanged && !isNicknameLocked) {
        const newNick = gameNickname.trim();
        if (newNick) {
          // Build history entry
          const history = profile?.game_nickname_history || [];
          if (profile?.game_nickname) {
            history.push({
              old: profile.game_nickname,
              new: newNick,
              date: new Date().toISOString(),
            });
          }

          updatePayload.game_nickname = newNick;
          updatePayload.game_nickname_changed_at = new Date().toISOString();
          updatePayload.game_nickname_history = history;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", profile?.id);

      if (error) {
        if (error.code === "23505") {
          if (error.message?.includes("game_nickname")) {
            setMessage({ type: "error", text: "Ta ksywka jest już zajęta przez innego gracza." });
          } else {
            setMessage({ type: "error", text: "Ta nazwa użytkownika jest już zajęta." });
          }
        } else {
          setMessage({ type: "error", text: error.message });
        }
      } else {
        setMessage({ type: "success", text: "Profil zapisany! ✅" });
      }
    } catch {
      setMessage({ type: "error", text: "Nie udało się zapisać profilu." });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteSending(true);
    setInviteMsg(null);

    try {
      const supabase = createClient();
      const email = inviteEmail.trim();

      // Check remaining invites
      if (invitesLeft <= 0) {
        setInviteMsg({ type: "error", text: "Nie masz już dostępnych zaproszeń." });
        return;
      }

      // Deduplication: check for existing active token
      const { data: existingToken } = await supabase
        .from("invite_tokens")
        .select("token")
        .eq("inviter_id", profile?.id)
        .eq("email", email)
        .is("used_by", null)
        .gt("expires_at", new Date().toISOString())
        .limit(1)
        .single();

      let token: string;
      if (existingToken) {
        token = existingToken.token;
      } else {
        token = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
        const { error } = await supabase.from("invite_tokens").insert({
          inviter_id: profile?.id,
          token,
          email,
        });

        if (error) {
          setInviteMsg({ type: "error", text: "Błąd tworzenia zaproszenia: " + error.message });
          return;
        }
      }

      // Send email via API
      const inviterName = profile?.display_name || profile?.username || "Gracz QCStats";
      const res = await fetch("/api/invite/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, inviterName }),
      });

      if (res.ok) {
        setInvitesLeft((prev) => Math.max(0, prev - 1));
        setInviteMsg({ type: "success", text: `✅ Zaproszenie wysłane do ${email}!` });
        setInviteEmail("");
      } else {
        const data = await res.json().catch(() => ({}));
        setInviteMsg({ type: "error", text: data.error || "Błąd wysyłania emaila." });
      }
    } catch {
      setInviteMsg({ type: "error", text: "Wystąpił błąd." });
    } finally {
      setInviteSending(false);
    }
  };

  return (
    <div className={styles.page}>
      <h1>
        ⚙️ <span className={styles.accent}>Ustawienia</span> profilu
      </h1>

      {/* ═══ GAME NICKNAME SECTION ═══ */}
      <div className={`${styles.section} ${styles.gameNicknameSection}`}>
        <h2>🎮 Ksywka w grze</h2>
        <div className={styles.gameNicknameWarning}>
          <span className={styles.warningIcon}>⚠️</span>
          <div>
            <strong>WAŻNE:</strong> Ta ksywka MUSI odpowiadać Twojej ksywce widocznej na screenshotach z Quake Champions.
            System weryfikuje nicki na screenie — jeśli Twoja ksywka nie zostanie znaleziona, nie będziesz mógł zapisać meczu.
          </div>
        </div>

        <div className={styles.field}>
          <label>Ksywka w QC</label>
          {isNicknameLocked && !isAdmin ? (
            <>
              <input
                type="text"
                value={gameNickname}
                className={styles.inputDisabled}
                disabled
              />
              <div className={styles.cooldownInfo}>
                <span className={styles.cooldownIcon}>🔒</span>
                <span>
                  Zmiana zablokowana — następna możliwa za <strong>{nicknameCooldown.daysLeft} dni</strong> ({nicknameCooldown.endDate}).
                  <br />
                  Potrzebujesz wcześniej? <a href="mailto:admin@qcstats.gg" className={styles.adminLink}>Kontakt z adminem →</a>
                </span>
              </div>
            </>
          ) : (
            <>
              <input
                type="text"
                value={gameNickname}
                onChange={(e) => setGameNickname(e.target.value)}
                className={styles.input}
                placeholder="Twoja ksywka z Quake Champions"
                maxLength={30}
              />
              <span className={styles.hint}>
                Wpisz dokładnie taką ksywkę, jaką masz ustawioną w grze. Zmiana możliwa raz na {NICKNAME_COOLDOWN_DAYS} dni.
              </span>
            </>
          )}
        </div>

        {/* Nickname change history */}
        {profile?.game_nickname_history && profile.game_nickname_history.length > 0 && (
          <div className={styles.nicknameHistory}>
            <span className={styles.historyLabel}>Historia zmian:</span>
            {profile.game_nickname_history.slice(-3).map((entry, i) => (
              <span key={i} className={styles.historyEntry}>
                {entry.old} → {entry.new} <small>({new Date(entry.date).toLocaleDateString("pl-PL")})</small>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ═══ ACCOUNT SECTION ═══ */}
      <div className={styles.section}>
        <h2>Konto</h2>
        <div className={styles.field}>
          <label>Email</label>
          <input type="email" value={email} disabled className={styles.inputDisabled} />
          <span className={styles.hint}>Adres email nie może być zmieniony.</span>
        </div>

        <div className={styles.field}>
          <label>Nazwa użytkownika (URL profilu)</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={styles.input}
            placeholder="Twoja unikatowa nazwa użytkownika"
            maxLength={30}
          />
          <span className={styles.hint}>Używana w adresie profilu: qcstats.vercel.app/player/{username || "..."}</span>
        </div>

        <div className={styles.field}>
          <label>Nazwa wyświetlana</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={styles.input}
            placeholder="Jak chcesz być wyświetlany"
            maxLength={50}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.toggleLabel}>
            <div className={styles.toggleInfo}>
              <span>Publiczny profil</span>
              <span className={styles.hint}>Pozwól innym widzieć Twoje statystyki i historię meczów.</span>
            </div>
            <button
              type="button"
              className={`${styles.toggle} ${isPublic ? styles.toggleOn : ""}`}
              onClick={() => setIsPublic(!isPublic)}
            >
              <span className={styles.toggleKnob} />
            </button>
          </label>
        </div>

        <div className={styles.field}>
          <label>Rola</label>
          <div className={styles.roleBadge}>
            {profile?.role === "admin" ? "🛡️ Admin" : profile?.role === "mod" ? "⚔️ Moderator" : "🎮 Gracz"}
          </div>
        </div>
      </div>

      {message && (
        <div className={`${styles.message} ${message.type === "success" ? styles.messageSuccess : styles.messageError}`}>
          {message.text}
        </div>
      )}

      <div className={styles.actions}>
        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? "Zapisywanie..." : "💾 Zapisz zmiany"}
        </button>
      </div>

      {/* ═══ INVITE SECTION ═══ */}
      <div className={`${styles.section} ${styles.inviteSection}`}>
        <h2>📨 Zaproś znajomego</h2>
        <p className={styles.inviteDesc}>
          QCStats działa na zaproszeniach. Zaproś swoich przeciwników na arenę!
        </p>

        <div className={styles.inviteCountBox}>
          <span className={styles.inviteCountLabel}>Dostępne zaproszenia:</span>
          <span className={styles.inviteCountValue}>
            {invitesLeft}
          </span>
        </div>

        <div className={styles.inviteInputRow}>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@przeciwnika.pl"
            className={styles.input}
            disabled={inviteSending || invitesLeft <= 0}
          />
          <button
            className={styles.inviteSendBtn}
            onClick={handleSendInvite}
            disabled={inviteSending || !inviteEmail.trim() || invitesLeft <= 0}
          >
            {inviteSending ? "✈️ Wysyłanie..." : "✈️ Wyślij zaproszenie"}
          </button>
        </div>

        {inviteMsg && (
          <div className={`${styles.message} ${inviteMsg.type === "success" ? styles.messageSuccess : styles.messageError}`}>
            {inviteMsg.text}
          </div>
        )}

        <div className={styles.inviteHowItWorks}>
          <strong>Jak to działa?</strong>
          <ol>
            <li>Wpisz email przeciwnika</li>
            <li>Otworzy się Twój klient poczty z gotowym zaproszeniem</li>
            <li>Wyślij email — link zaproszeniowy jest ważny 7 dni</li>
            <li>Po rejestracji automatycznie stajecie się znajomymi!</li>
          </ol>
        </div>
      </div>

      <div className={styles.dangerZone}>
        <h2>Strefa zagrożenia</h2>
        <button className={styles.logoutBtn} onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? "Wylogowywanie..." : "🚪 Wyloguj się"}
        </button>
      </div>
    </div>
  );
}
