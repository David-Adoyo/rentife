"use client";

import { useId, useState } from "react";
import { PRICE_PER_UNIT_KES, placeholders } from "@/content/site";

/**
 * "Cost of chasing" calculator (masterplan §9.2 item 6). Every figure is derived from
 * the visitor's own inputs; nothing here is a statistic about Rentife customers.
 */
export function CostCalculator() {
  const [units, setUnits] = useState(12);
  const [rent, setRent] = useState(15000);
  const [latePct, setLatePct] = useState(25);
  const [minutes, setMinutes] = useState(30);

  const lateTenants = Math.round((units * latePct) / 100);
  const atRisk = lateTenants * rent;
  const hours = (lateTenants * minutes) / 60;
  const cost = PRICE_PER_UNIT_KES === null ? null : PRICE_PER_UNIT_KES * units;
  const ksh = (n: number) => n.toLocaleString("en-KE", { maximumFractionDigits: 0 });

  return (
    <div className="grid overflow-hidden rounded-[2.5rem] bg-white shadow-soft lg:grid-cols-2">
      <form className="space-y-7 p-6 sm:p-10" onSubmit={(e) => e.preventDefault()} aria-label="Cost of chasing inputs">
        <Slider label="Units you manage" value={units} min={1} max={500} step={1} onChange={setUnits} format={(v) => `${v}`} />
        <Slider label="Average monthly rent" value={rent} min={2000} max={150000} step={500} onChange={setRent} format={(v) => `KSh ${ksh(v)}`} />
        <Slider label="Tenants paying late each month" value={latePct} min={0} max={100} step={1} onChange={setLatePct} format={(v) => `${v}%`} />
        <Slider label="Minutes you spend chasing each late tenant" value={minutes} min={5} max={180} step={5} onChange={setMinutes} format={(v) => `${v} min`} />
      </form>
      <div className="flex flex-col justify-between gap-8 bg-plum-800 p-6 text-white sm:p-10" aria-live="polite">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">Rent at risk each month</p>
          <p className="num mt-2 text-5xl font-medium tracking-tight sm:text-6xl">
            <span className="mr-2 text-2xl text-white/70">KSh</span>
            {ksh(atRisk)}
          </p>
          <p className="mt-2 text-white/75">
            {lateTenants} of {units} tenants paying late.
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-6 border-t border-white/20 pt-6">
          <div>
            <dt className="text-sm text-white/70">Hours chasing each month</dt>
            <dd className="num mt-1 text-3xl font-medium">{hours.toLocaleString("en-KE", { maximumFractionDigits: 1 })}</dd>
          </div>
          <div>
            <dt className="text-sm text-white/70">Rentife each month</dt>
            <dd className="num mt-1 text-3xl font-medium">
              {cost === null ? <span className="placeholder text-base">{placeholders.PRICE_PER_UNIT} × {units}</span> : `KSh ${ksh(cost)}`}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-white/60">Based only on the numbers you enter. Pricing is per occupied unit per month and free until your first payment is matched.</p>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="font-medium">{label}</label>
        <output htmlFor={id} className="num text-lg font-semibold text-plum-800">{format(value)}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range mt-3"
        style={{ ["--p" as string]: `${pct}%` }}
      />
    </div>
  );
}
