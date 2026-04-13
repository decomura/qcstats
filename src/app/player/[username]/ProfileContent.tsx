"use client";

import Link from "next/link";
import styles from "./profile.module.css";

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_public: boolean;
  role: string;
  created_at: string;
}

interface Stats {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number | null;
  avgAccuracy: number | null;
  avgLgAccuracy: number | null;
  avgRailAccuracy: number | null;
  totalDamage: number;
  memberSince: string;
}

interface MatchData {
  side: number;
  score: number;
  is_winner: boolean;
  accuracy_pct: number;
  total_damage: number;
  player_nick: string;
  match: {
    id: string;
    map_name: string | null;
    player1_score: number;
    player2_score: number;
    match_date: string;
    match_players: { player_nick: string; side: number; is_winner: boolean }[];
  };
}

interface Props {
  profile: Profile;
  stats: Stats;
  recentMatches: MatchData[];
}

export default function ProfileContent({ profile, stats, recentMatches }: Props) {
  const roleLabel = profile.role === "admin" ? "🛡️ Admin" : profile.role === "mod" ? "⚔️ Mod" : "🎮 Player";

  return (
    <div className={styles.page}>
      <Link href="/" className={styles.backLink}>← Back to QCStats</Link>

      {/* ─── Profile Header ─── */}
      <div className={styles.profileHeader}>
        <div className={styles.avatar}>
          {profile.display_name.charAt(0).toUpperCase()}
        </div>
        <div className={styles.profileInfo}>
          <h1>{profile.display_name}</h1>
          <div className={styles.profileMeta}>
            <span className={styles.username}>@{profile.username}</span>
            <span className={styles.role}>{roleLabel}</span>
            <span className={styles.since} suppressHydrationWarning>Member since {new Date(stats.memberSince).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
          </div>
        </div>
      </div>

      {/* ─── Stats Grid ─── */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.totalMatches}</div>
          <div className={styles.statLabel}>Matches</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statValue} ${(stats.winRate ?? 0) >= 50 ? styles.green : styles.red}`}>
            {stats.winRate !== null ? `${stats.winRate}%` : "—"}
          </div>
          <div className={styles.statLabel}>Win Rate</div>
          <div className={styles.statSub}>{stats.wins}W / {stats.losses}L</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.avgLgAccuracy !== null ? `${stats.avgLgAccuracy}%` : "—"}</div>
          <div className={styles.statLabel}>⚡ LG Accuracy</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.avgRailAccuracy !== null ? `${stats.avgRailAccuracy}%` : "—"}</div>
          <div className={styles.statLabel}>🔫 Rail Accuracy</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.avgAccuracy !== null ? `${stats.avgAccuracy}%` : "—"}</div>
          <div className={styles.statLabel}>Overall Accuracy</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>
            {stats.totalDamage > 1000 ? `${(stats.totalDamage / 1000).toFixed(1)}k` : stats.totalDamage}
          </div>
          <div className={styles.statLabel}>💥 Total Damage</div>
        </div>
      </div>

      {/* ─── Recent Matches ─── */}
      {recentMatches.length > 0 && (
        <div className={styles.section}>
          <h2>Recent Matches</h2>
          <div className={styles.matchList}>
            {recentMatches.map((m, i) => {
              const opponent = m.match.match_players.find((p) => p.side !== m.side);
              const date = new Date(m.match.match_date).toLocaleDateString("en-US", {
                day: "2-digit",
                month: "short",
              });

              return (
                <div key={i} className={styles.matchRow}>
                  <span className={styles.matchDate} suppressHydrationWarning>{date}</span>
                  <span className={`${styles.matchResult} ${m.is_winner ? styles.green : styles.red}`}>
                    {m.is_winner ? "WIN" : "LOSS"}
                  </span>
                  <span className={styles.matchScore}>
                    {m.match.player1_score}:{m.match.player2_score}
                  </span>
                  <span className={styles.matchOpp}>vs {opponent?.player_nick || "?"}</span>
                  <span className={styles.matchMap}>{m.match.map_name || "—"}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
