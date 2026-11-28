import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

/** Lands here from confirmation, sign-in-link and invite emails. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const rawNext = url.searchParams.get("next") ?? "/app";
  const next = /^\/(app|invite|auth\/mfa)(\/|\?|$)/.test(rawNext) ? rawNext : "/app";
  const supabase = await supabaseServer();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("missing code") };
  const dest = error ? "/login?error=link" : next.startsWith("/auth/mfa") ? next : `/auth/mfa?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(new URL(dest, url.origin));
}
