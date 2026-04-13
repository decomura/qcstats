import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import FriendsContent from "./FriendsContent";

export const metadata: Metadata = {
  title: "Friends | QCStats",
  description: "Manage your QCStats friends list and send friend requests.",
};

export default async function FriendsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get user's invite info
  const { data: profile } = await supabase
    .from("profiles")
    .select("invite_count_remaining, display_name, role")
    .eq("id", user.id)
    .single();

  // Get friends (accepted)
  const { data: friendships } = await supabase
    .from("friends")
    .select(`
      id,
      status,
      requester_id,
      addressee_id,
      created_at,
      requester:profiles!friends_requester_id_fkey(id, username, display_name, avatar_url),
      addressee:profiles!friends_addressee_id_fkey(id, username, display_name, avatar_url)
    `)
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  // Get notifications
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <FriendsContent
      userId={user.id}
      inviteCountRemaining={profile?.invite_count_remaining ?? 3}
      displayName={profile?.display_name || "Gracz QCStats"}
      role={profile?.role || "user"}
      friendships={friendships || []}
      notifications={notifications || []}
    />
  );
}
