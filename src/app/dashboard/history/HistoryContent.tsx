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
          📋 <span className={styles.accent}>Historia</span> Meczy
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
              📥 Eksportuj CSV
            </button>
          )}
          <Link href="/dashboard/upload" className={styles.uploadBtn}>
            📸 Nowy Upload
          </Link>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🏟️</span>
          <h3>Brak zarejestrowanych meczy</h3>
          <p>Wrzuć swój pierwszy screenshot z QC, aby rozpocząć śledzenie.</p>
          <Link href="/dashboard/upload" className={styles.ctaBtn}>
            ⚡ Wrzuć Screenshot
          </Link>
        </div>
      ) : (
        <>
          <div className={styles.matchCount}>
            {matches.length} {matches.length === 1 ? 'mecz' : matches.length < 5 ? 'mecze' : 'meczy'} zarejestrowanych
          </div>

          <div className={styles.matchTable}>
            <div className={styles.tableHeader}>
              <span>Data</span>
              <span>Gracz 1</span>
              <span>Wynik</span>
              <span>Gracz 2</span>
              <span>Mapa</span>
              <span>Cel%</span>
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
                <Link
                  key={match.id}
                  href={`/dashboard/match/${match.id}`}
                  className={styles.tableRow}
                  style={{ textDecoration: "none" }}
                >
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
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
