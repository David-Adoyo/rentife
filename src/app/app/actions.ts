"use server";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { appContext, ORG_COOKIE } from "@/lib/app/context";
import { kePhone, toCents } from "@/lib/money";
import { siteUrl } from "@/lib/app/safe-next";
import type { ActionResult } from "@/components/app/ActionForm";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string) => Number.parseInt(str(f, k), 10);
const fail = (error: string): ActionResult => ({ error });
/** Postgres/RLS errors → plain English, without leaking internals. */
function dbError(e: { message: string; code?: string } | null, fallback: string): ActionResult {
  if (!e) return fail(fallback);
  if (e.code === "23505") return fail("That already exists: choose a different name or code.");
  if (e.code === "42501" || /row-level security/i.test(e.message)) return fail("You don’t have permission to do that.");
  if (e.code === "23514") return fail("Some details aren’t valid. Check the form and try again.");
  return fail(e.message.length < 140 ? e.message : fallback);
}

/* ── Organisation ─────────────────────────────────────────────────────────── */
export async function createOrganisation(_: ActionResult, f: FormData): Promise<ActionResult> {
  const name = str(f, "name"), fullName = str(f, "full_name"), type = str(f, "type");
  if (name.length < 2) return fail("Enter your organisation’s name.");
  if (fullName.length < 2) return fail("Enter your name.");
  if (!["individual", "family", "agency"].includes(type)) return fail("Choose what kind of landlord you are.");
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("create_organisation", { p_name: name, p_type: type, p_full_name: fullName });
  if (error) return dbError(error, "Could not create your organisation.");
  (await cookies()).set(ORG_COOKIE, data as string, { path: "/", httpOnly: true, sameSite: "lax", secure: true, maxAge: 60 * 60 * 24 * 365 });
  redirect("/app");
}

export async function switchOrg(f: FormData) {
  (await cookies()).set(ORG_COOKIE, str(f, "org_id"), { path: "/", httpOnly: true, sameSite: "lax", secure: true, maxAge: 60 * 60 * 24 * 365 });
  redirect("/app");
}

/* ── Properties and units ─────────────────────────────────────────────────── */
export async function createProperty(_: ActionResult, f: FormData): Promise<ActionResult> {
  const { supabase, org } = await appContext();
  const name = str(f, "name");
  if (name.length < 2) return fail("Enter the property’s name.");
  let prefix = str(f, "code_prefix").toUpperCase().replace(/[^A-Z]/g, "");
  if (!prefix) {
    const { data, error } = await supabase.rpc("suggest_prefix", { p_org: org.id, p_name: name });
    if (error) return dbError(error, "Could not create a unit-code prefix.");
    prefix = data as string;
  }
  if (!/^[A-Z]{2,5}$/.test(prefix)) return fail("The unit-code prefix must be 2 to 5 letters, like SUN.");
  const dueDay = int(f, "default_due_day") || 5;
  const { data, error } = await supabase.from("properties").insert({
    org_id: org.id, name, code_prefix: prefix, estate: str(f, "estate"), county: str(f, "county"),
    type: str(f, "type") || "residential", default_due_day: dueDay, owner_id: str(f, "owner_id") || null,
  }).select("id").single();
  if (error) return dbError(error, "Could not add the property.");
  revalidatePath("/app", "layout");
  redirect(`/app/properties/${data.id}`);
}

