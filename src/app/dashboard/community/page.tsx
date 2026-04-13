import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CommunityTreeContent from "./CommunityTreeContent";

export const metadata = {
  title: "QCStats – Drzewko Społeczności",
  description: "Wizualizacja kto kogo zaprosił do QCStats",
};

export default async function CommunityTreePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch all profiles with invite relationships
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, game_nickname, invited_by, role, created_at")
    .order("created_at", { ascending: true });

  return <CommunityTreeContent profiles={profiles || []} currentUserId={user.id} />;
}
