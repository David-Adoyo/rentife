import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { supabaseServer } from "@/lib/supabase/server";
import { loadStatement } from "@/lib/billing/docs";
import { StatementDocument } from "@/lib/pdf/billing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const date = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

/** /app/tenants/<tenant id>/statement?tenancy=<id>&from=YYYY-MM-DD&to=YYYY-MM-DD */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Sign in first", { status: 401 });
  let tenancy = url.searchParams.get("tenancy");
  if (!tenancy) {
    const { data } = await supabase.from("tenancies").select("id").eq("tenant_id", id).order("start_date", { ascending: false }).limit(1).maybeSingle();
    tenancy = data?.id ?? null;
  }
  if (!tenancy || !/^[0-9a-f-]{36}$/.test(tenancy)) return new Response("Not found", { status: 404 });
  const data = await loadStatement(supabase, tenancy, date(url.searchParams.get("from")), date(url.searchParams.get("to")));
  if (!data) return new Response("Not found", { status: 404 });
  const pdf = await renderToBuffer(createElement(StatementDocument, data) as Parameters<typeof renderToBuffer>[0]);
  const safe = data.tenant.replace(/[^\w -]/g, "").replace(/\s+/g, "-").toLowerCase();
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="statement-${data.unitCode}-${safe}.pdf"`, "Cache-Control": "no-store" },
  });
}