export async function createUnits(_: ActionResult, f: FormData): Promise<ActionResult> {
  const { supabase, org } = await appContext();
  const propertyId = str(f, "property_id");
  const type = str(f, "type") || "other";
  let rent: number, deposit: number;
  try { rent = toCents(str(f, "rent") || 0); deposit = toCents(str(f, "deposit") || 0); } catch { return fail("Enter rent and deposit as numbers, e.g. 15000."); }

  // Either one label ("B4") or a range ("B" from 1 to 12 → B1…B12).
  const single = str(f, "label").toUpperCase();
  const prefix = str(f, "range_prefix").toUpperCase(), from = int(f, "range_from"), to = int(f, "range_to");
  let labels: string[];
  if (single) labels = [single];
  else if (Number.isInteger(from) && Number.isInteger(to) && to >= from) {
    if (to - from > 199) return fail("Add at most 200 units at a time.");
    labels = Array.from({ length: to - from + 1 }, (_, i) => `${prefix}${from + i}`);
  } else return fail("Enter a unit label, or a range like B 1 to 12.");
  if (labels.some((l) => !/^[A-Z0-9-]{1,20}$/.test(l))) return fail("Unit labels can use letters, numbers and dashes only.");

  const { error } = await supabase.from("units").insert(labels.map((label) => ({
    org_id: org.id, property_id: propertyId, label, unit_code: "", type, rent_amount: rent, deposit_amount: deposit, floor: str(f, "floor"),
  })));
  if (error) return dbError(error, "Could not add the units.");
  revalidatePath(`/app/properties/${propertyId}`);
  return { ok: true, message: labels.length === 1 ? `Unit ${labels[0]} added.` : `${labels.length} units added (${labels[0]} to ${labels.at(-1)}).` };
}

export async function updateUnit(_: ActionResult, f: FormData): Promise<ActionResult> {
  const { supabase } = await appContext();
  const id = str(f, "id");
  let rent: number, deposit: number;
  try { rent = toCents(str(f, "rent")); deposit = toCents(str(f, "deposit") || 0); } catch { return fail("Enter amounts as numbers."); }
  const patch: Record<string, unknown> = { rent_amount: rent, deposit_amount: deposit, type: str(f, "type") };
  const status = str(f, "status");
  if (status === "maintenance" || status === "vacant") patch.status = status; // occupied/notice follow tenancies
  const { data, error } = await supabase.from("units").update(patch).eq("id", id).select("property_id");
  if (error) return dbError(error, "Could not save the unit.");
  if (!data?.length) return fail("You don’t have permission to change this unit.");
  revalidatePath(`/app/properties/${data[0].property_id}`);
  return { ok: true, message: "Saved." };
}

export async function addAlias(_: ActionResult, f: FormData): Promise<ActionResult> {
  const { supabase, org } = await appContext();
  const code = str(f, "code").toUpperCase();
  if (!/^[A-Z0-9 -]{1,24}$/.test(code)) return fail("Use letters, numbers, spaces or dashes.");
  const { error } = await supabase.from("unit_codes").insert({ org_id: org.id, unit_id: str(f, "unit_id"), code, is_primary: false });
  if (error) return error.code === "23505" ? fail(`Another unit already answers to “${code}”.`) : dbError(error, "Could not add the alternative code.");
  revalidatePath(`/app/properties/${str(f, "property_id")}`);
  return { ok: true, message: `Payments with account “${code}” will now match this unit.` };
}

/* ── Owners (agency mode) ─────────────────────────────────────────────────── */
export async function createOwner(_: ActionResult, f: FormData): Promise<ActionResult> {
  const { supabase, org } = await appContext();
  const fullName = str(f, "full_name");
  const phoneRaw = str(f, "phone"), phone = phoneRaw ? kePhone(phoneRaw) : null;
  if (fullName.length < 2) return fail("Enter the owner’s name.");
  if (phoneRaw && !phone) return fail("Enter a Kenyan mobile number, like 0712 345 678.");
  const { error } = await supabase.from("owners").insert({
    org_id: org.id, full_name: fullName, phone, email: str(f, "email").toLowerCase() || null,
    residency: str(f, "residency") === "non_resident" ? "non_resident" : "resident",
  });
  if (error) return dbError(error, "Could not add the owner.");
  revalidatePath("/app/team");
  return { ok: true, message: `${fullName} added.` };
}

