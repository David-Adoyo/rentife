import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, keylen: number, opts: object) => Promise<Buffer>;
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function secret(): Buffer {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (32+ characters)");
  return Buffer.from(s);
}

function key(purpose: string): Buffer {
  return Buffer.from(hkdfSync("sha256", secret(), Buffer.alloc(0), `rentife:${purpose}`, 32));
}

const b64u = (b: Buffer) => b.toString("base64url");

/* Passwords: scrypt with a random salt. Format: scrypt$<salt>$<hash> */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64, SCRYPT);
  return `scrypt$${b64u(salt)}$${b64u(hash)}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  // Always do the work, even with no stored hash, so timing doesn't reveal which emails exist.
  const [, saltB64, hashB64] = (stored ?? "scrypt$AAAAAAAAAAAAAAAAAAAAAA$").split("$");
  const expected = Buffer.from(hashB64 || "", "base64url");
  const actual = await scryptAsync(password, Buffer.from(saltB64, "base64url"), 64, SCRYPT);
  return !!stored && expected.length === actual.length && timingSafeEqual(expected, actual);
}

/* Signed tokens (session cookie): base64url(json).hmac */
export function sign(payload: object): string {
  const body = b64u(Buffer.from(JSON.stringify(payload)));
  const mac = b64u(createHmac("sha256", key("session")).update(body).digest());
  return `${body}.${mac}`;
}

export function unsign<T>(token: string | undefined): T | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", key("session")).update(body).digest();
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString()) as T;
  } catch {
    return null;
  }
}

/* Authenticator secrets are encrypted at rest with AES-256-GCM. */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key("totp"), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [b64u(iv), b64u(c.getAuthTag()), b64u(data)].join(".");
}

export function decrypt(enc: string): string {
  const [iv, tag, data] = enc.split(".").map((p) => Buffer.from(p, "base64url"));
  const d = createDecipheriv("aes-256-gcm", key("totp"), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString("utf8");
}

/* Invite tokens: only the SHA-256 is stored. */
export const newToken = () => b64u(randomBytes(32));
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
