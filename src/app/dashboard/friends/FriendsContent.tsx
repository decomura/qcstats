"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import styles from "./friends.module.css";

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface Friendship {
  id: string;
  status: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  user: Profile | Profile[];
  friend: Profile | Profile[];
}

interface Notification {
  id: string;
  type: string;
  message: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

interface Props {
  userId: string;
  inviteCountRemaining: number;
  displayName: string;
  role: string;
  friendships: Friendship[];
  notifications: Notification[];
}

function getProfile(data: Profile | Profile[]): Profile {
  return Array.isArray(data) ? data[0] : data;
}

export default function FriendsContent({ userId, inviteCountRemaining, displayName, role, friendships, notifications }: Props) {
  const { t } = useI18n();
  const supabase = createClient();
  const [searchName, setSearchName] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [tab, setTab] = useState<"friends" | "pending" | "notifications">("friends");
  const [localFriendships, setLocalFriendships] = useState(friendships);
  const [localNotifications, setLocalNotifications] = useState(notifications);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [inviteEmails, setInviteEmails] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [invitesLeft, setInvitesLeft] = useState(inviteCountRemaining);
  const isAdmin = role === "admin";

  const accepted = localFriendships.filter((f) => f.status === "accepted");
  const pendingReceived = localFriendships.filter(
    (f) => f.status === "pending" && f.friend_id === userId
  );
  const pendingSent = localFriendships.filter(
    (f) => f.status === "pending" && f.user_id === userId
  );

  const sendEmailInvites = async () => {
    if (!inviteEmails.trim()) return;
    setSendingInvite(true);
    setMessage(null);

    const emails = inviteEmails
      .split(/[,;\s]+/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));

    if (emails.length === 0) {
      setMessage({ type: "error", text: "Wpisz poprawne adresy email." });
      setSendingInvite(false);
      return;
    }

    if (invitesLeft < emails.length) {
      setMessage({ type: "error", text: `Masz tylko ${invitesLeft} zaproszeń. Próbujesz wysłać ${emails.length}.` });
      setSendingInvite(false);
      return;
    }

    try {
      // Generate tokens and send emails
      const sent: string[] = [];
      const failed: string[] = [];

      for (const email of emails) {
        const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
        const { error } = await supabase.from("invite_tokens").insert({
          inviter_id: userId,
          token,
          email,
        });
        if (error) {
          failed.push(email);
          continue;
        }

        // Send email via API
        const res = await fetch("/api/invite/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, token, inviterName: displayName }),
        });

        if (res.ok) {
          sent.push(email);
        } else {
          failed.push(email);
        }
      }

      setInvitesLeft((prev) => Math.max(0, prev - sent.length));

      if (sent.length > 0 && failed.length === 0) {
        setMessage({ type: "success", text: `✅ Zaproszenie wysłane do: ${sent.join(", ")}` });
      } else if (sent.length > 0 && failed.length > 0) {
        setMessage({ type: "success", text: `✅ Wysłano: ${sent.join(", ")}. ❌ Błąd: ${failed.join(", ")}` });
      } else {
        setMessage({ type: "error", text: `Błąd wysyłania do: ${failed.join(", ")}` });
      }
      setInviteEmails("");
    } catch {
      setMessage({ type: "error", text: "Wystąpił błąd." });
    } finally {
      setSendingInvite(false);
    }
  };

  const handleSearch = async () => {
    if (!searchName.trim()) return;
    setSearching(true);
    setMessage(null);

    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .ilike("username", `%${searchName.trim()}%`)
      .neq("id", userId)
      .limit(10);

    setSearchResults(data || []);
    setSearching(false);
  };

  const sendRequest = async (targetId: string) => {
    setMessage(null);
    const { error } = await supabase.from("friendships").insert({
      user_id: userId,
      friend_id: targetId,
    });

    if (error) {
      if (error.code === "23505") {
        setMessage({ type: "error", text: "Friend request already sent." });
      } else {
        setMessage({ type: "error", text: error.message });
      }
    } else {
      setMessage({ type: "success", text: "Friend request sent! 🎯" });
      setSearchResults((prev) => prev.filter((p) => p.id !== targetId));

      // Create notification for the target
      await supabase.from("notifications").insert({
        user_id: targetId,
        type: "friend_request",
        title: "New Friend Request",
        body: `Someone wants to be your friend!`,
      });
    }
  };

  const handleAccept = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friends")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", friendshipId);

    if (!error) {
      setLocalFriendships((prev) =>
        prev.map((f) => (f.id === friendshipId ? { ...f, status: "accepted" } : f))
      );
    }
  };

  const handleDecline = async (friendshipId: string) => {
    await supabase.from("friends").delete().eq("id", friendshipId);
    setLocalFriendships((prev) => prev.filter((f) => f.id !== friendshipId));
  };

  const handleRemove = async (friendshipId: string) => {
    await supabase.from("friends").delete().eq("id", friendshipId);
    setLocalFriendships((prev) => prev.filter((f) => f.id !== friendshipId));
  };

  const markAllRead = async () => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    setLocalNotifications([]);
  };

  const getFriendProfile = (f: Friendship): Profile => {
    return f.user_id === userId ? getProfile(f.friend) : getProfile(f.user);
  };

  return (
    <div className={styles.page}>
      <h1>
        👥 <span className={styles.accent}>{t("friends.title")}</span>
      </h1>

      {/* ═══════════ INVITE SECTION ═══════════ */}
      <div className={styles.inviteSection}>
        <h2 className={styles.inviteTitle}>📨 Zaproś na arenę</h2>
        <p className={styles.inviteDesc}>
          Wpisz email przeciwnika — otrzyma unikatowy link zaproszeniowy. Po rejestracji automatycznie stajecie się znajomymi!
        </p>

        <div className={styles.inviteCountBox}>
          <span>Dostępne zaproszenia:</span>
          <span className={styles.inviteCountValue}>{invitesLeft}</span>
        </div>

        {/* Email Invite */}
        <div className={styles.emailInvite}>
          <input
            type="text"
            value={inviteEmails}
            onChange={(e) => setInviteEmails(e.target.value)}
            placeholder="email@przeciwnika.pl"
            className={styles.emailInput}
            disabled={sendingInvite || invitesLeft <= 0}
          />
          <button
            onClick={sendEmailInvites}
            className={styles.sendEmailBtn}
            disabled={sendingInvite || !inviteEmails.trim() || invitesLeft <= 0}
          >
            {sendingInvite ? "✈️ Wysyłanie..." : "✈️ Wyślij"}
          </button>
        </div>
      </div>

      {/* ═══════════ SEARCH ═══════════ */}
      <div className={styles.searchBox}>
        <input
          type="text"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search by username..."
          className={styles.searchInput}
        />
        <button onClick={handleSearch} className={styles.searchBtn} disabled={searching}>
          {searching ? "..." : "🔍"}
        </button>
      </div>

      {message && (
        <div className={`${styles.msg} ${message.type === "success" ? styles.msgOk : styles.msgErr}`}>
          {message.text}
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className={styles.section}>
          <h3>Search Results</h3>
          {searchResults.map((p) => (
            <div key={p.id} className={styles.friendRow}>
              <div className={styles.friendAvatar}>{p.display_name.charAt(0).toUpperCase()}</div>
              <div className={styles.friendInfo}>
                <span className={styles.friendName}>{p.display_name}</span>
                <span className={styles.friendUsername}>@{p.username}</span>
              </div>
              <button onClick={() => sendRequest(p.id)} className={styles.actionBtn}>
                ➕ {t("friends.sendRequest")}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === "friends" ? styles.tabActive : ""}`}
          onClick={() => setTab("friends")}
        >
          {t("friends.accepted")} ({accepted.length})
        </button>
        <button
          className={`${styles.tab} ${tab === "pending" ? styles.tabActive : ""}`}
          onClick={() => setTab("pending")}
        >
          {t("friends.pending")} ({pendingReceived.length + pendingSent.length})
        </button>
        <button
          className={`${styles.tab} ${tab === "notifications" ? styles.tabActive : ""}`}
          onClick={() => setTab("notifications")}
        >
          🔔 ({localNotifications.length})
        </button>
      </div>

      {/* Friends Tab */}
      {tab === "friends" && (
        <div className={styles.section}>
          {accepted.length === 0 ? (
            <div className={styles.empty}>{t("friends.noFriends")} 😢</div>
          ) : (
            accepted.map((f) => {
              const friend = getFriendProfile(f);
              return (
                <div key={f.id} className={styles.friendRow}>
                  <div className={styles.friendAvatar}>{friend.display_name.charAt(0).toUpperCase()}</div>
                  <div className={styles.friendInfo}>
                    <a href={`/player/${friend.username}`} className={styles.friendName}>{friend.display_name}</a>
                    <span className={styles.friendUsername}>@{friend.username}</span>
                  </div>
                  <button onClick={() => handleRemove(f.id)} className={styles.removeBtn}>
                    ✕
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Pending Tab */}
      {tab === "pending" && (
        <div className={styles.section}>
          {pendingReceived.length > 0 && <h3>Received</h3>}
          {pendingReceived.map((f) => {
            const sender = getProfile(f.user);
            return (
              <div key={f.id} className={styles.friendRow}>
                <div className={styles.friendAvatar}>{sender.display_name.charAt(0).toUpperCase()}</div>
                <div className={styles.friendInfo}>
                  <span className={styles.friendName}>{sender.display_name}</span>
                  <span className={styles.friendUsername}>@{sender.username}</span>
                </div>
                <div className={styles.rowActions}>
                  <button onClick={() => handleAccept(f.id)} className={styles.acceptBtn}>
                    ✓ {t("friends.accept")}
                  </button>
                  <button onClick={() => handleDecline(f.id)} className={styles.declineBtn}>
                    ✕ {t("friends.decline")}
                  </button>
                </div>
              </div>
            );
          })}

          {pendingSent.length > 0 && <h3>Sent</h3>}
          {pendingSent.map((f) => {
            const target = getProfile(f.friend);
            return (
              <div key={f.id} className={styles.friendRow}>
                <div className={styles.friendAvatar}>{target.display_name.charAt(0).toUpperCase()}</div>
                <div className={styles.friendInfo}>
                  <span className={styles.friendName}>{target.display_name}</span>
                  <span className={styles.friendUsername}>@{target.username}</span>
                </div>
                <span className={styles.pendingBadge}>Pending...</span>
              </div>
            );
          })}

          {pendingReceived.length === 0 && pendingSent.length === 0 && (
            <div className={styles.empty}>No pending requests</div>
          )}
        </div>
      )}

      {/* Notifications Tab */}
      {tab === "notifications" && (
        <div className={styles.section}>
          {localNotifications.length > 0 && (
            <button onClick={markAllRead} className={styles.markReadBtn}>
              Mark all read
            </button>
          )}
          {localNotifications.length === 0 ? (
            <div className={styles.empty}>No new notifications 📭</div>
          ) : (
            localNotifications.map((n) => (
              <div key={n.id} className={styles.notifRow}>
                <span className={styles.notifIcon}>
                  {n.type === "friend_request" ? "👤" : n.type === "friend_accepted" || n.type === "friend_joined" ? "🤝" : "📢"}
                </span>
                <div className={styles.notifContent}>
                <span className={styles.notifTitle}>{n.message}</span>
                  <span className={styles.notifTime}>
                    {new Date(n.created_at).toLocaleString("pl-PL")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
