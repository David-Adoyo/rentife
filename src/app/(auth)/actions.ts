"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { safeNext, siteUrl } from "@/lib/app/safe-next";
import type { ActionResult } from "@/components/app/ActionForm";

const emailOk = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

export async function signUp(_: ActionResult, form: FormData): Promise<ActionResult> {
  const fullName = String(form.get("full_name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = safeNext(form.get("next"));
  if (fullName.length < 2) return { error: "Please enter your name." };
  if (!emailOk(email)) return { error: "Enter a valid email address." };
  if (password.length < 12) return { error: "Use at least 12 characters for your password." };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName }, emailRedirectTo: `${siteUrl()}/auth/confirm?next=${encodeURIComponent(next)}` },
  });
  if (error) return { error: error.message.includes("Password") ? "Use a stronger password: mix upper and lower case letters and numbers." : error.message };
  // Supabase deliberately gives the same answer for new and existing emails.
  return { ok: true, message: `Check ${email} for a link to confirm your account.` };
}

export async function signIn(_: ActionResult, form: FormData): Promise<ActionResult> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message === "Email not confirmed" ? "Confirm your email first: check your inbox for our link." : "That email and password don’t match." };
  redirect(`/auth/mfa?next=${encodeURIComponent(safeNext(form.get("next")))}`);
}

export async function sendMagicLink(_: ActionResult, form: FormData): Promise<ActionResult> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!emailOk(email)) return { error: "Enter a valid email address." };
  const next = safeNext(form.get("next"));
  const supabase = await supabaseServer();
  await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${siteUrl()}/auth/confirm?next=${encodeURIComponent(`/auth/mfa?next=${next}`)}` },
  });
  // Same reply whether or not an account exists.
  return { ok: true, message: `If ${email} has a Rentife account, a sign-in link is on its way.` };
}

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Accepting is a deliberate click: email scanners that open links can't accept for someone. */
export async function acceptInvite(_: ActionResult, form: FormData): Promise<ActionResult> {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { data: orgId, error } = await supabase.rpc("accept_invitation", { p_token: String(form.get("token") ?? "") });
  if (error) {
    return { error: error.message.includes("different email")
      ? `This invitation was sent to a different address than ${auth.user.email}. Sign in with the invited address.`
      : "This invitation has expired or was already used. Ask for a new one." };
  }
  (await cookies()).set("rentife_org", orgId as string, { path: "/", httpOnly: true, sameSite: "lax", secure: true, maxAge: 60 * 60 * 24 * 365 });
  redirect("/auth/mfa?next=/app");
}
