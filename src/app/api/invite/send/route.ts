/**
 * Send Invite Email — Resend API
 *
 * POST /api/invite/send
 * Body: { email: string, token: string, inviterName: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, token, inviterName } = await request.json();

    if (!email || !token) {
      return NextResponse.json(
        { error: "Email and token are required" },
        { status: 400 }
      );
    }

    const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://qcstats.vercel.app"}/login?invite=${token}`;

    if (!process.env.RESEND_API_KEY) {
      console.error("[Invite Email] RESEND_API_KEY not configured");
      return NextResponse.json(
        { error: "Email service not configured. Contact admin." },
        { status: 500 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from: "QCStats <onboarding@resend.dev>",
      to: email,
      subject: `${inviterName} zaprasza Cię do QCStats! 🎮`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a14; color: #e0e0e0; border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #cc0000, #ff6b00); padding: 32px 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 36px; font-weight: 900; color: white;">
              QC<span style="color: rgba(255,255,255,0.9);">STATS</span>
            </h1>
            <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">
              Quake Champions Stats Tracker
            </p>
          </div>

          <!-- Content -->
          <div style="padding: 32px 24px;">
            <h2 style="color: #ff6b00; margin: 0 0 16px; font-size: 22px;">
              Zostałeś zaproszony! 🏟️
            </h2>
            
            <p style="line-height: 1.6; margin: 0 0 16px; color: #b0b0b0;">
              <strong style="color: #ff6b00;">${inviterName}</strong> zaprasza Cię do 
              <strong>QCStats</strong> — platformy śledzenia statystyk Quake Champions.
            </p>

            <p style="line-height: 1.6; margin: 0 0 24px; color: #b0b0b0;">
              Dołącz do zweryfikowanej społeczności graczy. Śledź swoją celność, 
              damage i pickup-y. Porównuj się z rywalami.
            </p>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${inviteUrl}" 
                 style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #cc0000, #ff6b00); color: white; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; letter-spacing: 0.5px;">
                ⚡ Dołącz do areny
              </a>
            </div>

            <p style="font-size: 12px; color: #666; text-align: center; margin: 16px 0 0;">
              Link ważny przez 7 dni. Jeśli przycisk nie działa, skopiuj ten link:<br/>
              <a href="${inviteUrl}" style="color: #ff6b00; word-break: break-all;">${inviteUrl}</a>
            </p>
          </div>

          <!-- Footer -->
          <div style="padding: 16px 24px; border-top: 1px solid #1a1a2e; text-align: center;">
            <p style="margin: 0; font-size: 11px; color: #555;">
              QCStats — Built with ♥ by the Quake community<br/>
              Not affiliated with Bethesda or id Software
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("[Invite Email] Resend error:", error);
      return NextResponse.json(
        { error: `Błąd wysyłania: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Invite Email] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
