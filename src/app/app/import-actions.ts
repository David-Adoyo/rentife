"use server";

import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import ExcelJS from "exceljs";
import { appContext } from "@/lib/app/context";
import { checkRows, emptyRow, parseCsv, rowsFromTable, toPayload, type RegisterRow } from "@/lib/register";

export type ReadResult = { rows?: RegisterRow[]; unknown?: string[]; error?: string; note?: string };
const MAX_FILE = 5 * 1024 * 1024;
const PHOTO_DAILY_LIMIT = 20;

/* ── Excel / CSV ───────────────────────────────────────────────────────────── */
function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (v instanceof Date) {
    // Excel stores dates as UTC midnight; show day/month/year so the shared parser reads them.
    return `${v.getUTCDate()}/${v.getUTCMonth() + 1}/${v.getUTCFullYear()}`;
  }
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return String(v.text);
    if ("result" in v) return cellText(v.result as ExcelJS.CellValue);
    return "";
  }
  return String(v);
}

export async function readRegisterFile(form: FormData): Promise<ReadResult> {
  const { can } = await appContext();
  if (!can.edit) return { error: "Only owners and managers can import units." };
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return { error: "Choose a file first." };
  if (file.size > MAX_FILE) return { error: "That file is over 5 MB. Remove extra sheets or columns and try again." };
  const name = file.name.toLowerCase();
  try {
    let table: string[][];
    if (name.endsWith(".csv")) {
      table = parseCsv(await file.text());
    } else if (name.endsWith(".xlsx")) {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await file.arrayBuffer());
      const ws = wb.worksheets.find((w) => w.rowCount > 0 && !/instruction|help|read ?me/i.test(w.name)) ?? wb.worksheets[0];
      if (!ws) return { error: "That workbook has no sheets." };
      table = [];
      ws.eachRow({ includeEmpty: false }, (row) => {
        const cells: string[] = [];
        for (let c = 1; c <= ws.columnCount; c++) cells.push(cellText(row.getCell(c).value).trim());
        table.push(cells);
      });
    } else {
      return { error: "Upload an Excel (.xlsx) or CSV file. Older .xls files: open in Excel and “Save as” .xlsx." };
    }
    const { rows, unknown } = rowsFromTable(table);
    if (!rows.length) return { error: "We couldn’t find any rows. Check the first row has column names like Unit, Tenant, Phone, Rent." };
    if (rows.length > 1000) return { error: "That’s more than 1,000 units. Split it into one file per property." };
    if (rows.every((r) => !r.label)) return { error: "We couldn’t find a Unit column. Name it “Unit” or “House No”, or download our template." };
    return { rows, unknown };
  } catch {
    return { error: "We couldn’t read that file. Is it a real Excel or CSV file?" };
  }
}

/* ── Photo of a handwritten register (Claude vision, behind a flag) ───────── */
const PhotoRows = z.object({
  rows: z.array(z.object({
    unit: z.string().describe("Unit or house number exactly as written, e.g. B4"),
    tenant_name: z.string().describe("Tenant's name, or empty string if the unit is vacant or unreadable"),
    phone: z.string().describe("Phone number exactly as written, or empty string"),
    rent: z.string().describe("Monthly rent in shillings as digits, or empty string"),
    deposit: z.string().describe("Deposit in shillings as digits, or empty string"),
    move_in: z.string().describe("Move-in date as written (day/month/year), or empty string"),
  })),
  unreadable: z.array(z.string()).describe("Short notes on entries you could not read with confidence"),
});

export const aiImportEnabled = async () => !!process.env.ANTHROPIC_API_KEY && process.env.AI_REGISTER_IMPORT !== "off";

