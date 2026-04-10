import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SettingsContent from "./SettingsContent";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <SettingsContent
      profile={profile}
      email={user.email || ""}
    />
  );
}
