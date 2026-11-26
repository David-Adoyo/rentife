import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DownloadSimple, MagnifyingGlass, SignOut } from "@phosphor-icons/react/dist/ssr";
import { adminDb } from "@/lib/admin/db";
import { requireAdmin } from "@/lib/admin/session";
import { signOut, signOutEverywhere } from "./actions";
import { LeadRow, type Lead } from "@/components/admin/LeadRow";

export const metadata: Metadata = { title: "Leads" };
export const dynamic = "force-dynamic";

const STATUSES = [
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "booked", label: "Setup booked" },
  { id: "closed", label: "Closed" },
] as const;

export default async function AdminLeads({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const admin = await requireAdmin();
  const { status = "", q = "" } = await searchParams;
  const filter = STATUSES.some((s) => s.id === status) ? status : "";
  const query = q.trim().slice(0, 100);
  const sql = adminDb();

  const [counts, leads] = await Promise.all([
    sql<{ status: string; n: number }[]>`select status, count(*)::int as n from rentife.leads group by status`,
    sql<Lead[]>`
      select id, name, phone, units, area, best_time, status, notes, created_at
      from rentife.leads
      where (${filter} = '' or status = ${filter})
        and (${query} = '' or name ilike ${"%" + query + "%"} or phone ilike ${"%" + query + "%"} or area ilike ${"%" + query + "%"})
      order by created_at desc
      limit 500`,
  ]);
  const count = (id: string) => counts.find((c) => c.status === id)?.n ?? 0;
  const total = counts.reduce((a, c) => a + c.n, 0);
  const href = (s: string) => `/admin?${new URLSearchParams({ ...(s && { status: s }), ...(query && { q: query }) })}`;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
          <Link href="/admin" className="flex items-center gap-2">
            <Image src="/brand/rentife-mark.png" alt="" width={491} height={502} className="h-7 w-auto" />
            <Image src="/brand/rentife-wordmark.png" alt="Rentife" width={409} height={101} className="hidden h-5 w-auto sm:block" />
            <span className="rounded-full bg-plum-800 px-2.5 py-0.5 text-xs font-semibold text-white">Admin</span>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-ink-600 md:inline">{admin.email}</span>
            <form action={signOutEverywhere}>
              <button className="hidden rounded-full px-3 py-2 text-ink-600 hover:bg-cream-100 md:block">Sign out everywhere</button>
            </form>
            <form action={signOut}>
              <button className="btn btn-outline h-10 min-h-10 px-4"><SignOut size={16} /> Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-pink-700">Book-a-setup requests</p>
            <h1 className="mt-1 text-4xl font-medium tracking-tight">Leads</h1>
          </div>
          <a href={`/admin/leads.csv?${new URLSearchParams({ ...(filter && { status: filter }), ...(query && { q: query }) })}`} className="btn btn-outline self-start">
            <DownloadSimple size={16} /> Export CSV
          </a>
        </div>

        <nav aria-label="Filter by status" className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[{ id: "", label: "All" }, ...STATUSES].map((s) => {
            const active = filter === s.id;
            return (
              <Link key={s.id || "all"} href={href(s.id)} aria-current={active ? "page" : undefined}
                className={`rounded-2xl p-4 transition-colors ${active ? "bg-plum-800 text-white" : "bg-white shadow-soft hover:bg-cream-50"}`}>
                <p className={`text-sm ${active ? "text-white/75" : "text-ink-600"}`}>{s.label}</p>
                <p className="num mt-1 text-3xl font-medium">{s.id ? count(s.id) : total}</p>
              </Link>
            );
          })}
        </nav>

        <form className="mt-6 flex gap-2" role="search">
          {filter && <input type="hidden" name="status" value={filter} />}
          <label htmlFor="q" className="sr-only">Search leads</label>
          <div className="relative flex-1">
            <MagnifyingGlass size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden />
            <input id="q" name="q" defaultValue={query} placeholder="Search by name, phone or area"
              className="h-12 w-full rounded-full border border-line bg-white pl-11 pr-4 outline-none focus:border-plum-800 focus:ring-2 focus:ring-pink-500/30" />
          </div>
          <button className="btn btn-primary">Search</button>
        </form>

        <section aria-label="Leads" className="mt-6 space-y-3">
          {leads.length === 0 ? (
            <div className="rounded-[2rem] bg-white p-12 text-center shadow-soft">
              <p className="text-xl font-medium">{total === 0 ? "No leads yet" : "No leads match"}</p>
              <p className="mt-2 text-ink-600">
                {total === 0 ? "Requests from the Book a free setup form will appear here." : "Try a different filter or search."}
              </p>
            </div>
          ) : (
            leads.map((lead) => <LeadRow key={lead.id} lead={lead} />)
          )}
        </section>
      </main>
    </>
  );
}
