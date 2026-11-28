"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { appContext } from "@/lib/app/context";
import { TONES, type Tone } from "@/lib/messages";
import type { ActionResult } from "@/components/app/ActionForm";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

async function advance(step: number, done = false) {
  const { supabase, org } = await appContext();
  await supabase.rpc("set_onboarding_step", { p_org: org.id, p_step: step, p_done: done });
  revalidatePath("/app", "layout");
}

export async function goToStep(f: FormData) {
  const step = Math.min(7, Math.max(2, Number(str(f, "step")) || 2));
  await advance(step);
  redirect(`/app/onboarding?step=${step}`);
}

export async function savePayment(_: ActionResult, f: FormData): Promise<ActionResult> {
  const { supabase, org, role } = await appContext();
  if (role !== "owner") return { error: "Only the owner can set how tenants pay." };
  const method = str(f, "method");
  if (!["mpesa_paybill", "mpesa_till", "bank_paybill", "none_yet"].includes(method)) return { error: "Choose how your tenants pay." };
  const shortcode = str(f, "shortcode").replace(/\s/g, "");
  if (method !== "none_yet" && !/^\d{5,7}$/.test(shortcode)) return { error: method === "mpesa_till" ? "A Till number has 5 to 7 digits." : "A Paybill number has 5 to 7 digits." };
  const { error } = await supabase.from("payment_settings").upsert({
    org_id: org.id, method, shortcode: method === "none_yet" ? null : shortcode,
    bank_name: method === "bank_paybill" ? str(f, "bank_name") : "",
    bank_account_hint: method === "bank_paybill" ? str(f, "bank_account_hint").slice(0, 40) : "",
  });
  if (error) return { error: "Couldn’t save that. Check the number and try again." };
  await advance(5);
  redirect("/app/onboarding?step=5");
}

export async function saveReminders(_: ActionResult, f: FormData): Promise<ActionResult> {
  const { supabase, org, can } = await appContext();
  if (!can.edit) return { error: "Only owners and managers can set reminders." };
  const tone = str(f, "tone") as Tone;
  if (!(tone in TONES)) return { error: "Choose a reminder style." };
  const channels = ["sms", ...(f.get("whatsapp") === "on" ? ["whatsapp"] : [])];
  const { data: existing } = await supabase.from("reminder_rules").select("id").eq("org_id", org.id).is("property_id", null).maybeSingle();
  const row = { org_id: org.id, tone, offsets: [...TONES[tone].offsets], channels, active: true };
  const { error } = existing
    ? await supabase.from("reminder_rules").update(row).eq("id", existing.id)
    : await supabase.from("reminder_rules").insert(row);
  if (error) return { error: "Couldn’t save your reminder settings." };
  await advance(7);
  redirect("/app/onboarding?step=7");
}

export async function finishOnboarding() {
  await advance(7, true);
  redirect("/app");
}
