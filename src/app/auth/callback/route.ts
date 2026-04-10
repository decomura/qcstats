import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const invite = searchParams.get("invite");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      // Build redirect URL
      let redirectBase: string;
      if (isLocalEnv) {
        redirectBase = origin;
      } else if (forwardedHost) {
        redirectBase = `https://${forwardedHost}`;
      } else {
        redirectBase = origin;
      }

      // If there's an invite code, pass it to the dashboard
      // The dashboard will process it client-side
      const redirectUrl = invite
        ? `${redirectBase}${next}?invite=${invite}`
        : `${redirectBase}${next}`;

      return NextResponse.redirect(redirectUrl);
    }
  }

  // Return the user to an error page with some instructions
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
