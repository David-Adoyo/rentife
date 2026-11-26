"use client";

import { useState } from "react";
import { CheckCircle, SpinnerGap } from "@phosphor-icons/react";

type Errors = Partial<Record<"name" | "phone" | "units" | "area" | "time" | "form", string>>;

export function BookSetupForm() {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [errors, setErrors] = useState<Errors>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setErrors({});
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch("/api/book-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) {
        setErrors(body.errors ?? { form: "Something went wrong. Please try again." });
        setState("idle");
        return;
      }
      setState("done");
    } catch {
      setErrors({ form: "We couldn’t reach the server. Check your connection and try again." });
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="flex flex-col items-start justify-center rounded-[2.5rem] bg-white p-8 shadow-soft sm:p-12" role="status">
        <CheckCircle size={48} weight="fill" className="text-paid" aria-hidden />
        <h2 className="display-3 mt-5">Thank you, we’ve got your request</h2>
        <p className="mt-3 text-ink-600">We’ll be in touch at the time you chose to set up Rentife with you.</p>
      </div>
    );
  }

  const field = "mt-2 block h-12 w-full rounded-[6px] border border-line bg-white px-4 text-base outline-none focus:border-plum-800 focus:ring-2 focus:ring-pink-500/30";
  const Err = ({ k }: { k: keyof Errors }) =>
    errors[k] ? <p id={`${k}-error`} className="mt-1.5 text-sm text-overdue">{errors[k]}</p> : null;

  return (
    <form onSubmit={onSubmit} noValidate className="relative space-y-5 rounded-[2.5rem] bg-white p-6 shadow-soft sm:p-10">
      {/* Honeypot for bots: hidden from people and screen readers. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" tabIndex={-1} autoComplete="off" />
      </div>
      <div>
        <label htmlFor="name" className="font-medium">Your name</label>
        <input id="name" name="name" autoComplete="name" required className={field} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} />
        <Err k="name" />
      </div>
      <div>
        <label htmlFor="phone" className="font-medium">Phone number</label>
        <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0712 345 678" required className={field} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-error" : undefined} />
        <Err k="phone" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="units" className="font-medium">Number of units</label>
          <input id="units" name="units" type="number" inputMode="numeric" min={1} required className={field} aria-invalid={!!errors.units} aria-describedby={errors.units ? "units-error" : undefined} />
          <Err k="units" />
        </div>
        <div>
          <label htmlFor="area" className="font-medium">Area</label>
          <input id="area" name="area" placeholder="e.g. Kasarani" required className={field} aria-invalid={!!errors.area} aria-describedby={errors.area ? "area-error" : undefined} />
          <Err k="area" />
        </div>
      </div>
      <div>
        <label htmlFor="time" className="font-medium">Best time to call</label>
        <select id="time" name="time" required defaultValue="" className={field} aria-invalid={!!errors.time} aria-describedby={errors.time ? "time-error" : undefined}>
          <option value="" disabled>Choose a time</option>
          <option value="morning">Morning (8am – 12pm)</option>
          <option value="afternoon">Afternoon (12pm – 4pm)</option>
          <option value="evening">Evening (4pm – 7pm)</option>
        </select>
        <Err k="time" />
      </div>
      {errors.form && <p className="rounded-xl bg-overdue/10 px-4 py-3 text-sm text-overdue" role="alert">{errors.form}</p>}
      <button type="submit" disabled={state === "sending"} className="btn btn-primary w-full disabled:opacity-70">
        {state === "sending" ? <><SpinnerGap size={18} className="animate-spin" /> Sending…</> : "Book my free setup"}
      </button>
      <p className="text-xs text-ink-600">We’ll only use these details to arrange your setup.</p>
    </form>
  );
}
