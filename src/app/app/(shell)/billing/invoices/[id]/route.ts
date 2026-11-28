import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { supabaseServer } from "@/lib/supabase/server";
import { loadInvoice } from "@/lib/billing/docs";
import { InvoiceDocument } from "@/lib/pdf/billing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Sign in first", { status: 401 });
  const data = await loadInvoice(supabase, id); // RLS: only people who may see this tenancy's money
  if (!data) return new Response("Not found", { status: 404 });
  const pdf = await renderToBuffer(createElement(InvoiceDocument, data) as Parameters<typeof renderToBuffer>[0]);
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${data.number}-${data.unitCode}.pdf"`, "Cache-Control": "no-store" },
  });
}
