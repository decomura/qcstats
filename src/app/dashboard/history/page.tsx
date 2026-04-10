import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import HistoryContent from "./HistoryContent";

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch all matches for this user
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
    .eq("uploaded_by", user.id)
    .order("created_at", { ascending: false });

  return <HistoryContent matches={matches || []} />;
}
