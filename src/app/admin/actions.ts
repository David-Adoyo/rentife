"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { decrypt, encrypt, hashPassword, sha256, verifyPassword } from "@/lib/admin/crypto";
import { adminDb, audit, type Admin } from "@/lib/admin/db";
import { clearSession, pendingAdmin, requireAdmin, setSession } from "@/lib/admin/session";

export type FormState = { error?: string; ok?: boolean; qr?: string; secret?: string } | undefined;

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const GENERIC = "That email and password don’t match.";

function totpFor(admin: Pick<Admin, "email">, secretBase32: string) {
  return new OTPAuth.TOTP({ issuer: "Rentife", label: admin.email, secret: OTPAuth.Secret.fromBase32(secretBase32), digits: 6, period: 30 });
}

/** Count a failed attempt atomically, so parallel guesses can't slip past the limit. */
async function recordFailure(admin: Admin) {
  const [row] = await adminDb()<{ locked: boolean }[]>`
    update rentife.admins set
      locked_until = case when failed_attempts + 1 >= ${MAX_ATTEMPTS}
                          then now() + make_interval(mins => ${LOCK_MINUTES}) else locked_until end,
      failed_attempts = case when failed_attempts + 1 >= ${MAX_ATTEMPTS} then 0 else failed_attempts + 1 end
    where id = ${admin.id}
    returning locked_until is not null and locked_until > now() as locked`;
  if (row?.locked) await audit(admin.id, "locked_out", "admin", admin.id, { minutes: LOCK_MINUTES });
}

const isLocked = (a: Admin) => !!a.locked_until && a.locked_until.getTime() > Date.now();
const lockedMessage = `Too many attempts. Try again in ${LOCK_MINUTES} minutes.`;

/* Step 1: email and password. */
export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const [admin] = await adminDb()<Admin[]>`select * from rentife.admins where email = ${email}`;
  const ok = await verifyPassword(password, admin?.password_hash ?? null);
  if (!admin) return { error: GENERIC };
  if (isLocked(admin)) return { error: lockedMessage };
  if (!ok) {
    await recordFailure(admin);
    return { error: GENERIC };
  }
  if (!admin.totp_enabled) return { error: "Finish setting up your account from your invite link first." };
  await setSession(admin, "pending");
  redirect("/admin/login/verify");
}

/* Step 2: authenticator code. */
export async function verifyCode(_: FormState, form: FormData): Promise<FormState> {
  const admin = await pendingAdmin();
  if (!admin || !admin.totp_secret_enc) redirect("/admin/login");
  if (isLocked(admin)) return { error: lockedMessage };
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  const valid = /^\d{6}$/.test(code) && totpFor(admin, decrypt(admin.totp_secret_enc)).validate({ token: code, window: 1 }) !== null;
  if (!valid) {
    await recordFailure(admin);
    return { error: "That code isn’t right. Check your authenticator app and try again." };
  }
  await adminDb()`update rentife.admins set failed_attempts = 0, locked_until = null, last_login_at = now() where id = ${admin.id}`;
  await audit(admin.id, "sign_in", "admin", admin.id);
  await setSession(admin, "full");
  redirect("/admin");
}

/* Invite: set a password, then connect an authenticator app. */
async function inviteFor(token: string) {
  const [row] = await adminDb()<(Admin & { expires_at: Date; used_at: Date | null })[]>`
    select a.*, i.expires_at, i.used_at from rentife.admin_invites i
    join rentife.admins a on a.id = i.admin_id
    where i.token_hash = ${sha256(token)}`;
  if (!row || row.used_at || row.expires_at.getTime() < Date.now()) return null;
  return row;
}

export async function inviteIsValid(token: string) {
  const row = await inviteFor(token);
  return row ? { email: row.email } : null;
}

export async function setPassword(token: string, _: FormState, form: FormData): Promise<FormState> {
  const admin = await inviteFor(token);
  if (!admin) return { error: "This invite link has expired or was already used." };
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (password.length < 12) return { error: "Use at least 12 characters." };
  if (password !== confirm) return { error: "The two passwords don’t match." };

  const secret = new OTPAuth.Secret({ size: 20 });
  await adminDb()`update rentife.admins
                  set password_hash = ${await hashPassword(password)}, totp_secret_enc = ${encrypt(secret.base32)}, totp_enabled = false
                  where id = ${admin.id}`;
  const uri = totpFor(admin, secret.base32).toString();
  const qr = await QRCode.toDataURL(uri, { margin: 1, width: 220, color: { dark: "#2a0f2e", light: "#ffffff" } });
  return { ok: true, qr, secret: secret.base32 };
}

export async function confirmAuthenticator(token: string, _: FormState, form: FormData): Promise<FormState> {
  const admin = await inviteFor(token);
  if (!admin || !admin.totp_secret_enc) return { error: "This invite link has expired or was already used." };
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  if (!(/^\d{6}$/.test(code) && totpFor(admin, decrypt(admin.totp_secret_enc)).validate({ token: code, window: 1 }) !== null)) {
    return { error: "That code isn’t right. Make sure your phone’s clock is set automatically and try again." };
  }
  const sql = adminDb();
  const [updated] = await sql<Admin[]>`update rentife.admins
    set totp_enabled = true, failed_attempts = 0, locked_until = null, last_login_at = now(), session_version = session_version + 1
    where id = ${admin.id} returning *`;
  await sql`update rentife.admin_invites set used_at = now() where token_hash = ${sha256(token)}`;
  await audit(admin.id, "account_activated", "admin", admin.id);
  await setSession(updated, "full");
  redirect("/admin");
}

/* Leads */
const STATUSES = ["new", "contacted", "booked", "closed"] as const;

export async function updateLead(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "");
  const notes = String(form.get("notes") ?? "").slice(0, 2000);
  if (!/^[0-9a-f-]{36}$/.test(id) || !STATUSES.includes(status as (typeof STATUSES)[number])) return { error: "Invalid update." };
  const sql = adminDb();
  const [before] = await sql<{ status: string; notes: string }[]>`select status, notes from rentife.leads where id = ${id}`;
  if (!before) return { error: "Lead not found." };
  await sql`update rentife.leads set status = ${status}, notes = ${notes}, updated_at = now() where id = ${id}`;
  await audit(admin.id, "lead_updated", "lead", id, { from: before, to: { status, notes } });
  revalidatePath("/admin");
  return { ok: true };
}

export async function signOut() {
  const admin = await requireAdmin().catch(() => null);
  if (admin) await audit(admin.id, "sign_out", "admin", admin.id);
  await clearSession();
  redirect("/admin/login");
}

export async function signOutEverywhere() {
  const admin = await requireAdmin();
  await adminDb()`update rentife.admins set session_version = session_version + 1 where id = ${admin.id}`;
  await audit(admin.id, "sign_out_everywhere", "admin", admin.id);
  await clearSession();
  redirect("/admin/login");
}
