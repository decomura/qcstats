import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import MatchDetailContent from "./MatchDetailContent";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MatchDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: match } = await supabase
    .from("matches")
    .select(`
      id,
      map_name,
      match_type,
      player1_score,
      player2_score,
      screenshot_url,
      screenshot_url_2,
      match_date,
      created_at,
      uploaded_by,
      match_players(
        id,
        player_nick,
        side,
        score,
        ping,
        total_damage,
        accuracy_pct,
        hits_shots,
        healing,
        mega_health_pickups,
        heavy_armor_pickups,
        light_armor_pickups,
        champion,
        is_winner,
        weapon_stats(
          weapon_index,
          weapon_name,
          hits_shots,
          accuracy_pct,
          damage,
          kills
        )
      )
    `)
    .eq("id", id)
    .single();

  if (!match) notFound();

  return <MatchDetailContent match={match} />;
}
