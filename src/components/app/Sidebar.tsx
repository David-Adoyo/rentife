"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Buildings, ClockCounterClockwise, House, SignOut, UsersThree, IdentificationCard, Receipt } from "@phosphor-icons/react";

type Item = { href: string; label: string; icon: "home" | "properties" | "tenants" | "billing" | "team" | "activity" };
const icons = { home: House, properties: Buildings, tenants: IdentificationCard, billing: Receipt, team: UsersThree, activity: ClockCounterClockwise };

export function Sidebar({
  items, orgs, currentOrg, userLabel, roleLabel, switchOrg, signOut,
}: {
  items: Item[];
  orgs: { id: string; name: string }[];
  currentOrg: string;
  userLabel: string;
  roleLabel: string;
  switchOrg: (form: FormData) => Promise<void>;
  signOut: () => Promise<void>;
}) {
  const path = usePathname();
  const active = (href: string) => (href === "/app" ? path === "/app" : path.startsWith(href));
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-plum-900 text-white lg:flex">
        <Link href="/app" className="flex items-center gap-2 px-6 py-6">
          <Image src="/brand/rentife-mark-white.png" alt="" width={491} height={502} className="h-7 w-auto" />
          <Image src="/brand/rentife-wordmark-white.png" alt="Rentife" width={409} height={101} className="h-5 w-auto" />
        </Link>
        <OrgSwitcher orgs={orgs} currentOrg={currentOrg} switchOrg={switchOrg} />
        <nav aria-label="App" className="mt-4 flex-1 space-y-1 px-3">
          {items.map((i) => {
            const Icon = icons[i.icon];
            return (
              <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors ${active(i.href) ? "bg-white/12 text-white" : "text-white/70 hover:bg-white/8 hover:text-white"}`}>
                <Icon size={20} weight={active(i.href) ? "fill" : "regular"} aria-hidden /> {i.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-medium">{userLabel}</p>
          <p className="text-xs text-white/60">{roleLabel}</p>
          <form action={signOut}><button className="mt-3 flex items-center gap-2 text-sm text-white/70 hover:text-white"><SignOut size={16} /> Sign out</button></form>
        </div>
      </aside>

      {/* Mobile top bar + tab row */}
      <header className="sticky top-0 z-30 bg-plum-900 text-white lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/app" className="flex items-center gap-2">
            <Image src="/brand/rentife-mark-white.png" alt="" width={491} height={502} className="h-6 w-auto" />
            <span className="max-w-[45vw] truncate text-sm font-semibold">{orgs.find((o) => o.id === currentOrg)?.name}</span>
          </Link>
          <form action={signOut}><button className="flex items-center gap-1 text-sm text-white/80"><SignOut size={16} /> Sign out</button></form>
        </div>
        <nav aria-label="App" className="flex gap-1 overflow-x-auto px-2 pb-2">
          {items.map((i) => (
            <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm ${active(i.href) ? "bg-white text-plum-900" : "text-white/80"}`}>{i.label}</Link>
          ))}
        </nav>
      </header>
    </>
  );
}

function OrgSwitcher({ orgs, currentOrg, switchOrg }: { orgs: { id: string; name: string }[]; currentOrg: string; switchOrg: (f: FormData) => Promise<void> }) {
  if (orgs.length < 2) return <p className="mx-6 truncate rounded-xl bg-white/8 px-3 py-2 text-sm">{orgs[0]?.name}</p>;
  return (
    <form action={switchOrg} className="mx-6">
      <label htmlFor="org" className="sr-only">Organisation</label>
      <select id="org" name="org_id" defaultValue={currentOrg} onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white outline-none">
        {orgs.map((o) => <option key={o.id} value={o.id} className="text-ink-900">{o.name}</option>)}
      </select>
    </form>
  );
}
