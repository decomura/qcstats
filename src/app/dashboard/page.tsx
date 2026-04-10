import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardContent from "./DashboardContent";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch user stats from DB
  const { data: matchPlayers } = await supabase
    .from("match_players")
    .select(`
      score,
      total_damage,
      accuracy_pct,
      is_winner,
      healing,
      mega_health_pickups,
      heavy_armor_pickups,
      match_id,
      player_nick,
      side,
      weapon_stats(weapon_name, accuracy_pct, damage, kills)
    `)
    .eq("profile_id", user.id);

  // Fetch recent matches
  const { data: recentMatches } = await supabase
    .from("matches")
    .select(`
      id,
      map_name,
      player1_score,
      player2_score,
      screenshot_url,
      match_date,
      created_at,
      match_players(player_nick, side, score, is_winner, accuracy_pct, total_damage)
    `)
    .eq("uploaded_by", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Calculate aggregated stats
  const playerData = matchPlayers || [];
  const totalMatches = playerData.length;
  const wins = playerData.filter((m) => m.is_winner).length;
  const avgAccuracy =
    totalMatches > 0
      ? Math.round(
          playerData.reduce((sum, m) => sum + (m.accuracy_pct || 0), 0) /
            totalMatches
        )
      : 0;

  // Weapon-specific stats
  type WeaponRow = { weapon_name: string; accuracy_pct: number; damage: number; kills: number };
  const allWeapons = playerData.flatMap(
    (m) => (m.weapon_stats as WeaponRow[]) || []
  );

  const lgStats = allWeapons.filter((w) => w.weapon_name === "Lightning Gun");
  const avgLgAccuracy =
    lgStats.length > 0
      ? Math.round(
          lgStats.reduce((sum, w) => sum + w.accuracy_pct, 0) / lgStats.length
        )
      : null;

  const railStats = allWeapons.filter((w) => w.weapon_name === "Railgun");
  const avgRailAccuracy =
    railStats.length > 0
      ? Math.round(
          railStats.reduce((sum, w) => sum + w.accuracy_pct, 0) /
            railStats.length
        )
      : null;

  const stats = {
    totalMatches,
    wins,
    losses: totalMatches - wins,
    winRate: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : null,
    avgAccuracy: avgAccuracy || null,
    avgLgAccuracy,
    avgRailAccuracy,
    totalDamage: playerData.reduce((sum, m) => sum + (m.total_damage || 0), 0),
  };

  return (
    <DashboardContent
      stats={stats}
      recentMatches={recentMatches || []}
      userName={user.user_metadata?.preferred_username || user.email?.split("@")[0] || "Player"}
    />
  );
}
