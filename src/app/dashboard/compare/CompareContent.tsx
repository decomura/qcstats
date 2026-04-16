"use client";

import Link from "next/link";
import styles from "./compare.module.css";

interface Opponent {
  nick: string;
  matches: number;
  wins: number;
  losses: number;
  avgAccuracy: number;
  avgDamage: number;
}

export default function CompareContent({ opponents }: { opponents: Opponent[] }) {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>
          ⚔️ <span className={styles.accent}>Porównanie</span> 1 na 1
        </h1>
      </div>

      {opponents.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>⚔️</span>
          <h3>Brak przeciwników</h3>
          <p>Wrzuć screenshoty z meczy, aby budować bazę rywalizacji.</p>
          <Link href="/dashboard/upload" className={styles.ctaBtn}>
            ⚡ Wrzuć Screenshot
          </Link>
        </div>
      ) : (
        <div className={styles.opponentList}>
          <div className={styles.listHeader}>
            <span>Przeciwnik</span>
            <span>Mecze</span>
            <span>Bilans</span>
            <span>Wygr. %</span>
            <span>Cel %</span>
            <span>Śr. Dmg</span>
          </div>

          {opponents.map((opp) => {
            const winPct = Math.round((opp.wins / opp.matches) * 100);
            return (
              <div key={opp.nick} className={styles.opponentRow}>
                <span className={styles.oppNick}>{opp.nick}</span>
                <span className={styles.oppStat}>{opp.matches}</span>
                <span className={styles.oppRecord}>
                  <span className={styles.wins}>{opp.wins}W</span>
                  {" / "}
                  <span className={styles.losses}>{opp.losses}L</span>
                </span>
                <span className={`${styles.oppStat} ${winPct >= 50 ? styles.winPctGood : styles.winPctBad}`}>
                  {winPct}%
                </span>
                <span className={styles.oppStat}>{opp.avgAccuracy}%</span>
                <span className={styles.oppStat}>{opp.avgDamage.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
