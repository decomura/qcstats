import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardContent from "./DashboardContent";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch user profile for display name
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, game_nickname")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name || profile?.username || user.email?.split("@")[0] || "Player";
  const gameNick = profile?.game_nickname || profile?.username || "";

  // Fetch ALL matches uploaded by user (to get match IDs)
  const { data: userMatchIds } = await supabase
    .from("matches")
    .select("id")
    .eq("uploaded_by", user.id);

  const matchIds = (userMatchIds || []).map(m => m.id);

  // Fetch player stats for those matches
  const { data: matchPlayers } = matchIds.length > 0
    ? await supabase
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
        .in("match_id", matchIds)
    : { data: [] };

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

  // Calculate aggregated stats — filter to only the USER's match_player rows
  const allPlayerData = matchPlayers || [];
  const playerData = gameNick
    ? allPlayerData.filter((mp) => mp.player_nick.toLowerCase() === gameNick.toLowerCase())
    : allPlayerData.filter((mp) => mp.side === 1); // fallback: side 1 = uploader
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
  // Weapon stats — only from the user's match_player rows
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

  // Build chart data: accuracy over time
  // We need match dates - fetch from recentMatches (ordered by date)
  const allMatchesForChart = recentMatches || [];
  const accuracyChartData = allMatchesForChart.map((m) => {
    type MatchPlayerRow = { player_nick: string; side: number; score: number; is_winner: boolean; accuracy_pct: number; total_damage: number };
    // Find OUR player row by game_nickname, fallback to side 1
    const myPlayer = gameNick
      ? m.match_players.find((mp: MatchPlayerRow) => mp.player_nick.toLowerCase() === gameNick.toLowerCase())
      : m.match_players.find((mp: MatchPlayerRow) => mp.side === 1);
    const date = new Date(m.match_date).toLocaleDateString("pl-PL", { day: "2-digit", month: "short" });
    return {
      date,
      accuracy: myPlayer?.accuracy_pct || 0,
      lgAccuracy: 0,
      railAccuracy: 0,
      damage: myPlayer?.total_damage || 0,
    };
  }).reverse();

  // Build weapon distribution data
  const weaponMap = new Map<string, { kills: number; damage: number }>();
  for (const w of allWeapons) {
    const existing = weaponMap.get(w.weapon_name) || { kills: 0, damage: 0 };
    existing.kills += w.kills;
    existing.damage += w.damage;
    weaponMap.set(w.weapon_name, existing);
  }
  const weaponChartData = Array.from(weaponMap.entries())
    .map(([weapon, data]) => ({ weapon, ...data }))
    .filter((w) => w.kills > 0 || w.damage > 0)
    .sort((a, b) => b.damage - a.damage);

  return (
    <DashboardContent
      stats={stats}
      recentMatches={recentMatches || []}
      userName={displayName}
      accuracyChartData={accuracyChartData}
      weaponChartData={weaponChartData}
    />
  );
}