/* ── Tenants and tenancies ────────────────────────────────────────────────── */
export async function createTenant(_: ActionResult, f: FormData): Promise<ActionResult> {
  const { supabase, org } = await appContext();
  const fullName = str(f, "full_name");
  const phones = [str(f, "phone"), str(f, "phone2")].filter(Boolean);
  const normalised = phones.map(kePhone);
  if (fullName.length < 2) return fail("Enter the tenant’s full name.");
  if (!phones.length) return fail("Add at least one phone number: we match M-Pesa payments by it.");
  if (normalised.some((p) => !p)) return fail("Phone numbers must be Kenyan mobiles, like 0712 345 678.");
  const last4 = str(f, "national_id_last4");
  if (last4 && !/^\d{4}$/.test(last4)) return fail("Only the last 4 digits of the ID number are stored.");
  const { error } = await supabase.from("tenants").insert({
    org_id: org.id, full_name: fullName, phones: normalised, email: str(f, "email").toLowerCase() || null,
    national_id_last4: last4 || null, preferred_language: str(f, "preferred_language") === "sw" ? "sw" : "en",
    consent_sms: f.get("consent_sms") === "on", consent_whatsapp: f.get("consent_whatsapp") === "on",
  });
  if (error) return dbError(error, "Could not add the tenant.");
  revalidatePath("/app/tenants");
  return { ok: true, message: `${fullName} added. Now move them into a unit.` };
}

export async function startTenancy(_: ActionResult, f: FormData): Promise<ActionResult> {
  const { supabase, org } = await appContext();
  const unitId = str(f, "unit_id"), tenantId = str(f, "tenant_id"), start = str(f, "start_date");
  if (!unitId) return fail("Choose a vacant unit.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return fail("Choose a start date.");
  const { data: unit } = await supabase.from("units").select("rent_amount, deposit_amount, property_id, properties(default_due_day, default_grace_days)").eq("id", unitId).single();
  if (!unit) return fail("You don’t have permission to use that unit.");
  const props = unit.properties as unknown as { default_due_day: number; default_grace_days: number };
  let rent = unit.rent_amount as number, deposit = unit.deposit_amount as number;
  try { if (str(f, "rent")) rent = toCents(str(f, "rent")); if (str(f, "deposit")) deposit = toCents(str(f, "deposit")); } catch { return fail("Enter amounts as numbers."); }
  const dueDay = int(f, "due_day") || props.default_due_day;
  const { error } = await supabase.from("tenancies").insert({
    org_id: org.id, unit_id: unitId, tenant_id: tenantId, start_date: start, rent_amount: rent, deposit_amount: deposit,
    due_day: dueDay, grace_days: props.default_grace_days,
  });
  if (error) return error.code === "23505" ? fail("That unit already has a tenant.") : dbError(error, "Could not start the tenancy.");
  revalidatePath("/app", "layout");
  return { ok: true, message: "Moved in." };
}

export async function endTenancy(_: ActionResult, f: FormData): Promise<ActionResult> {
  const { supabase } = await appContext();
  const end = str(f, "end_date") || new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.from("tenancies").update({ status: "ended", end_date: end }).eq("id", str(f, "tenancy_id")).select("id");
  if (error) return dbError(error, "Could not end the tenancy.");
  if (!data?.length) return fail("You don’t have permission to do that.");
  revalidatePath("/app", "layout");
  return { ok: true, message: "Tenancy ended; the unit is now vacant." };
}

/* ── Team ─────────────────────────────────────────────────────────────────── */
const ROLES = ["manager", "accountant", "caretaker", "passive_owner"];

export async function inviteMember(_: ActionResult, f: FormData): Promise<ActionResult> {
  const { supabase, org, user } = await appContext();
  const email = str(f, "email").toLowerCase(), role = str(f, "role");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Enter a valid email address.");
  if (!ROLES.includes(role)) return fail("Choose a role.");
  const scope = f.getAll("property_scope").map(String).filter(Boolean);
  const ownerId = str(f, "owner_id") || null;
  if (role === "passive_owner" && !ownerId) return fail("Choose which owner record this person represents.");
  if (role === "caretaker" && !scope.length) return fail("Choose at least one property for the caretaker.");

  const token = randomBytes(32).toString("base64url");
  const { error } = await supabase.from("invitations").insert({
    org_id: org.id, email, role, property_scope: scope.length ? scope : null, owner_id: role === "passive_owner" ? ownerId : null,
    token_hash: createHash("sha256").update(token).digest("hex"), invited_by: user.id,
  });
  if (error) return dbError(error, "Could not create the invitation.");
  const link = `${siteUrl()}/invite/${token}`;
  const sent = await sendInviteEmail(email, org.name, role, link);
  revalidatePath("/app/team");
  return { ok: true, message: sent ? `Invitation emailed to ${email}.` : `Email isn’t set up yet. Send this link to ${email}: ${link}` };
}

async function sendInviteEmail(to: string, orgName: string, role: string, link: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const roleText = { manager: "a manager", accountant: "an accountant", caretaker: "a caretaker", passive_owner: "a property owner" }[role] ?? "a member";
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Rentife <no-reply@rentife.co.ke>",
      to,
      subject: `You’ve been invited to ${orgName} on Rentife`,
      html: `<div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:auto;color:#1a1219">
        <div style="background:#4a2052;padding:20px 28px;border-radius:20px 20px 0 0"><img src="https://rentife.co.ke/brand/rentife-wordmark-white.png" alt="Rentife" width="120"></div>
        <div style="background:#fff;padding:28px;border:1px solid #e6dde0;border-top:0;border-radius:0 0 20px 20px">
        <h1 style="font-size:22px;margin:0 0 12px">You’ve been invited</h1>
        <p style="font-size:16px;line-height:1.6;color:#4a3f48">${esc(orgName)} has invited you to join their Rentife account as ${roleText}.</p>
        <p style="margin:24px 0"><a href="${link}" style="background:#4a2052;color:#fff;text-decoration:none;font-weight:600;padding:14px 26px;border-radius:999px;display:inline-block">Accept invitation</a></p>
        <p style="font-size:13px;color:#6b5c68">The link works once and expires in 7 days. If you weren’t expecting this, you can ignore it.</p></div></div>`,
    }),
  });
  return res.ok;
}

