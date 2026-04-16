"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import styles from "./dashboard.module.css";

const StatsCharts = dynamic(() => import("@/components/charts/StatsCharts"), {
  ssr: false,
  loading: () => <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading charts...</div>,
});

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

interface AccuracyDataPoint {
  date: string;
  accuracy: number;
  lgAccuracy: number;
  railAccuracy: number;
  damage: number;
}

interface WeaponDistribution {
  weapon: string;
  kills: number;
  damage: number;
}

interface Props {
  stats: Stats;
  recentMatches: RecentMatch[];
  userName: string;
  accuracyChartData: AccuracyDataPoint[];
  weaponChartData: WeaponDistribution[];
}

export default function DashboardContent({
  stats,
  recentMatches,
  userName,
  accuracyChartData,
  weaponChartData,
}: Props) {
  const hasData = stats.totalMatches > 0;

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1>
          Witaj, <span className={styles.accent}>{userName}</span>
        </h1>
        <Link href="/dashboard/upload" className={styles.uploadBtn}>
          📸 Wrzuć Screenshot
        </Link>
      </div>

      {/* ─── Stats Grid ─── */}
      <div className={styles.statsGrid}>
        <StatCard
          label="Rozegrane mecze"
          value={stats.totalMatches.toString()}
          icon="🎯"
        />
        <StatCard
          label="Wygrane"
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
          label="Śr. celność LG"
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
          label="Śr. celność Rail"
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
          label="Śr. celność"
          value={stats.avgAccuracy !== null ? `${stats.avgAccuracy}%` : "—"}
          icon="🎯"
        />
        <StatCard
          label="Łączne obrażenia"
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
          <h2>Ostatnie mecze</h2>
          {hasData && (
            <Link href="/dashboard/history" className={styles.viewAll}>
              Pokaż wszystkie →
            </Link>
          )}
        </div>

        {!hasData ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🎮</span>
            <h3>Witaj na arenie, {userName}!</h3>
            <p>
              Wrzuć swój pierwszy screenshot z Duel, aby rozpocząć śledzenie statystyk.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}>
              <Link href="/dashboard/upload" className={styles.ctaBtn}>
                📸 Wrzuć Screenshot
              </Link>
              <Link href="/wall" className={styles.ctaBtnSecondary || styles.viewAll}>
                🏟️ Community Wall
              </Link>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
              💡 Tip: Zrób screenshot ekranu wyników Duel w Quake Champions i wrzuć go tutaj — AI rozpozna statystyki automatycznie!
            </p>
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
                <Link key={match.id} href={`/dashboard/match/${match.id}`} className={styles.matchRow} style={{ textDecoration: 'none', color: 'inherit' }}>
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
                    {match.map_name || "Nieznana mapa"}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Charts ─── */}
      {hasData && (
        <StatsCharts
          accuracyData={accuracyChartData}
          weaponData={weaponChartData}
        />
      )}
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
