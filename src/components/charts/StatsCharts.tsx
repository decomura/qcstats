"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import styles from "./charts.module.css";

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

interface ChartProps {
  accuracyData: AccuracyDataPoint[];
  weaponData: WeaponDistribution[];
}

const CHART_COLORS = {
  accuracy: "#FF6B00",
  lg: "#00CCFF",
  rail: "#CC0000",
  damage: "#00CC66",
  grid: "rgba(255, 255, 255, 0.05)",
  text: "rgba(255, 255, 255, 0.5)",
};

const tooltipStyle = {
  backgroundColor: "rgba(10, 10, 25, 0.95)",
  border: "1px solid rgba(255, 107, 0, 0.3)",
  borderRadius: "8px",
  color: "#E0E0E0",
  fontFamily: "var(--font-mono)",
  fontSize: "0.8rem",
};

export default function StatsCharts({ accuracyData, weaponData }: ChartProps) {
  if (accuracyData.length === 0) return null;

  return (
    <div className={styles.chartsContainer}>
      {/* ─── Accuracy Over Time ─── */}
      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>⚡ Trend celności</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={accuracyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis
              dataKey="date"
              stroke={CHART_COLORS.text}
              fontSize={11}
              fontFamily="var(--font-mono)"
            />
            <YAxis
              stroke={CHART_COLORS.text}
              fontSize={11}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              fontFamily="var(--font-mono)"
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend
              wrapperStyle={{ fontFamily: "var(--font-heading)", fontSize: "0.75rem" }}
            />
            <Line
              type="monotone"
              dataKey="accuracy"
              stroke={CHART_COLORS.accuracy}
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Ogólna"
            />
            <Line
              type="monotone"
              dataKey="lgAccuracy"
              stroke={CHART_COLORS.lg}
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Lightning Gun"
            />
            <Line
              type="monotone"
              dataKey="railAccuracy"
              stroke={CHART_COLORS.rail}
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Railgun"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ─── Weapon Kill Distribution ─── */}
      {weaponData.length > 0 && (
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>🔫 Zabicia bronią</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weaponData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis
                dataKey="weapon"
                stroke={CHART_COLORS.text}
                fontSize={10}
                fontFamily="var(--font-mono)"
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                stroke={CHART_COLORS.text}
                fontSize={11}
                fontFamily="var(--font-mono)"
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="kills" fill={CHART_COLORS.accuracy} radius={[4, 4, 0, 0]} name="Zabicia" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ─── Damage Distribution ─── */}
      {weaponData.length > 0 && (
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>💥 Obrażenia broni</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weaponData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis
                dataKey="weapon"
                stroke={CHART_COLORS.text}
                fontSize={10}
                fontFamily="var(--font-mono)"
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                stroke={CHART_COLORS.text}
                fontSize={11}
                fontFamily="var(--font-mono)"
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="damage" fill={CHART_COLORS.damage} radius={[4, 4, 0, 0]} name="Obrażenia" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
