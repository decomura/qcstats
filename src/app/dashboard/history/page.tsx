import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import HistoryContent from "./HistoryContent";

export const metadata: Metadata = {
  title: "Match History | QCStats",
  description: "Browse all your recorded Quake Champions duel matches.",
};

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get user's game nickname for matching
  const { data: profile } = await supabase
    .from("profiles")
    .select("game_nickname, username")
    .eq("id", user.id)
    .single();

  const gameNick = profile?.game_nickname || profile?.username || "";

  // Fetch matches where user is a player (by profile_id link OR by nickname)
  // Step 1: Get match IDs where user appears in match_players
  const { data: playerMatches } = await supabase
    .from("match_players")
    .select("match_id")
    .or(`profile_id.eq.${user.id}${gameNick ? `,player_nick.ilike.${gameNick}` : ""}`);

  // Step 2: Also get matches uploaded by user (fallback)
  const { data: uploadedMatches } = await supabase
    .from("matches")
    .select("id")
    .eq("uploaded_by", user.id);

  // Combine unique match IDs
  const matchIds = new Set<string>();
  playerMatches?.forEach(pm => matchIds.add(pm.match_id));
  uploadedMatches?.forEach(m => matchIds.add(m.id));

  if (matchIds.size === 0) {
    return <HistoryContent matches={[]} />;
  }

  // Fetch full match data for all found IDs
  const { data: matches } = await supabase
    .from("matches")
    .select(`
      id,
      map_name,
      player1_score,
      player2_score,
      screenshot_url,
      match_date,
      created_at,
      uploaded_by,
      match_players(
        player_nick,
        side,
        score,
        is_winner,
        accuracy_pct,
        total_damage,
        hits_shots,
        healing,
        mega_health_pickups,
        heavy_armor_pickups,
        light_armor_pickups,
        champion
      )
    `)
    .in("id", Array.from(matchIds))
    .order("created_at", { ascending: false });

  return <HistoryContent matches={matches || []} />;
}