export async function readRegisterPhoto(form: FormData): Promise<ReadResult> {
  const { supabase, org, can } = await appContext();
  if (!can.edit) return { error: "Only owners and managers can import units." };
  if (!(await aiImportEnabled())) return { error: "Photo import isn’t switched on yet. Use the Excel template instead." };
  const file = form.get("photo");
  if (!(file instanceof File) || !file.size) return { error: "Take or choose a photo first." };
  const type = file.type as "image/jpeg" | "image/png" | "image/webp";
  if (!["image/jpeg", "image/png", "image/webp"].includes(type)) return { error: "Use a JPEG, PNG or WebP photo." };
  if (file.size > MAX_FILE) return { error: "That photo is too large. Try again: we shrink photos automatically in most browsers." };

  const { data: allowed, error: quotaError } = await supabase.rpc("use_ai_quota", { p_org: org.id, p_feature: "register_photo", p_daily_limit: PHOTO_DAILY_LIMIT });
  if (quotaError) return { error: "You don’t have permission to do that." };
  if (!allowed) return { error: `You’ve used today’s ${PHOTO_DAILY_LIMIT} photo imports. Try again tomorrow, or use the Excel template.` };

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "medium", format: betaZodOutputFormat(PhotoRows) },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system:
        "You transcribe Kenyan landlords' rent registers (handwritten books or printed sheets) into rows. " +
        "Copy what is written; never guess or invent names, numbers or dates. If an entry is unclear, leave that field empty " +
        "and mention it in `unreadable`. One row per unit, in the order they appear. Amounts are Kenyan shillings: write digits only.",
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: type, data: Buffer.from(await file.arrayBuffer()).toString("base64") } },
          { type: "text", text: "Transcribe this rent register." },
        ],
      }],
    });
    if (response.stop_reason === "refusal") return { error: "We couldn’t read that photo. Try a clearer photo, or use the Excel template." };
    if (response.stop_reason === "max_tokens") return { error: "That register is too long for one photo. Photograph one page at a time." };
    const parsed = response.parsed_output;
    if (!parsed?.rows.length) return { error: "We couldn’t find any units in that photo. Make sure the whole page is in view and well lit." };
    const rows = parsed.rows.slice(0, 500).map((r) => ({ ...emptyRow(), label: r.unit, tenant_name: r.tenant_name, phone: r.phone, rent: r.rent, deposit: r.deposit, move_in: r.move_in }));
    return {
      rows,
      note: `Read ${rows.length} rows from your photo. Check every row against the register before importing${parsed.unreadable.length ? `: ${parsed.unreadable.length} entries were hard to read` : ""}.`,
    };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return { error: "Photo reading is busy right now. Try again in a minute." };
    if (err instanceof Anthropic.BadRequestError) return { error: "That photo couldn’t be processed. Try a smaller or clearer photo." };
    if (err instanceof Anthropic.APIError) return { error: "Photo reading is unavailable right now. Use the Excel template instead." };
    return { error: "Something went wrong reading that photo. Try again." };
  }
}

/* ── Save ──────────────────────────────────────────────────────────────────── */
export async function importRegisterRows(propertyId: string, rows: RegisterRow[]): Promise<{ error?: string; units?: number; tenants?: number; ms?: number }> {
  const started = Date.now();
  const { supabase, org, can } = await appContext();
  if (!can.edit) return { error: "Only owners and managers can import units." };
  if (!Array.isArray(rows) || !rows.length) return { error: "Nothing to import." };
  const { data: prop } = await supabase.from("properties").select("code_prefix").eq("id", propertyId).eq("org_id", org.id).maybeSingle();
  if (!prop) return { error: "You don’t have permission to add units to that property." };
  const { data: codes } = await supabase.from("unit_codes").select("code_norm").eq("org_id", org.id);
  const clean = rows.map((r) => ({ ...emptyRow(), ...Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? "")])) }) as RegisterRow);
  const issues = checkRows(clean, prop.code_prefix, new Set((codes ?? []).map((c) => c.code_norm)));
  const bad = issues.findIndex((i) => Object.keys(i.errors).length);
  if (bad >= 0) return { error: `Row ${bad + 1} still has a problem: ${Object.values(issues[bad].errors)[0]}.` };
  const { data, error } = await supabase.rpc("import_register", { p_property: propertyId, p_rows: toPayload(clean) });
  if (error) {
    if (/already used/i.test(error.message)) return { error: error.message.replace(/^.*?Unit code/, "Unit code") + ". Change it and try again." };
    if (/row-level security|permission/i.test(error.message)) return { error: "You don’t have permission to add units to that property." };
    return { error: "The import didn’t go through, and nothing was saved. Check the rows and try again." };
  }
  revalidatePath("/app", "layout");
  const result = data as { units: number; tenants: number };
  return { units: result.units, tenants: result.tenants, ms: Date.now() - started };
}
