import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sign, unsign } from "./crypto";
import { adminDb, type Admin } from "./db";

const COOKIE = "rentife_admin";
const FULL_HOURS = 12;
const PENDING_MINUTES = 10;

/**
 * stage "pending": password accepted, authenticator code still needed.
 * stage "full": signed in. `v` must match admins.session_version, so signing out
 * everywhere (or a password change) invalidates every existing cookie.
 */
type Session = { aid: string; v: number; stage: "pending" | "full"; exp: number };

export async function setSession(admin: Pick<Admin, "id" | "session_version">, stage: Session["stage"]) {
  const ttl = stage === "full" ? FULL_HOURS * 3600 : PENDING_MINUTES * 60;
  const token = sign({ aid: admin.id, v: admin.session_version, stage, exp: Math.floor(Date.now() / 1000) + ttl } satisfies Session);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    maxAge: ttl,
  });
}

export async function clearSession() {
  (await cookies()).delete({ name: COOKIE, path: "/admin" });
}

async function readSession(): Promise<Session | null> {
  const s = unsign<Session>((await cookies()).get(COOKIE)?.value);
  if (!s || s.exp < Date.now() / 1000) return null;
  return s;
}

async function loadAdmin(s: Session): Promise<Admin | null> {
  const [a] = await adminDb()<Admin[]>`select * from rentife.admins where id = ${s.aid}`;
  return a && a.session_version === s.v ? a : null;
}

/** Admin who has passed the password step and still needs the authenticator code. */
export async function pendingAdmin(): Promise<Admin | null> {
  const s = await readSession();
  return s?.stage === "pending" ? loadAdmin(s) : null;
}

/** Fully signed-in admin, or redirect to the sign-in page. */
export async function requireAdmin(): Promise<Admin> {
  const s = await readSession();
  const admin = s?.stage === "full" ? await loadAdmin(s) : null;
  if (!admin) redirect("/admin/login");
  return admin;
}
