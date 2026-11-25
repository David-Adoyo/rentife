import { NextResponse } from "next/server";

/**
 * Book-a-setup lead intake (masterplan §9.3).
 * TODO(Stage 3): persist to the leads table and send the WhatsApp confirmation.
 * Until the database exists, valid leads are written to the server log only.
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

  const lead = { name, phone: `+254${m![1]}`, units, area, time, receivedAt: new Date().toISOString() };
  console.info("[lead]", JSON.stringify(lead));
  return NextResponse.json({ ok: true });
}
