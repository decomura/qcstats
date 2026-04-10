"use client";

import { useState } from "react";
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
}

interface Props {
  profile: Profile | null;
  email: string;
}

export default function SettingsContent({ profile, email }: Props) {
  const [username, setUsername] = useState(profile?.username || "");
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [isPublic, setIsPublic] = useState(profile?.is_public ?? true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          username: username.trim(),
          display_name: displayName.trim(),
          is_public: isPublic,
        })
        .eq("id", profile?.id);

      if (error) {
        if (error.code === "23505") {
          setMessage({ type: "error", text: "This username is already taken." });
        } else {
          setMessage({ type: "error", text: error.message });
        }
      } else {
        setMessage({ type: "success", text: "Profile saved successfully!" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save profile." });
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

  return (
    <div className={styles.page}>
      <h1>
        ⚙️ <span className={styles.accent}>Profile</span> Settings
      </h1>

      <div className={styles.section}>
        <h2>Account</h2>
        <div className={styles.field}>
          <label>Email</label>
          <input type="email" value={email} disabled className={styles.inputDisabled} />
          <span className={styles.hint}>Email cannot be changed.</span>
        </div>

        <div className={styles.field}>
          <label>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={styles.input}
            placeholder="Your unique username"
            maxLength={30}
          />
          <span className={styles.hint}>Used in your public profile URL. Must be unique.</span>
        </div>

        <div className={styles.field}>
          <label>Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={styles.input}
            placeholder="How you want to be displayed"
            maxLength={50}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.toggleLabel}>
            <div className={styles.toggleInfo}>
              <span>Public Profile</span>
              <span className={styles.hint}>Allow others to view your stats and match history.</span>
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
          <label>Role</label>
          <div className={styles.roleBadge}>
            {profile?.role === "admin" ? "🛡️ Admin" : profile?.role === "mod" ? "⚔️ Moderator" : "🎮 Player"}
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
          {saving ? "Saving..." : "💾 Save Changes"}
        </button>
      </div>

      <div className={styles.dangerZone}>
        <h2>Danger Zone</h2>
        <button className={styles.logoutBtn} onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? "Logging out..." : "🚪 Log Out"}
        </button>
      </div>
    </div>
  );
}
