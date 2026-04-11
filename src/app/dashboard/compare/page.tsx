import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import CompareContent from "./CompareContent";

export const metadata: Metadata = {
  title: "Head-to-Head Compare | QCStats",
  description: "Compare your stats against specific opponents in Quake Champions duels.",
};

export default async function ComparePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch all unique opponents from match_players  
  const { data: userMatches } = await supabase
    .from("matches")
    .select(`
      id,
      match_players(player_nick, side, score, is_winner, accuracy_pct, total_damage, profile_id)
    `)
    .eq("uploaded_by", user.id)
    .order("created_at", { ascending: false });

  // Build opponent list
  type MatchPlayerRow = {
    player_nick: string;
    side: number;
    score: number;
    is_winner: boolean;
    accuracy_pct: number;
    total_damage: number;
    profile_id: string | null;
  };

  const opponentMap = new Map<string, {
    nick: string;
    matches: number;
    wins: number;
    losses: number;
    avgAccuracy: number;
    avgDamage: number;
    totalAccuracy: number;
    totalDamage: number;
  }>();

  for (const match of userMatches || []) {
    const players = match.match_players as MatchPlayerRow[];
    if (players.length < 2) continue;

    // Since we queried uploaded_by = user.id, the uploader is one of the players
    // Try profile_id first, then fallback to side=1 (uploader is usually P1)
    let me = players.find((p) => p.profile_id === user.id);
    let opponent: MatchPlayerRow | undefined;

    if (me) {
      opponent = players.find((p) => p !== me);
    } else {
      // Fallback: assume uploader's nick - just pick both sides
      me = players[0];
      opponent = players[1];
    }

    if (!me || !opponent) continue;

    const key = opponent.player_nick.toLowerCase();
    const existing = opponentMap.get(key) || {
      nick: opponent.player_nick,
      matches: 0,
      wins: 0,
      losses: 0,
      avgAccuracy: 0,
      avgDamage: 0,
      totalAccuracy: 0,
      totalDamage: 0,
    };

    existing.matches++;
    if (me.is_winner) existing.wins++;
    else existing.losses++;
    existing.totalAccuracy += me.accuracy_pct || 0;
    existing.totalDamage += me.total_damage || 0;
    existing.avgAccuracy = Math.round(existing.totalAccuracy / existing.matches);
    existing.avgDamage = Math.round(existing.totalDamage / existing.matches);

    opponentMap.set(key, existing);
  }

  const opponents = Array.from(opponentMap.values())
    .sort((a, b) => b.matches - a.matches);

  return <CompareContent opponents={opponents} />;
}
