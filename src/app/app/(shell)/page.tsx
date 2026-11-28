import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle, Circle } from "@phosphor-icons/react/dist/ssr";
import { appContext } from "@/lib/app/context";
import { Card, PageHeader } from "@/components/app/ui";
import { ksh } from "@/lib/money";

export const metadata: Metadata = { title: "Home" };

const tile = { occupied: "bg-paid text-white", vacant: "bg-vacant/30 text-ink-900", notice: "bg-partial text-white", maintenance: "bg-overdue text-white" } as const;

export default async function Home() {
  const { supabase, org, can, role } = await appContext();
  const [{ data: board }, { count: tenantCount }, { count: memberCount }] = await Promise.all([
    supabase.from("unit_board").select("id, property_id, property_name, label, unit_code, status, rent_amount").eq("org_id", org.id).order("property_name").order("label"),
    can.seeTenants ? supabase.from("tenants").select("id", { count: "exact", head: true }).eq("org_id", org.id).is("archived_at", null) : Promise.resolve({ count: null }),
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("org_id", org.id),
  ]);
  const units = board ?? [];
  const occupied = units.filter((u) => u.status === "occupied" || u.status === "notice").length;
  const expected = units.filter((u) => u.status === "occupied" || u.status === "notice").reduce((s, u) => s + (u.rent_amount ?? 0), 0);
  const byProperty = Object.values(units.reduce<Record<string, { id: string; name: string; units: typeof units }>>((acc, u) => {
    (acc[u.property_id] ??= { id: u.property_id, name: u.property_name, units: [] }).units.push(u);
    return acc;
  }, {}));

  const steps = [
    { done: byProperty.length > 0, label: "Add your first property", href: "/app/properties" },
    { done: units.length > 0, label: "Add units", href: byProperty[0] ? `/app/properties/${byProperty[0].id}` : "/app/properties" },
    { done: (tenantCount ?? 0) > 0, label: "Add tenants and move them in", href: "/app/tenants" },
    { done: (memberCount ?? 0) > 1, label: "Invite your caretaker or team", href: "/app/team" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={org.name} title="Home" />

      {can.edit && !org.onboarding_completed_at && (
        <Link href={`/app/onboarding?step=${org.onboarding_step}`} className="flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] bg-plum-800 p-6 text-white shadow-soft">
          <span><span className="block text-lg font-medium">Finish setting up Rentife</span><span className="text-white/80">Step {org.onboarding_step} of 7 · live in under an hour</span></span>
          <span className="btn btn-light">Continue set-up <ArrowRight size={16} /></span>
        </Link>
      )}

      {can.edit && org.onboarding_completed_at && steps.some((s) => !s.done) && (
        <Card>
          <p className="font-medium">Getting started</p>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {steps.map((s) => (
              <li key={s.label}>
                <Link href={s.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-cream-100">
                  {s.done ? <CheckCircle size={22} weight="fill" className="text-paid" /> : <Circle size={22} className="text-ink-400" />}
                  <span className={s.done ? "text-ink-600 line-through" : "font-medium"}>{s.label}</span>
                  {!s.done && <ArrowRight size={16} className="ml-auto text-pink-700" />}
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          ["Properties", byProperty.length],
          ["Units", units.length],
          ["Occupied", units.length ? `${occupied} (${Math.round((occupied / units.length) * 100)}%)` : "0"],
          can.seeMoney ? ["Monthly rent roll", ksh(expected)] : ["Vacant", units.length - occupied],
        ].map(([k, v]) => (
          <Card key={k as string} className="p-4 sm:p-6"><p className="text-sm text-ink-600">{k}</p><p className="num mt-1 text-2xl font-medium sm:text-3xl">{v}</p></Card>
        ))}
      </div>

      <section aria-label="Unit board" className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-medium">Your buildings</h2>
          <p className="flex flex-wrap gap-3 text-xs text-ink-600">
            {Object.entries(tile).map(([k, c]) => <span key={k} className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded ${c}`} />{k[0].toUpperCase() + k.slice(1)}</span>)}
          </p>
        </div>
        {byProperty.length === 0 && <p className="text-ink-600">No properties yet{role === "caretaker" ? " assigned to you" : ""}.</p>}
        {byProperty.map((p) => (
          <Card key={p.id}>
            <Link href={`/app/properties/${p.id}`} className="flex items-center justify-between font-medium hover:text-pink-700">
              {p.name} <span className="text-sm text-ink-600">{p.units.length} {p.units.length === 1 ? "unit" : "units"}</span>
            </Link>
            <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2">
              {p.units.map((u) => (
                <div key={u.id} title={`${u.unit_code} · ${u.status}`} className={`flex aspect-square flex-col items-center justify-center rounded-xl text-xs font-semibold ${tile[u.status as keyof typeof tile]}`}>
                  {u.label}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
