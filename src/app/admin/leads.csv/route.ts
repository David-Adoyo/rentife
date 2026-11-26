import { adminDb, audit } from "@/lib/admin/db";
import { requireAdmin } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

const cell = (v: unknown) => {
  let s = v instanceof Date ? v.toISOString() : String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // stop spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET(req: Request) {
  const admin = await requireAdmin();
  const url = new URL(req.url);
  const status = ["new", "contacted", "booked", "closed"].includes(url.searchParams.get("status") ?? "") ? url.searchParams.get("status")! : "";
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const rows = await adminDb()`
    select created_at, name, phone, units, area, best_time, status, notes from rentife.leads
    where (${status} = '' or status = ${status})
      and (${q} = '' or name ilike ${"%" + q + "%"} or phone ilike ${"%" + q + "%"} or area ilike ${"%" + q + "%"})
    order by created_at desc`;
  await audit(admin.id, "leads_exported", "lead", null, { status, q, rows: rows.length });
  const header = ["Received", "Name", "Phone", "Units", "Area", "Best time", "Status", "Notes"];
  const body = rows.map((r) => [r.created_at, r.name, r.phone, r.units, r.area, r.best_time, r.status, r.notes].map(cell).join(","));
  const csv = "﻿" + [header.map(cell).join(","), ...body].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rentife-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
