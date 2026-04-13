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
    .from("friendships")
    .select(`
      id,
      status,
      user_id,
      friend_id,
      created_at,
      user:profiles!friendships_user_id_fkey(id, username, display_name, avatar_url),
      friend:profiles!friendships_friend_id_fkey(id, username, display_name, avatar_url)
    `)
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
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
