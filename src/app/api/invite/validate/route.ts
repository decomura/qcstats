/**
 * GET /api/invite/validate?token=XXX
 * 
 * Validates an invite token and returns inviter info.
 * Used by the login page to check if a registration link is valid.
 */
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ valid: false, error: "Missing token" });
  }

  try {
    // Check invite_tokens table first (new system)
    const { data: tokenData } = await supabaseAdmin
      .from("invite_tokens")
      .select("*, inviter:profiles!invite_tokens_inviter_id_fkey(username, display_name)")
      .eq("token", token.toUpperCase())
      .is("used_by", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (tokenData) {
      const inviter = tokenData.inviter as { username: string; display_name: string | null } | null;
      return NextResponse.json({
        valid: true,
        inviterName: inviter?.display_name || inviter?.username || "Gracz QCStats",
        type: "token",
      });
    }

    // Fallback: check old invite_code system (profiles.invite_code)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name")
      .eq("invite_code", token.toUpperCase())
      .single();

    if (profile) {
      return NextResponse.json({
        valid: true,
        inviterName: profile.display_name || profile.username,
        type: "legacy",
      });
    }

    return NextResponse.json({ valid: false, error: "Invalid or expired token" });
  } catch (err) {
    console.error("Token validation error:", err);
    return NextResponse.json({ valid: false, error: "Validation failed" });
  }
}
