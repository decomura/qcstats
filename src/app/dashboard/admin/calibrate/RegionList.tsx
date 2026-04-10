"use client";

import type { RegionDef } from "./RegionCanvas";
import styles from "./calibrate.module.css";

interface Props {
  regions: RegionDef[];
  selectedRegion: string | null;
  onSelectRegion: (name: string | null) => void;
}

const GROUP_ORDER = ["nicks", "summary_p1", "summary_p2", "weapons_p1", "weapons_p2", "items"];
const GROUP_LABELS: Record<string, string> = {
  nicks: "🎮 Nicki & Score",
  summary_p1: "📊 Summary P1",
  summary_p2: "📊 Summary P2",
  weapons_p1: "🔫 Broń P1",
  weapons_p2: "🔫 Broń P2",
  items: "🛡️ Przedmioty",
};

export default function RegionList({ regions, selectedRegion, onSelectRegion }: Props) {
  // Group regions
  const groups: Record<string, RegionDef[]> = {};
  for (const r of regions) {
    if (!groups[r.group]) groups[r.group] = [];
    groups[r.group].push(r);
  }

  return (
    <div className={styles.regionPanel}>
      <div className={styles.regionPanelHeader}>📋 Regiony ({regions.length})</div>
      <div className={styles.regionList}>
        {GROUP_ORDER.filter((g) => groups[g]).map((groupKey) => (
          <div key={groupKey} className={styles.regionGroup}>
            <div className={styles.regionGroupTitle}>
              {GROUP_LABELS[groupKey] || groupKey}
            </div>
            {groups[groupKey].map((r) => (
              <div
                key={r.name}
                className={
                  selectedRegion === r.name
                    ? styles.regionItemActive
                    : styles.regionItem
                }
                onClick={() =>
                  onSelectRegion(selectedRegion === r.name ? null : r.name)
                }
              >
                <span
                  className={styles.regionColor}
                  style={{ background: r.color.replace("0.3)", "0.8)") }}
                />
                <span className={styles.regionName}>{r.name}</span>
                <span className={styles.regionCoords}>
                  {r.box.x},{r.box.y} {r.box.width}×{r.box.height}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
