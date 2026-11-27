import "server-only";
import postgres from "postgres";

/**
 * Connection for the insert-only `rentife_writer` role (see db/001_leads.sql).
 * Uses the Supabase pooler in session mode (port 5432); prepared statements stay disabled.
 */
let sql: postgres.Sql | null = null;

export function db(): postgres.Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  sql ??= postgres(url, { ssl: "require", prepare: false, max: 1, idle_timeout: 20, connect_timeout: 10 });
  return sql;
}
