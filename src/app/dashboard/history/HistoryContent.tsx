"use client";

import Link from "next/link";
import { generateCSV, downloadCSV } from "@/lib/utils/export";
import styles from "./history.module.css";

interface MatchPlayer {
  player_nick: string;
  side: number;
  score: number;
  is_winner: boolean;
  accuracy_pct: number;
  total_damage: number;
  hits_shots: string | null;
  healing: number;
  mega_health_pickups: number;
  heavy_armor_pickups: number;
  light_armor_pickups: number;
  champion: string | null;
}

interface Match {
  id: string;
  map_name: string | null;
  player1_score: number;
  player2_score: number;
  screenshot_url: string | null;
  match_date: string;
  created_at: string;
  match_players: MatchPlayer[];
}

interface Props {
  matches: Match[];
}

export default function HistoryContent({ matches }: Props) {
  return (
    <div className={styles.historyPage}>
      <div className={styles.header}>
        <h1>
          📋 <span className={styles.accent}>Match</span> History
        </h1>
        <div className={styles.headerActions}>
          {matches.length > 0 && (
            <button
              className={styles.exportBtn}
              onClick={() => {
                const csv = generateCSV(
                  matches.map((m) => {
                    const p1 = m.match_players.find((mp) => mp.side === 1);
                    const p2 = m.match_players.find((mp) => mp.side === 2);
                    return {
                      date: new Date(m.match_date).toLocaleDateString("pl-PL"),
                      player1: p1?.player_nick || "?",
                      player2: p2?.player_nick || "?",
                      score: `${m.player1_score}-${m.player2_score}`,
                      map: m.map_name || "Unknown",
                      p1Accuracy: p1?.accuracy_pct || 0,
                      p2Accuracy: p2?.accuracy_pct || 0,
                      p1Damage: p1?.total_damage || 0,
                      p2Damage: p2?.total_damage || 0,
                      winner: m.player1_score > m.player2_score ? (p1?.player_nick || "?") : (p2?.player_nick || "?"),
                    };
                  })
                );
                downloadCSV(csv);
              }}
            >
              📥 Export CSV
            </button>
          )}
          <Link href="/dashboard/upload" className={styles.uploadBtn}>
            📸 Upload New
          </Link>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🏟️</span>
          <h3>No matches recorded yet</h3>
          <p>Upload your first QC ranking screenshot to begin tracking.</p>
          <Link href="/dashboard/upload" className={styles.ctaBtn}>
            ⚡ Upload Screenshot
          </Link>
        </div>
      ) : (
        <>
          <div className={styles.matchCount}>
            {matches.length} match{matches.length !== 1 ? "es" : ""} recorded
          </div>

          <div className={styles.matchTable}>
            <div className={styles.tableHeader}>
              <span>Date</span>
              <span>Player 1</span>
              <span>Score</span>
              <span>Player 2</span>
              <span>Map</span>
              <span>Acc%</span>
              <span>Dmg</span>
            </div>

            {matches.map((match) => {
              const p1 = match.match_players.find((mp) => mp.side === 1);
              const p2 = match.match_players.find((mp) => mp.side === 2);
              const matchDate = new Date(match.match_date).toLocaleDateString(
                "pl-PL",
                { day: "2-digit", month: "short" }
              );

              return (
                <div key={match.id} className={styles.tableRow}>
                  <span className={styles.date}>{matchDate}</span>
                  <span
                    className={`${styles.player} ${p1?.is_winner ? styles.winner : styles.loser}`}
                  >
                    {p1?.player_nick || "—"}
                  </span>
                  <span className={styles.score}>
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
                  </span>
                  <span
                    className={`${styles.player} ${p2?.is_winner ? styles.winner : styles.loser}`}
                  >
                    {p2?.player_nick || "—"}
                  </span>
                  <span className={styles.map}>
                    {match.map_name || "—"}
                  </span>
                  <span className={styles.stat}>
                    {p1?.accuracy_pct || 0}% / {p2?.accuracy_pct || 0}%
                  </span>
                  <span className={styles.stat}>
                    {p1?.total_damage || 0} / {p2?.total_damage || 0}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
