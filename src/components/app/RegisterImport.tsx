"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Camera, CheckCircle, FileXls, Keyboard, Plus, Trash, Warning } from "@phosphor-icons/react";
import { FIELDS, checkRows, emptyRow, type Field, type RegisterRow } from "@/lib/register";
import { importRegisterRows, readRegisterFile, readRegisterPhoto, type ReadResult } from "@/app/app/import-actions";

type Mode = "file" | "photo" | "manual";

/** Shrink phone photos in the browser: the API takes images up to 5 MB, and smaller uploads are faster on 3G. */
async function shrink(file: File, maxEdge = 2000): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 1_500_000) return file;
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const canvas = Object.assign(document.createElement("canvas"), { width: Math.round(bmp.width * scale), height: Math.round(bmp.height * scale) });
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
  return blob ? new File([blob], "register.jpg", { type: "image/jpeg" }) : file;
}

export function RegisterImport({ propertyId, prefix, existingCodes, aiEnabled, doneHref }: {
  propertyId: string; prefix: string; existingCodes: string[]; aiEnabled: boolean; doneHref: string;
}) {
  const [mode, setMode] = useState<Mode>("file");
  const [rows, setRows] = useState<RegisterRow[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [done, setDone] = useState<{ units: number; tenants: number; ms: number } | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const codes = useMemo(() => new Set(existingCodes), [existingCodes]);
  const issues = useMemo(() => (rows ? checkRows(rows, prefix, codes) : []), [rows, prefix, codes]);
  const errorRows = issues.filter((i) => Object.keys(i.errors).length).length;
  const warnRows = issues.filter((i) => Object.keys(i.warnings).length && !Object.keys(i.errors).length).length;
  const tenants = rows?.filter((r) => r.tenant_name.trim()).length ?? 0;

  const load = (res: ReadResult) => {
    if (res.error) return setError(res.error);
    setError(null);
    setRows(res.rows ?? []);
    setNote([res.note, res.unknown?.length ? `Ignored columns we don’t use: ${res.unknown.join(", ")}.` : ""].filter(Boolean).join(" ") || null);
  };
  const readFile = (f: File | undefined) => {
    if (!f) return;
    start(async () => {
      const fd = new FormData();
      if (mode === "photo") fd.append("photo", await shrink(f));
      else fd.append("file", f);
      load(await (mode === "photo" ? readRegisterPhoto(fd) : readRegisterFile(fd)));
    });
  };
  const edit = (i: number, k: Field, v: string) => setRows((rs) => rs!.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const submit = () =>
    start(async () => {
      const res = await importRegisterRows(propertyId, rows!);
      if (res.error) return setError(res.error);
      setError(null);
      setDone({ units: res.units!, tenants: res.tenants!, ms: res.ms! });
    });

  if (done) {
    return (
      <div className="rounded-[1.5rem] bg-white p-8 text-center shadow-soft" role="status">
        <CheckCircle size={44} weight="fill" className="mx-auto text-paid" />
        <p className="mt-3 text-xl font-medium">Imported {done.units} units{done.tenants ? ` and ${done.tenants} tenants` : ""}</p>
        <p className="mt-1 text-sm text-ink-600">Saved in {(done.ms / 1000).toFixed(1)} seconds. Every unit has its M-Pesa code.</p>
        <Link href={doneHref} className="btn btn-primary mt-6">Continue</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!rows && (
        <>
          <div role="tablist" aria-label="How to add units" className="grid gap-2 sm:grid-cols-3">
            {([
              ["file", FileXls, "Upload Excel or CSV", "Best for most landlords"],
              ["photo", Camera, "Snap your register", aiEnabled ? "We read the handwriting" : "Coming soon"],
              ["manual", Keyboard, "Type them in", "For a few units"],
            ] as const).map(([m, Icon, title, sub]) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} disabled={m === "photo" && !aiEnabled}
                onClick={() => { setMode(m); setError(null); if (m === "manual") setRows(Array.from({ length: 5 }, emptyRow)); }}
                className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors disabled:opacity-50 ${mode === m ? "border-plum-800 bg-plum-100" : "border-line bg-white hover:bg-cream-50"}`}>
                <Icon size={26} className="shrink-0 text-plum-800" aria-hidden />
                <span><span className="block font-medium">{title}</span><span className="text-sm text-ink-600">{sub}</span></span>
              </button>
            ))}
          </div>
          <div className="rounded-[1.5rem] border-2 border-dashed border-plum-200 bg-white p-8 text-center">
            {mode === "file" ? (
              <>
                <p className="font-medium">Upload your units and tenants</p>
                <p className="mt-1 text-sm text-ink-600">Any Excel or CSV with a Unit column works. Columns like Tenant, Phone and Rent are recognised automatically.</p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={pending} className="btn btn-primary">{pending ? "Reading…" : "Choose file"}</button>
                  <a href="/app/register-template" className="btn btn-outline">Download template</a>
                </div>
                <input ref={fileRef} type="file" accept=".xlsx,.csv" className="sr-only" aria-label="Excel or CSV file" onChange={(e) => readFile(e.target.files?.[0])} />
              </>
            ) : (
              <>
                <p className="font-medium">Photograph one page of your register</p>
                <p className="mt-1 text-sm text-ink-600">Lay it flat in good light. You’ll check every row before anything is saved.</p>
                <button type="button" onClick={() => fileRef.current?.click()} disabled={pending} className="btn btn-primary mt-5">{pending ? "Reading your register…" : "Take or choose a photo"}</button>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" aria-label="Register photo" onChange={(e) => readFile(e.target.files?.[0])} />
              </>
            )}
          </div>
        </>
      )}

      {error && <p role="alert" className="rounded-xl bg-overdue/10 px-4 py-3 text-sm text-overdue">{error}</p>}

      {rows && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm" aria-live="polite">
              <b>{rows.length} units</b>{tenants ? `, ${tenants} with tenants` : ""} ·{" "}
              {errorRows ? <span className="font-semibold text-overdue">{errorRows} {errorRows === 1 ? "row needs" : "rows need"} fixing</span> : <span className="font-semibold text-paid">ready to import</span>}
              {warnRows ? <span className="text-[#8a5c0f]"> · {warnRows} to double-check</span> : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {!!errorRows && (
                <label className="flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm">
                  <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} className="accent-plum-800" /> Only rows with problems
                </label>
              )}
              <button type="button" onClick={() => { setRows(null); setNote(null); setError(null); }} className="btn btn-outline h-9 min-h-9 px-3 text-sm">Start again</button>
            </div>
          </div>
          {note && <p className="rounded-xl bg-plum-100 px-4 py-3 text-sm text-plum-900">{note}</p>}

          <div className="overflow-x-auto rounded-[1.25rem] bg-white shadow-soft">
            <table className="min-w-max text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-600">
                  <th className="px-3 py-3">#</th>
                  {FIELDS.map((f) => <th key={f.key} scope="col" className="px-2 py-3 font-semibold">{f.label}</th>)}
                  <th className="px-2 py-3"><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const iss = issues[i];
                  if (onlyProblems && !Object.keys(iss.errors).length) return null;
                  return (
                    <tr key={i} className={`border-b border-line/60 align-top ${Object.keys(iss.errors).length ? "bg-overdue/[0.03]" : ""}`}>
                      <td className="num px-3 py-2.5 text-ink-400">{i + 1}</td>
                      {FIELDS.map((f) => {
                        const err = iss.errors[f.key], warn = iss.warnings[f.key];
                        const placeholder = f.key === "unit_code" && r.label ? `${prefix}-${r.label.toUpperCase()}` : "";
                        return (
                          <td key={f.key} className="px-1 py-1.5">
                            <input aria-label={`Row ${i + 1} ${f.label}`} aria-invalid={!!err} value={r[f.key]} placeholder={placeholder}
                              onChange={(e) => edit(i, f.key, e.target.value)}
                              className={`${f.width} h-9 rounded-md border px-2 outline-none focus:ring-2 focus:ring-pink-500/30 ${err ? "border-overdue bg-overdue/10" : warn ? "border-partial bg-partial/10" : "border-line"}`} />
                            {(err || warn) && <p className={`mt-0.5 ${f.width} text-[11px] leading-tight ${err ? "text-overdue" : "text-[#8a5c0f]"}`}>{err ?? warn}</p>}
                          </td>
                        );
                      })}
                      <td className="px-2 py-2">
                        <button type="button" aria-label={`Remove row ${i + 1}`} onClick={() => setRows((rs) => rs!.filter((_, j) => j !== i))} className="rounded-md p-1.5 text-ink-400 hover:bg-overdue/10 hover:text-overdue"><Trash size={16} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => setRows((rs) => [...rs!, emptyRow()])} className="btn btn-outline h-10 min-h-10"><Plus size={16} /> Add a row</button>
            <div className="flex items-center gap-3">
              {!!errorRows && <span className="flex items-center gap-1.5 text-sm text-overdue"><Warning size={16} weight="fill" /> Fix the red cells to continue</span>}
              <button type="button" onClick={submit} disabled={pending || !!errorRows || !rows.length} className="btn btn-primary disabled:opacity-50">
                {pending ? "Importing…" : `Import ${rows.length} units`}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
