import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ProfileContent from "./ProfileContent";

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const supabase = await createClient();

  // Find profile by username
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, is_public, role, created_at")
    .ilike("username", username)
    .single();

  if (!profile || !profile.is_public) notFound();

  // Fetch their match stats
  const { data: matchPlayers } = await supabase
    .from("match_players")
    .select(`
      score,
      total_damage,
      accuracy_pct,
      is_winner,
      weapon_stats(weapon_name, accuracy_pct, damage, kills)
    `)
    .eq("profile_id", profile.id);

  // Fetch recent matches
  const { data: recentMatches } = await supabase
    .from("match_players")
    .select(`
      side,
      score,
      is_winner,
      accuracy_pct,
      total_damage,
      player_nick,
      match:matches!inner(
        id,
        map_name,
        player1_score,
        player2_score,
        match_date,
        match_players(player_nick, side, is_winner)
      )
    `)
    .eq("profile_id", profile.id)
    .order("created_at", { foreignTable: "matches", ascending: false })
    .limit(10);

  const playerData = matchPlayers || [];
  const totalMatches = playerData.length;
  const wins = playerData.filter((m) => m.is_winner).length;

  type WeaponRow = { weapon_name: string; accuracy_pct: number; damage: number; kills: number };
  const allWeapons = playerData.flatMap((m) => (m.weapon_stats as WeaponRow[]) || []);
  const lgStats = allWeapons.filter((w) => w.weapon_name === "Lightning Gun");
  const railStats = allWeapons.filter((w) => w.weapon_name === "Railgun");

  const stats = {
    totalMatches,
    wins,
    losses: totalMatches - wins,
    winRate: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : null,
    avgAccuracy: totalMatches > 0
      ? Math.round(playerData.reduce((s, m) => s + (m.accuracy_pct || 0), 0) / totalMatches)
      : null,
    avgLgAccuracy: lgStats.length > 0
      ? Math.round(lgStats.reduce((s, w) => s + w.accuracy_pct, 0) / lgStats.length)
      : null,
    avgRailAccuracy: railStats.length > 0
      ? Math.round(railStats.reduce((s, w) => s + w.accuracy_pct, 0) / railStats.length)
      : null,
    totalDamage: playerData.reduce((s, m) => s + (m.total_damage || 0), 0),
    memberSince: profile.created_at,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchData = (recentMatches || []).map((m: any) => ({
    ...m,
    match: Array.isArray(m.match) ? m.match[0] : m.match,
  }));

  return (
    <ProfileContent
      profile={profile}
      stats={stats}
      recentMatches={matchData}
    />
  );
}
