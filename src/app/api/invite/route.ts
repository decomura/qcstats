/**
 * POST /api/invite/accept
 * 
 * Called after a user registers via an invite link.
 * Creates an auto-friendship between the inviter and the new user.
 * Body: { invite_code: string }
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
    const { invite_code } = await request.json();

    if (!invite_code || typeof invite_code !== "string") {
      return NextResponse.json({ error: "Missing invite_code" }, { status: 400 });
    }

    // Get the authenticated user
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Find the inviter by invite_code
    const { data: inviterProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name")
      .eq("invite_code", invite_code.toUpperCase())
      .single();

    if (!inviterProfile) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
    }

    // Don't friend yourself
    if (inviterProfile.id === user.id) {
      return NextResponse.json({ error: "Cannot invite yourself" }, { status: 400 });
    }

    // Check if already friends
    const { data: existing } = await supabaseAdmin
      .from("friends")
      .select("id")
      .or(
        `and(requester_id.eq.${inviterProfile.id},addressee_id.eq.${user.id}),and(requester_id.eq.${user.id},addressee_id.eq.${inviterProfile.id})`
      )
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ message: "Already friends", already: true });
    }

    // Create auto-accepted friendship
    const { error: friendError } = await supabaseAdmin.from("friends").insert({
      requester_id: inviterProfile.id,
      addressee_id: user.id,
      status: "accepted",
    });

    if (friendError) {
      console.error("Friend insert error:", friendError);
      return NextResponse.json({ error: "Failed to create friendship" }, { status: 500 });
    }

    // Create notification for the inviter
    await supabaseAdmin.from("notifications").insert({
      user_id: inviterProfile.id,
      type: "friend_joined",
      title: "🎮 New friend joined!",
      body: `Someone joined QCStats using your invite link and is now your friend!`,
      data: { joined_user_id: user.id },
    });

    // Create notification for the new user
    await supabaseAdmin.from("notifications").insert({
      user_id: user.id,
      type: "friend_accepted",
      title: "🤝 Welcome, Fragger!",
      body: `You are now friends with ${inviterProfile.display_name || inviterProfile.username}!`,
      data: { inviter_id: inviterProfile.id },
    });

    return NextResponse.json({
      success: true,
      inviter: inviterProfile.username,
    });
  } catch (err) {
    console.error("Invite accept error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
