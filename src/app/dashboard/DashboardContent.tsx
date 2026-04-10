"use client";

import Link from "next/link";
import styles from "./dashboard.module.css";

interface MatchPlayer {
  player_nick: string;
  side: number;
  score: number;
  is_winner: boolean;
  accuracy_pct: number;
  total_damage: number;
}

interface RecentMatch {
  id: string;
  map_name: string | null;
  player1_score: number;
  player2_score: number;
  screenshot_url: string | null;
  match_date: string;
  created_at: string;
  match_players: MatchPlayer[];
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
}

interface Props {
  stats: Stats;
  recentMatches: RecentMatch[];
  userName: string;
}

export default function DashboardContent({
  stats,
  recentMatches,
  userName,
}: Props) {
  const hasData = stats.totalMatches > 0;

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1>
          Welcome, <span className={styles.accent}>{userName}</span>
        </h1>
        <Link href="/dashboard/upload" className={styles.uploadBtn}>
          📸 Upload Screenshot
        </Link>
      </div>

      {/* ─── Stats Grid ─── */}
      <div className={styles.statsGrid}>
        <StatCard
          label="Matches Played"
          value={stats.totalMatches.toString()}
          icon="🎯"
        />
        <StatCard
          label="Win Rate"
          value={stats.winRate !== null ? `${stats.winRate}%` : "—"}
          sub={hasData ? `${stats.wins}W / ${stats.losses}L` : undefined}
          icon="🏆"
          accent={
            stats.winRate !== null
              ? stats.winRate >= 50
                ? "green"
                : "red"
              : undefined
          }
        />
        <StatCard
          label="Avg LG Accuracy"
          value={stats.avgLgAccuracy !== null ? `${stats.avgLgAccuracy}%` : "—"}
          icon="⚡"
          accent={
            stats.avgLgAccuracy !== null
              ? stats.avgLgAccuracy >= 40
                ? "green"
                : stats.avgLgAccuracy >= 25
                  ? "orange"
                  : "red"
              : undefined
          }
        />
        <StatCard
          label="Avg Rail Accuracy"
          value={
            stats.avgRailAccuracy !== null ? `${stats.avgRailAccuracy}%` : "—"
          }
          icon="🔫"
          accent={
            stats.avgRailAccuracy !== null
              ? stats.avgRailAccuracy >= 45
                ? "green"
                : stats.avgRailAccuracy >= 30
                  ? "orange"
                  : "red"
              : undefined
          }
        />
        <StatCard
          label="Avg Accuracy"
          value={stats.avgAccuracy !== null ? `${stats.avgAccuracy}%` : "—"}
          icon="🎯"
        />
        <StatCard
          label="Total Damage"
          value={
            hasData
              ? stats.totalDamage > 1000
                ? `${(stats.totalDamage / 1000).toFixed(1)}k`
                : stats.totalDamage.toString()
              : "—"
          }
          icon="💥"
        />
      </div>

      {/* ─── Recent Matches ─── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Recent Matches</h2>
          {hasData && (
            <Link href="/dashboard/history" className={styles.viewAll}>
              View All →
            </Link>
          )}
        </div>

        {!hasData ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📸</span>
            <h3>No matches yet</h3>
            <p>
              Upload your first QC ranking screenshot to start tracking your
              stats.
            </p>
            <Link href="/dashboard/upload" className={styles.ctaBtn}>
              ⚡ Upload First Screenshot
            </Link>
          </div>
        ) : (
          <div className={styles.matchList}>
            {recentMatches.map((match) => {
              const p1 = match.match_players.find(
                (mp) => mp.side === 1
              );
              const p2 = match.match_players.find(
                (mp) => mp.side === 2
              );
              const matchDate = new Date(match.match_date).toLocaleDateString(
                "pl-PL",
                { day: "2-digit", month: "short", year: "numeric" }
              );

              return (
                <div key={match.id} className={styles.matchRow}>
                  <div className={styles.matchDate}>{matchDate}</div>
                  <div className={styles.matchPlayers}>
                    <span
                      className={`${styles.playerName} ${p1?.is_winner ? styles.winner : styles.loser}`}
                    >
                      {p1?.player_nick || "?"}
                    </span>
                    <div className={styles.matchScore}>
                      <span
                        className={
                          match.player1_score > match.player2_score
                            ? styles.scoreWin
                            : styles.scoreLose
                        }
                      >
                        {match.player1_score}
                      </span>
                      <span className={styles.scoreSep}>:</span>
                      <span
                        className={
                          match.player2_score > match.player1_score
                            ? styles.scoreWin
                            : styles.scoreLose
                        }
                      >
                        {match.player2_score}
                      </span>
                    </div>
                    <span
                      className={`${styles.playerName} ${p2?.is_winner ? styles.winner : styles.loser}`}
                    >
                      {p2?.player_nick || "?"}
                    </span>
                  </div>
                  <div className={styles.matchMap}>
                    {match.map_name || "Unknown Map"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  accent?: "green" | "orange" | "red";
}) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statIcon}>{icon}</div>
      <div
        className={`${styles.statValue} ${accent ? styles[`stat${accent.charAt(0).toUpperCase() + accent.slice(1)}`] : ""}`}
      >
        {value}
      </div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}
