/**
 * GET /api/invite/validate?token=XXX
 * 
 * Validates an invite token and returns inviter info.
 * Used by the login page to check if a registration link is valid.
 */
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Rate limiting for token validation (prevent brute-force)
const validateRateLimitMap = new Map<string, number[]>();
const VALIDATE_RATE_WINDOW = 60_000; // 1 minute
const VALIDATE_RATE_MAX = 20; // max 20 attempts per minute

function checkValidateRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = (validateRateLimitMap.get(ip) || [])
    .filter(t => now - t < VALIDATE_RATE_WINDOW);
  
  if (timestamps.length >= VALIDATE_RATE_MAX) return false;
  timestamps.push(now);
  validateRateLimitMap.set(ip, timestamps);
  return true;
}

export async function GET(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  if (!checkValidateRateLimit(ip)) {
    return NextResponse.json(
      { valid: false, error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ valid: false, error: "Missing token" });
  }

  // Sanitize token — only allow alphanumeric
  if (!/^[A-Za-z0-9]+$/.test(token)) {
    return NextResponse.json({ valid: false, error: "Invalid token format" });
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
