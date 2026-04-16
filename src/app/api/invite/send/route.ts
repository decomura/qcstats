/**
 * Send Invite Email — Nodemailer + Gmail SMTP
 *
 * POST /api/invite/send
 * Body: { email: string, token: string, inviterName: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import nodemailer from "nodemailer";

// Rate Limiting: 5 invite emails per user per 10 minutes
const inviteRateLimitMap = new Map<string, number[]>();
const INVITE_RATE_WINDOW = 600_000; // 10 minutes
const INVITE_RATE_MAX = 5;

function checkInviteRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = (inviteRateLimitMap.get(userId) || [])
    .filter(t => now - t < INVITE_RATE_WINDOW);
  
  if (timestamps.length >= INVITE_RATE_MAX) return false;
  timestamps.push(now);
  inviteRateLimitMap.set(userId, timestamps);
  return true;
}

// Basic email format validation
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check
    if (!checkInviteRateLimit(user.id)) {
      return NextResponse.json(
        { error: "Zbyt wiele zaproszeń. Odczekaj 10 minut." },
        { status: 429 }
      );
    }

    const { email, token, inviterName } = await request.json();

    if (!email || !token) {
      return NextResponse.json(
        { error: "Email and token are required" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Nieprawidłowy format adresu email." },
        { status: 400 }
      );
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error("[Invite Email] Gmail SMTP not configured");
      return NextResponse.json(
        { error: "Email service not configured. Contact admin." },
        { status: 500 }
      );
    }

    // Sanitize inviterName to prevent XSS in email HTML
    const sanitize = (str: string) =>
      str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const safeInviterName = sanitize(inviterName || "Player");
    const safeToken = encodeURIComponent(token);

    const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://qcstats.vercel.app"}/login?invite=${safeToken}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"QCStats" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `${inviterName} invited you to QCStats! 🎮`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a14; color: #e0e0e0; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #cc0000, #ff6b00); padding: 32px 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 36px; font-weight: 900; color: white;">
              QC<span style="color: rgba(255,255,255,0.9);">STATS</span>
            </h1>
            <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">
              Quake Champions Stats Tracker
            </p>
          </div>

          <div style="padding: 32px 24px;">
            <h2 style="color: #ff6b00; margin: 0 0 16px; font-size: 22px;">
              You've been invited! 🏟️
            </h2>
            
            <p style="line-height: 1.6; margin: 0 0 16px; color: #b0b0b0;">
              <strong style="color: #ff6b00;">${safeInviterName}</strong> has invited you to join 
              <strong>QCStats</strong> — a Quake Champions stats tracking platform.
            </p>

            <p style="line-height: 1.6; margin: 0 0 24px; color: #b0b0b0;">
              Join a verified community of players. Track your accuracy, 
              damage output, and item control. Compare your stats against rivals.
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${inviteUrl}" 
                 style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #cc0000, #ff6b00); color: white; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; letter-spacing: 0.5px;">
                ⚡ Join the Arena
              </a>
            </div>

            <p style="font-size: 12px; color: #666; text-align: center; margin: 16px 0 0;">
              This link expires in 7 days. If the button doesn't work, copy this link:<br/>
              <a href="${inviteUrl}" style="color: #ff6b00; word-break: break-all;">${inviteUrl}</a>
            </p>
          </div>

          <div style="padding: 16px 24px; border-top: 1px solid #1a1a2e; text-align: center;">
            <p style="margin: 0; font-size: 11px; color: #555;">
              QCStats — Built with ♥ by the Quake community<br/>
              Not affiliated with Bethesda or id Software
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Invite Email] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