export async function revokeInvite(_: ActionResult, f: FormData): Promise<ActionResult> {
  const { supabase } = await appContext();
  const { error } = await supabase.from("invitations").delete().eq("id", str(f, "id"));
  if (error) return dbError(error, "Could not cancel the invitation.");
  revalidatePath("/app/team");
  return { ok: true };
}

export async function updateMember(_: ActionResult, f: FormData): Promise<ActionResult> {
  const { supabase } = await appContext();
  const role = str(f, "role");
  if (![...ROLES, "owner"].includes(role)) return fail("Choose a role.");
  const scope = f.getAll("property_scope").map(String).filter(Boolean);
  const { data, error } = await supabase.from("memberships")
    .update({ role, property_scope: scope.length ? scope : null, two_factor_required: role === "owner" || role === "manager" })
    .eq("id", str(f, "id")).select("id");
  if (error) return /owner/i.test(error.message) ? fail("An organisation must keep at least one owner.") : dbError(error, "Could not update the member.");
  if (!data?.length) return fail("You don’t have permission to do that.");
  revalidatePath("/app/team");
  return { ok: true, message: "Saved." };
}

export async function removeMember(_: ActionResult, f: FormData): Promise<ActionResult> {
  const { supabase } = await appContext();
  const { data, error } = await supabase.from("memberships").delete().eq("id", str(f, "id")).select("id");
  if (error) return /owner/i.test(error.message) ? fail("An organisation must keep at least one owner.") : dbError(error, "Could not remove the member.");
  if (!data?.length) return fail("You don’t have permission to do that.");
  revalidatePath("/app/team");
  return { ok: true, message: "Removed." };
}
