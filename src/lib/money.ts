/** Money is stored in cents (masterplan rule 6). These helpers convert at the edges only. */
export const toCents = (shillings: string | number): number => {
  const n = typeof shillings === "number" ? shillings : Number(String(shillings).replace(/[,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) throw new Error("Enter a valid amount");
  return Math.round(n * 100);
};
export const ksh = (cents: number | null | undefined) =>
  cents == null ? "—" : `KSh ${(cents / 100).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;

/** Normalise a Kenyan mobile number to +2547XXXXXXXX / +2541XXXXXXXX, or null if invalid. */
export const kePhone = (raw: string): string | null => {
  const m = raw.replace(/[\s-]/g, "").match(/^(?:\+?254|0)?([17]\d{8})$/);
  return m ? `+254${m[1]}` : null;
};

export const dateKE = (d: string | Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
