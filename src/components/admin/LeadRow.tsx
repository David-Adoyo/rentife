"use client";

import { useActionState, useEffect, useState } from "react";
import { CaretDown, ChatCircleText, CheckCircle, Phone } from "@phosphor-icons/react";
import { updateLead, type FormState } from "@/app/admin/actions";

export type Lead = {
  id: string;
  name: string;
  phone: string;
  units: number;
  area: string;
  best_time: string;
  status: "new" | "contacted" | "booked" | "closed";
  notes: string;
  created_at: Date;
};

const statusStyle = {
  new: "bg-pink-100 text-pink-700",
  contacted: "bg-partial/15 text-[#8a5c0f]",
  booked: "bg-paid/10 text-paid",
  closed: "bg-vacant/15 text-[#5f5d55]",
} as const;
const statusLabel = { new: "New", contacted: "Contacted", booked: "Setup booked", closed: "Closed" } as const;
const timeLabel: Record<string, string> = { morning: "Morning (8–12)", afternoon: "Afternoon (12–4)", evening: "Evening (4–7)" };

const when = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d));

export function LeadRow({ lead }: { lead: Lead }) {
  const [open, setOpen] = useState(lead.status === "new");
  const [state, action, pending] = useActionState<FormState, FormData>(updateLead, undefined);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (state?.ok) {
      setSaved(true);
      const t = setTimeout(() => setSaved(false), 2500);
      return () => clearTimeout(t);
    }
  }, [state]);
  const wa = lead.phone.replace("+", "");

  return (
    <article className="overflow-hidden rounded-[1.5rem] bg-white shadow-soft">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className="grid w-full grid-cols-[1fr_auto] items-center gap-4 p-5 text-left sm:grid-cols-[1.4fr_1fr_0.7fr_1fr_auto] sm:p-6">
        <div>
          <p className="text-lg font-medium">{lead.name}</p>
          <p className="num text-sm text-ink-600">{lead.phone}</p>
        </div>
        <p className="hidden text-sm sm:block"><span className="text-ink-600">Area</span><br />{lead.area}</p>
        <p className="num hidden text-sm sm:block"><span className="text-ink-600">Units</span><br />{lead.units}</p>
        <p className="num hidden text-sm text-ink-600 sm:block">{when(lead.created_at)}</p>
        <span className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[lead.status]}`}>{statusLabel[lead.status]}</span>
          <CaretDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </span>
      </button>

      {open && (
        <div className="grid gap-6 border-t border-line bg-cream-50 p-5 sm:p-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-4">
            <dl className="num grid grid-cols-2 gap-3 text-sm sm:hidden">
              <div><dt className="text-ink-600">Area</dt><dd>{lead.area}</dd></div>
              <div><dt className="text-ink-600">Units</dt><dd>{lead.units}</dd></div>
              <div className="col-span-2"><dt className="text-ink-600">Received</dt><dd>{when(lead.created_at)}</dd></div>
            </dl>
            <p className="text-sm"><span className="text-ink-600">Best time to call:</span> {timeLabel[lead.best_time] ?? lead.best_time}</p>
            <div className="flex flex-wrap gap-2">
              <a href={`tel:${lead.phone}`} className="btn btn-primary"><Phone size={16} weight="fill" /> Call</a>
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline"><ChatCircleText size={16} /> WhatsApp</a>
            </div>
          </div>
          <form action={action} className="space-y-3">
            <input type="hidden" name="id" value={lead.id} />
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor={`status-${lead.id}`} className="text-sm font-medium">Status</label>
              <select id={`status-${lead.id}`} name="status" defaultValue={lead.status}
                className="h-11 rounded-full border border-line bg-white px-4 outline-none focus:border-plum-800">
                {Object.entries(statusLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={`notes-${lead.id}`} className="text-sm font-medium">Notes</label>
              <textarea id={`notes-${lead.id}`} name="notes" defaultValue={lead.notes} maxLength={2000} rows={3}
                placeholder="What did they say? When to follow up?"
                className="mt-1.5 block w-full rounded-xl border border-line bg-white p-3 outline-none focus:border-plum-800 focus:ring-2 focus:ring-pink-500/30" />
            </div>
            <div className="flex items-center gap-3">
              <button disabled={pending} className="btn btn-primary disabled:opacity-70">{pending ? "Saving…" : "Save"}</button>
              {saved && <span role="status" className="flex items-center gap-1 text-sm font-semibold text-paid"><CheckCircle size={18} weight="fill" /> Saved</span>}
              {state?.error && <span role="alert" className="text-sm text-overdue">{state.error}</span>}
            </div>
          </form>
        </div>
      )}
    </article>
  );
}
