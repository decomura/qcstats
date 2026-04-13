/**
 * POST /api/invite
 * 
 * Called after a user registers via an invite link.
 * Processes invite_token OR legacy invite_code:
 * - Marks token as used
 * - Sets invited_by on new user's profile  
 * - Creates auto-friendship between inviter and new user
 * - Sends notifications to both
 * 
 * Body: { invite_token: string }
 */
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = body.invite_token || body.invite_code; // support both param names

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Missing invite token" }, { status: 400 });
    }

    // Get the authenticated user
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let inviterProfileId: string | null = null;
    let inviterName: string | null = null;

    // Try new invite_tokens table first
    const { data: tokenData } = await supabaseAdmin
      .from("invite_tokens")
      .select("id, inviter_id")
      .eq("token", token.toUpperCase())
      .is("used_by", null)
      .single();

    if (tokenData) {
      // Mark token as used
      await supabaseAdmin
        .from("invite_tokens")
        .update({
          used_by: user.id,
          used_at: new Date().toISOString(),
        })
        .eq("id", tokenData.id);

      inviterProfileId = tokenData.inviter_id;

      // Get inviter name
      const { data: inviterProfile } = await supabaseAdmin
        .from("profiles")
        .select("username, display_name")
        .eq("id", inviterProfileId)
        .single();

      inviterName = inviterProfile?.display_name || inviterProfile?.username || null;
    } else {
      // Fallback: legacy invite_code from profiles
      const { data: inviterProfile } = await supabaseAdmin
        .from("profiles")
        .select("id, username, display_name")
        .eq("invite_code", token.toUpperCase())
        .single();

      if (!inviterProfile) {
        return NextResponse.json({ error: "Invalid invite token" }, { status: 404 });
      }

      inviterProfileId = inviterProfile.id;
      inviterName = inviterProfile.display_name || inviterProfile.username;
    }

    // Don't friend yourself
    if (inviterProfileId === user.id) {
      return NextResponse.json({ message: "Self invite ignored", already: true });
    }

    // Set invited_by on the new user's profile
    await supabaseAdmin
      .from("profiles")
      .update({ invited_by: inviterProfileId })
      .eq("id", user.id)
      .is("invited_by", null); // only set if not already set

    // Check if already friends (table: friendships, columns: user_id, friend_id)
    const { data: existing } = await supabaseAdmin
      .from("friendships")
      .select("id")
      .or(
        `and(user_id.eq.${inviterProfileId},friend_id.eq.${user.id}),and(user_id.eq.${user.id},friend_id.eq.${inviterProfileId})`
      )
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ message: "Already friends", already: true });
    }

    // Create auto-accepted friendship
    const { error: friendError } = await supabaseAdmin.from("friendships").insert({
      user_id: inviterProfileId,
      friend_id: user.id,
      status: "accepted",
    });

    if (friendError) {
      console.error("Friend insert error:", friendError);
      return NextResponse.json({ error: "Failed to create friendship" }, { status: 500 });
    }

    // Notification for the inviter (columns: user_id, type, message, metadata)
    await supabaseAdmin.from("notifications").insert({
      user_id: inviterProfileId,
      type: "friend_joined",
      message: `🎮 Nowy gracz dołączył dzięki Twojemu zaproszeniu!`,
      metadata: { joined_user_id: user.id },
    });

    // Notification for the new user
    await supabaseAdmin.from("notifications").insert({
      user_id: user.id,
      type: "friend_accepted",
      message: `🤝 Witaj na arenie! Jesteś teraz znajomym ${inviterName}!`,
      metadata: { inviter_id: inviterProfileId },
    });

    // Decrement invite_count_remaining for inviter
    await supabaseAdmin.rpc("decrement_invite_count", { user_id: inviterProfileId });

    return NextResponse.json({
      success: true,
      inviter: inviterName,
    });
  } catch (err) {
    console.error("Invite accept error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
