import "server-only";
import postgres from "postgres";

/** Connection for the `rentife_admin_app` role (see db/002_admin.sql). */
let sql: postgres.Sql | null = null;

export function adminDb(): postgres.Sql {
  const url = process.env.DATABASE_ADMIN_URL;
  if (!url) throw new Error("DATABASE_ADMIN_URL is not set");
  sql ??= postgres(url, { ssl: "require", prepare: false, max: 1, idle_timeout: 20, connect_timeout: 10 });
  return sql;
}

export type Admin = {
  id: string;
  email: string;
  name: string;
  password_hash: string | null;
  totp_secret_enc: string | null;
  totp_enabled: boolean;
  failed_attempts: number;
  locked_until: Date | null;
  session_version: number;
};

export async function audit(adminId: string | null, action: string, entity: string, entityId: string | null, details: object = {}) {
  const sql = adminDb();
  await sql`insert into rentife.audit_log (admin_id, action, entity, entity_id, details)
            values (${adminId}, ${action}, ${entity}, ${entityId}, ${sql.json(details as postgres.JSONValue)})`;
}
