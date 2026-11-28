import { timingSafeEqual } from "node:crypto";
import postgres from "postgres";
import { todayKE } from "@/core/billing";
import { computeCharges, toRecurring, toReview, toTenancy } from "@/lib/billing/run";

export const dynamic = "force-dynamic";

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
export const maxDuration = 60;

/**
 * Daily billing run (masterplan §7.1), called by Vercel Cron with `Authorization: Bearer $CRON_SECRET`.
 * Connects as rentife_billing, which can read what billing needs and post through post_charges() only.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  // Vercel Cron sends Authorization; x-cron-secret lets an operator trigger a run by hand (same secret).
  const bearer = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || !(safeEqual(bearer, secret) || safeEqual(req.headers.get("x-cron-secret") ?? "", secret))) return new Response("Unauthorised", { status: 401 });
  const url = process.env.DATABASE_BILLING_URL;
  if (!url) return Response.json({ error: "DATABASE_BILLING_URL is not set" }, { status: 500 });

  const today = new URL(req.url).searchParams.get("as_of") ?? todayKE();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) return new Response("Bad as_of", { status: 400 });
  const sql = postgres(url, { ssl: "require", prepare: false, max: 1, connect_timeout: 10 });
  const summary: { org: string; charges: number; invoices: number; error?: string }[] = [];
  try {
    const orgs = await sql`select id, billing_lead_days from public.organisations where archived_at is null`;
    for (const o of orgs) {
      try {
        const [tenancies, reviews, recurring] = [
          await sql`select t.*, u.property_id from public.tenancies t join public.units u on u.id = t.unit_id
                    where t.org_id = ${o.id} and (t.status <> 'ended' or t.end_date >= (${today}::date - 62))`,
          await sql`select r.* from public.rent_reviews r where r.org_id = ${o.id}`,
          await sql`select * from public.recurring_charges where org_id = ${o.id} and active`,
        ];
        const charges = computeCharges({ leadDays: o.billing_lead_days, tenancies: tenancies.map(toTenancy), reviews: reviews.map(toReview), recurring: recurring.map(toRecurring) }, today);
        const [res] = await sql`select public.post_charges(${o.id}, ${today}::date, 'cron', ${sql.json(charges as never)}) as r`;
        summary.push({ org: o.id, charges: res.r.charges, invoices: res.r.invoices });
      } catch (e) {
        summary.push({ org: o.id, charges: 0, invoices: 0, error: e instanceof Error ? e.message : "failed" });
      }
    }
  } finally {
    await sql.end();
  }
  console.info("[billing]", today, JSON.stringify(summary));
  return Response.json({ as_of: today, organisations: summary.length, charges: summary.reduce((s, x) => s + x.charges, 0), errors: summary.filter((x) => x.error).length });
}
