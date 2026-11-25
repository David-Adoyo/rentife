import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Book-a-setup lead intake (masterplan §9.3). Valid leads are saved to `rentife.leads`.
 * TODO: send the WhatsApp confirmation once the WhatsApp Business account exists.
 */
const KENYAN_MOBILE = /^(?:\+?254|0)?([17]\d{8})$/;

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ errors: { form: "Invalid request." } }, { status: 400 });
  }

  const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string).trim() : "");

  // Honeypot: real visitors never see or fill this field. Pretend success to bots.
  if (str("company")) return NextResponse.json({ ok: true });

  const name = str("name");
  const phoneRaw = str("phone").replace(/[\s-]/g, "");
  const units = Number(str("units"));
  const area = str("area");
  const time = str("time");

  const errors: Record<string, string> = {};
  if (name.length < 2 || name.length > 100) errors.name = "Please enter your name.";
  const m = phoneRaw.match(KENYAN_MOBILE);
  if (!m) errors.phone = "Enter a Kenyan mobile number, like 0712 345 678.";
  if (!Number.isInteger(units) || units < 1 || units > 10000) errors.units = "Enter the number of units.";
  if (area.length < 2 || area.length > 100) errors.area = "Tell us the area, e.g. Kasarani.";
  if (!["morning", "afternoon", "evening"].includes(time)) errors.time = "Choose a time.";
  if (Object.keys(errors).length) return NextResponse.json({ errors }, { status: 422 });

  const phone = `+254${m![1]}`;
  const sql = db();

  if (!sql) {
    // Local development without a database: never pretend a lead was saved in production.
    if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
      console.error("[lead] DATABASE_URL is not set; lead not saved");
      return NextResponse.json({ errors: { form: "Bookings are temporarily unavailable. Please try again shortly." } }, { status: 503 });
    }
    console.info("[lead:dev]", JSON.stringify({ name, phone, units, area, time }));
    return NextResponse.json({ ok: true });
  }

  try {
    await sql`
      insert into rentife.leads (name, phone, units, area, best_time)
      values (${name}, ${phone}, ${units}, ${area}, ${time})
    `;
  } catch (err) {
    console.error("[lead] insert failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ errors: { form: "We couldn’t save your request. Please try again in a moment." } }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
