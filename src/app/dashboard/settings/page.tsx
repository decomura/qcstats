import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import SettingsContent from "./SettingsContent";

export const metadata: Metadata = {
  title: "Settings | QCStats",
  description: "Manage your QCStats profile and account settings.",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, game_nickname, game_nickname_changed_at, game_nickname_history")
    .eq("id", user.id)
    .single();

  return (
    <SettingsContent
      profile={profile}
      email={user.email || ""}
    />
  );
}
