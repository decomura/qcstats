"use client";

import Link from "next/link";
import styles from "./matchDetail.module.css";

interface WeaponStat {
  weapon_index: number;
  weapon_name: string;
  hits_shots: string | null;
  accuracy_pct: number;
  damage: number;
  kills: number;
}

interface MatchPlayer {
  id: string;
  player_nick: string;
  side: number;
  score: number;
  ping: number;
  total_damage: number;
  accuracy_pct: number;
  hits_shots: string | null;
  healing: number;
  mega_health_pickups: number;
  heavy_armor_pickups: number;
  light_armor_pickups: number;
  champion: string | null;
  is_winner: boolean;
  weapon_stats: WeaponStat[];
}

interface Match {
  id: string;
  map_name: string | null;
  match_type: string;
  player1_score: number;
  player2_score: number;
  screenshot_url: string | null;
  screenshot_url_2: string | null;
  match_date: string;
  created_at: string;
  uploaded_by: string;
  is_public: boolean;
  match_players: MatchPlayer[];
}

export default function MatchDetailContent({ match }: { match: Match }) {
  const p1 = match.match_players.find((mp) => mp.side === 1);
  const p2 = match.match_players.find((mp) => mp.side === 2);
  const matchDate = new Date(match.match_date).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link href="/dashboard">Dashboard</Link>
        <span>/</span>
        <Link href="/dashboard/history">Historia</Link>
        <span>/</span>
        <span className={styles.current}>Szczegóły meczu</span>
        {match.is_public && (
          <Link 
            href={`/wall#match-${match.id}`}
            className={styles.wallLink}
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.3rem 0.8rem",
              borderRadius: "6px",
              background: "rgba(255,107,0,0.15)",
              color: "#ff6b00",
              border: "1px solid rgba(255,107,0,0.3)",
              fontSize: "0.85rem",
              fontWeight: 600,
              textDecoration: "none",
              transition: "all 0.2s",
            }}
          >
            🏟️ Zobacz na Wall
          </Link>
        )}
      </div>

      {/* ─── Score Header ─── */}
      <div className={styles.scoreHeader}>
        <div className={styles.playerSide}>
          <div className={`${styles.playerName} ${p1?.is_winner ? styles.winner : styles.loser}`}>
            {p1?.player_nick || "Gracz 1"}
          </div>
          {p1?.champion && <div className={styles.champion}>{p1.champion}</div>}
        </div>

        <div className={styles.scoreCenter}>
          <div className={styles.scores}>
            <span className={match.player1_score > match.player2_score ? styles.scoreWin : styles.scoreLose}>
              {match.player1_score}
            </span>
            <span className={styles.scoreSep}>:</span>
            <span className={match.player2_score > match.player1_score ? styles.scoreWin : styles.scoreLose}>
              {match.player2_score}
            </span>
          </div>
          <div className={styles.matchMeta}>
            {match.map_name && <span className={styles.mapName}>{match.map_name}</span>}
            <span className={styles.matchDate}>{matchDate}</span>
          </div>
        </div>

        <div className={styles.playerSide}>
          <div className={`${styles.playerName} ${p2?.is_winner ? styles.winner : styles.loser}`}>
            {p2?.player_nick || "Gracz 2"}
          </div>
          {p2?.champion && <div className={styles.champion}>{p2.champion}</div>}
        </div>
      </div>

      {/* ─── Screenshot ─── */}
      {match.screenshot_url && (
        <div className={styles.screenshotSection}>
          <img src={match.screenshot_url} alt="Match screenshot" className={styles.screenshot} />
        </div>
      )}

      {/* ─── Stats Comparison ─── */}
      <div className={styles.statsComparison}>
        <h3>📊 Porównanie statystyk</h3>
        <div className={styles.comparisonGrid}>
          <ComparisonRow label="Obrażenia" v1={p1?.total_damage || 0} v2={p2?.total_damage || 0} format="number" />
          <ComparisonRow label="Celność" v1={p1?.accuracy_pct || 0} v2={p2?.accuracy_pct || 0} format="percent" />
          <ComparisonRow label="Trafienia/Strzały" v1={p1?.hits_shots || "—"} v2={p2?.hits_shots || "—"} format="text" />
          <ComparisonRow label="Leczenie" v1={p1?.healing || 0} v2={p2?.healing || 0} format="number" />
          <ComparisonRow label="Mega HP" v1={p1?.mega_health_pickups || 0} v2={p2?.mega_health_pickups || 0} format="number" />
          <ComparisonRow label="Heavy Armor" v1={p1?.heavy_armor_pickups || 0} v2={p2?.heavy_armor_pickups || 0} format="number" />
          <ComparisonRow label="Light Armor" v1={p1?.light_armor_pickups || 0} v2={p2?.light_armor_pickups || 0} format="number" />
          <ComparisonRow label="Ping" v1={p1?.ping || 0} v2={p2?.ping || 0} format="number" invert />
        </div>
      </div>

      {/* ─── Weapons Side-by-Side ─── */}
      <div className={styles.weaponsSection}>
        <h3>🔫 Statystyki broni</h3>
        <div className={styles.weaponsGrid}>
          <div className={styles.weaponTable}>
            <div className={styles.weaponTableHeader}>
              <span>{p1?.player_nick}</span>
            </div>
            <WeaponTable weapons={p1?.weapon_stats || []} />
          </div>

          <div className={styles.weaponTable}>
            <div className={styles.weaponTableHeader}>
              <span>{p2?.player_nick}</span>
            </div>
            <WeaponTable weapons={p2?.weapon_stats || []} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ComparisonRow({
  label,
  v1,
  v2,
  format,
  invert = false,
}: {
  label: string;
  v1: number | string;
  v2: number | string;
  format: "number" | "percent" | "text";
  invert?: boolean;
}) {
  const n1 = typeof v1 === "number" ? v1 : 0;
  const n2 = typeof v2 === "number" ? v2 : 0;
  const better1 = invert ? n1 < n2 : n1 > n2;
  const better2 = invert ? n2 < n1 : n2 > n1;

  const formatVal = (v: number | string) => {
    if (format === "percent") return `${v}%`;
    if (format === "number" && typeof v === "number") return v.toLocaleString();
    return String(v);
  };

  // Bar width calculation
  const total = n1 + n2;
  const pct1 = total > 0 ? (n1 / total) * 100 : 50;

  return (
    <div className={styles.compRow}>
      <div className={`${styles.compValue} ${better1 ? styles.compBetter : ""}`}>
        {formatVal(v1)}
      </div>
      <div className={styles.compCenter}>
        <div className={styles.compLabel}>{label}</div>
        {format !== "text" && (
          <div className={styles.compBar}>
            <div className={`${styles.compBarFill} ${styles.compBarLeft}`} style={{ width: `${pct1}%` }} />
          </div>
        )}
      </div>
      <div className={`${styles.compValue} ${better2 ? styles.compBetter : ""}`}>
        {formatVal(v2)}
      </div>
    </div>
  );
}

function WeaponTable({ weapons }: { weapons: WeaponStat[] }) {
  const sorted = [...weapons].sort((a, b) => a.weapon_index - b.weapon_index);

  return (
    <div className={styles.wTable}>
      <div className={styles.wRow + " " + styles.wHeader}>
        <span>Broń</span>
        <span>H/S</span>
        <span>Acc</span>
        <span>Dmg</span>
        <span>K</span>
      </div>
      {sorted.map((w) => (
        <div key={w.weapon_index} className={styles.wRow}>
          <span className={styles.wName}>{w.weapon_name}</span>
          <span className={styles.wStat}>{w.hits_shots || "—"}</span>
          <span className={styles.wStat}>{w.accuracy_pct > 0 ? `${w.accuracy_pct}%` : "—"}</span>
          <span className={styles.wStat}>{w.damage || "—"}</span>
          <span className={styles.wStat}>{w.kills || "—"}</span>
        </div>
      ))}
    </div>
  );
}
