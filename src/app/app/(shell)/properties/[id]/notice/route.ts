import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { supabaseServer } from "@/lib/supabase/server";
import { NoticeDocument, type NoticeData } from "@/lib/pdf/notice";
import { siteUrl } from "@/lib/app/safe-next";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Sign in first", { status: 401 });
  // RLS limits both reads to properties this person may see.
  const { data: prop } = await supabase.from("properties").select("id, org_id, name").eq("id", id).maybeSingle();
  if (!prop) return new Response("Not found", { status: 404 });
  const [{ data: pay }, { data: units }] = await Promise.all([
    supabase.from("payment_settings").select("method, shortcode, bank_account_hint").eq("org_id", prop.org_id).maybeSingle(),
    supabase.from("unit_board").select("label, unit_code").eq("property_id", id),
  ]);
  if (!pay || pay.method === "none_yet" || !pay.shortcode) {
    return new Response("Add your Paybill or Till number first (Onboarding → How tenants pay).", { status: 409 });
  }
  const data: NoticeData = {
    property: prop.name,
    method: pay.method as NoticeData["method"],
    shortcode: pay.shortcode,
    bankAccountHint: pay.bank_account_hint ?? "",
    units: (units ?? []).map((u) => ({ label: u.label, code: u.unit_code })).sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true })),
    logoUrl: `${siteUrl()}/brand/rentife-wordmark-white.png`,
  };
  const pdf = await renderToBuffer(createElement(NoticeDocument, data) as Parameters<typeof renderToBuffer>[0]);
  const safe = prop.name.replace(/[^\w -]/g, "").replace(/\s+/g, "-").toLowerCase();
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="how-to-pay-rent-${safe}.pdf"`, "Cache-Control": "no-store" },
  });
}
