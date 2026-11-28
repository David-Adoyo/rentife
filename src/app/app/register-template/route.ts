import ExcelJS from "exceljs";
import { FIELDS } from "@/lib/register";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Downloadable register template (masterplan §11 step 3). */
export async function GET() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return new Response("Sign in first", { status: 401 });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Rentife";
  const ws = wb.addWorksheet("Units and tenants", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = FIELDS.map((f) => ({ header: f.label, key: f.key, width: Math.max(12, f.label.length + 4) }));
  ws.getColumn("tenant_name").width = 24;
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4A2052" } };
  head.height = 22;
  ws.addRows([
    { label: "B1", type: "1 bedroom", rent: 15000, deposit: 15000, floor: "1", tenant_name: "Wanjiru Kamau", phone: "0712 345 678", move_in: "01/11/2026", language: "English" },
    { label: "B2", type: "1 bedroom", rent: 15000, deposit: 15000, floor: "1", tenant_name: "Otieno Ouma", phone: "0722 111 222", phone2: "0733 444 555", move_in: "15/08/2025", due_day: 10, language: "Kiswahili" },
    { label: "B3", type: "Bedsitter", rent: 9000, deposit: 9000, floor: "1" },
  ]);
  ["phone", "phone2", "move_in", "label", "unit_code", "id_last4"].forEach((k) => (ws.getColumn(k).numFmt = "@"));

  const help = wb.addWorksheet("How to fill this in");
  help.getColumn(1).width = 110;
  [
    "Rentife register template",
    "",
    "• One row per unit. Leave the tenant columns empty for vacant units.",
    "• Unit is required (e.g. B4). The M-Pesa code is created for you (e.g. SUN-B4); only fill it in to use a code your tenants already know.",
    "• Rent and Deposit in Kenyan shillings, e.g. 15000.",
    "• Phone: the number the tenant pays rent from, e.g. 0712 345 678. Add a second phone if a spouse sometimes pays.",
    "• Move-in date as day/month/year, e.g. 01/11/2026. Due day: 1 to 28 (leave blank to use the property's due day).",
    "• ID (last 4): only the last 4 digits of the national ID are kept.",
    "• Language: English or Kiswahili, for messages to that tenant.",
    "",
    "Delete the three example rows before importing. You can check and fix everything on screen before anything is saved.",
  ].forEach((line, i) => {
    const row = help.addRow([line]);
    if (i === 0) row.font = { bold: true, size: 14, color: { argb: "FF4A2052" } };
  });

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="rentife-register-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
