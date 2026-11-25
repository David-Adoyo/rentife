/**
 * Illustrative product scenes used in place of photography until licensed images exist
 * ({{PHOTO_SOURCE}}) and real UI screenshots are available. All names and figures are
 * fictional demo values (masterplan §16: "Mwangaza Homes", "Sunrise Court").
 */
import type { ReactNode } from "react";
import {
  ArrowRight,
  Bell,
  CheckCircle,
  Drop,
  FileText,
  House,
  Lightning,
  LockSimple,
  Receipt,
  ShieldCheck,
  Wrench,
} from "@phosphor-icons/react/dist/ssr";
import { Money } from "./primitives";

export type SceneKind =
  | "ring"
  | "reminder"
  | "match"
  | "receipt"
  | "meter"
  | "deposit"
  | "tax"
  | "statement"
  | "feed"
  | "grid"
  | "flow"
  | "letter"
  | "tasks"
  | "audit";

export type SceneTone = "plum" | "pink" | "dusk" | "blush" | "night";

const tones: Record<SceneTone, string> = {
  plum: "bg-[radial-gradient(120%_90%_at_20%_10%,#7a2a70_0%,#4a2052_45%,#2a0f2e_100%)]",
  pink: "bg-[radial-gradient(120%_90%_at_80%_10%,#f28cc0_0%,#e94098_40%,#9c1f63_100%)]",
  dusk: "bg-[linear-gradient(160deg,#5e1957_0%,#b0236c_60%,#e94098_100%)]",
  blush: "bg-[radial-gradient(120%_100%_at_30%_0%,#fff_0%,#fce6f1_45%,#f1c9de_100%)]",
  night: "bg-[radial-gradient(100%_80%_at_50%_0%,#4a2052_0%,#1e0a21_100%)]",
};

export function Scene({
  kind,
  tone = "plum",
  className = "",
  label = true,
}: {
  kind: SceneKind;
  tone?: SceneTone;
  className?: string;
  label?: boolean;
}) {
  return (
    <div className={`relative isolate flex items-center justify-center overflow-hidden ${tones[tone]} ${className}`}>
      {/* soft orbit lines echo the logo's roofline */}
      <svg aria-hidden className="absolute inset-0 -z-10 h-full w-full opacity-30" viewBox="0 0 400 400" preserveAspectRatio="none">
        <circle cx="330" cy="60" r="160" fill="none" stroke="white" strokeOpacity=".35" />
        <circle cx="40" cy="380" r="200" fill="none" stroke="white" strokeOpacity=".2" />
      </svg>
      <div className="w-[min(86%,340px)]">{scenes[kind]()}</div>
      {label && (
        <span className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm mix-blend-luminosity">
          Illustration
        </span>
      )}
    </div>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-4 text-ink-900 shadow-float ${className}`}>{children}</div>;
}

function Pill({ tone, children }: { tone: "paid" | "partial" | "overdue" | "vacant" | "pink"; children: ReactNode }) {
  const map = {
    paid: "bg-paid/10 text-paid",
    partial: "bg-partial/15 text-[#8a5c0f]",
    overdue: "bg-overdue/10 text-overdue",
    vacant: "bg-vacant/15 text-[#5f5d55]",
    pink: "bg-pink-100 text-pink-700",
  } as const;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${map[tone]}`}>{children}</span>;
}

/** Collection Ring — the signature dashboard figure. */
export function CollectionRing({ pct, size = 148, stroke = 12 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${pct}% collected`}>
      <defs>
        <linearGradient id="ring-arc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e94098" />
          <stop offset="1" stopColor="#b0236c" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1e6ef" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#ring-arc)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ ["--ring-full" as string]: c, animation: "ring-fill 1.2s ease-out both" }}
      />
      <text x="50%" y="47%" textAnchor="middle" className="fill-plum-900 num" style={{ fontSize: size * 0.22, fontWeight: 500 }}>
        {pct}%
      </text>
      <text x="50%" y="63%" textAnchor="middle" className="fill-ink-600" style={{ fontSize: size * 0.085 }}>
        collected
      </text>
    </svg>
  );
}

const scenes: Record<SceneKind, () => ReactNode> = {
  ring: () => (
    <Card className="flex flex-col items-center p-5">
      <p className="self-start text-xs font-semibold text-ink-600">Sunrise Court · December</p>
      <div className="my-3">
        <CollectionRing pct={82} />
      </div>
      <p className="text-sm">
        <Money cents={124000000} /> <span className="text-ink-600">of</span> <Money cents={151200000} />
      </p>
    </Card>
  ),
  reminder: () => (
    <div className="space-y-2">
      <div className="ml-auto w-fit rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-plum-800">
        <Bell size={12} className="mr-1 inline" weight="fill" /> 3 days before due
      </div>
      <Card className="rounded-bl-md text-sm leading-relaxed">
        Hello Wanjiru, a friendly reminder that December rent for <b>B4</b> (<Money cents={1500000} />) is due on 5 Dec. Pay to your landlord&rsquo;s Paybill with account <b>SUN-B4</b>.
        <span className="mt-3 flex items-center justify-between rounded-xl bg-plum-800 px-3 py-2 text-xs font-semibold text-white">
          Pay now with M-Pesa <ArrowRight size={14} />
        </span>
      </Card>
    </div>
  ),
  match: () => (
    <Card className="space-y-3">
      <div className="flex items-center justify-between text-xs text-ink-600">
        <span>Payment received · 09:14</span>
        <Pill tone="pink">Learned</Pill>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-ink-600">From 0722 ••• 512</p>
          <p className="text-xs text-ink-400">Account entered: &ldquo;b 4&rdquo;</p>
        </div>
        <Money cents={1500000} className="text-xl" />
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-cream-100 p-2.5 text-sm">
        <CheckCircle size={18} weight="fill" className="text-paid" />
        Matched to <b>SUN-B4</b> · Wanjiru K.
      </div>
    </Card>
  ),
  receipt: () => (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between bg-plum-800 px-4 py-3 text-white">
        <span className="flex items-center gap-1.5 text-sm font-semibold"><House size={16} weight="fill" /> Receipt</span>
        <span className="num text-xs text-white/80">RCT-2026-000456</span>
      </div>
      <div className="flex items-center justify-between px-4 py-4">
        <div>
          <p className="text-xs text-ink-600">Received from Wanjiru K. · SUN-B4</p>
          <Money cents={1500000} className="mt-1 block text-3xl" />
          <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-paid">
            <ShieldCheck size={14} weight="fill" /> Verified by Rentife
          </p>
        </div>
        <QrMark />
      </div>
    </Card>
  ),
  meter: () => (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold"><Drop size={16} weight="fill" className="text-pink-700" /> Water · Unit A2</p>
        <Pill tone="paid">Confirmed</Pill>
      </div>
      <div className="grid grid-cols-[72px_1fr] gap-3">
        <div className="flex aspect-square items-center justify-center rounded-xl bg-[repeating-linear-gradient(45deg,#f1e6ef_0_6px,#fce6f1_6px_12px)] text-[10px] font-semibold text-plum-800">
          Meter photo
        </div>
        <div className="num text-sm">
          <p className="text-ink-600">Previous <b className="text-ink-900">1,284</b></p>
          <p className="text-ink-600">Current <b className="text-ink-900">1,296</b></p>
          <p className="mt-1 font-semibold">12 units used</p>
        </div>
      </div>
    </Card>
  ),
  deposit: () => (
    <Card>
      <p className="text-sm font-semibold">Move-in inspection · C1</p>
      <ul className="mt-3 space-y-2 text-sm">
        {["Living room walls", "Kitchen taps", "Bedroom window", "Bathroom tiles"].map((t, i) => (
          <li key={t} className="flex items-center justify-between">
            {t}
            <span className="flex items-center gap-2 text-xs text-ink-600">
              {i + 2} photos <CheckCircle size={16} weight="fill" className="text-paid" />
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 rounded-xl bg-cream-100 px-3 py-2 text-xs">Acknowledged by tenant · 24 Nov 2026</p>
    </Card>
  ),
  tax: () => (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-600">Tax centre · November</p>
      <p className="mt-2 text-sm text-ink-600">Gross residential rent received</p>
      <Money cents={124000000} className="text-3xl" />
      <div className="mt-3 flex items-center justify-between rounded-xl bg-pink-100 px-3 py-2 text-sm">
        <span>Due before the 20th</span>
        <span className="font-semibold text-pink-700">Export pack</span>
      </div>
      <p className="mt-2 text-[11px] text-ink-600">Information only. This is not tax advice.</p>
    </Card>
  ),
  statement: () => (
    <Card>
      <p className="text-sm font-semibold">Owner statement · November</p>
      <dl className="num mt-3 space-y-1.5 text-sm">
        {[
          ["Gross collected", 48600000],
          ["Commission", -4860000],
          ["Repairs (approved)", -1250000],
        ].map(([k, v]) => (
          <div key={k as string} className="flex justify-between">
            <dt className="text-ink-600">{k}</dt>
            <dd>{(v as number) < 0 ? "− " : ""}<Money cents={Math.abs(v as number)} /></dd>
          </div>
        ))}
        <div className="flex justify-between border-t border-line pt-2 font-semibold">
          <dt>Net remittance</dt>
          <dd><Money cents={42490000} /></dd>
        </div>
      </dl>
    </Card>
  ),
  feed: () => (
    <Card className="space-y-1 p-3">
      <p className="px-1 pb-1 text-xs font-semibold text-ink-600">Live payments</p>
      {[
        ["09:14", "SUN-B4", 1500000, "Auto"],
        ["09:02", "ACA-3C", 2200000, "Learned"],
        ["08:47", "BAR-G2", 950000, "Auto"],
      ].map(([t, u, a, m], i) => (
        <div key={u as string} className={`flex items-center justify-between rounded-xl px-2 py-2 text-sm ${i === 0 ? "bg-[linear-gradient(90deg,#fce6f1,#fff,#fce6f1)] bg-[length:200%_100%] [animation:shimmer_2s_ease-out_1]" : ""}`}>
          <span className="num text-xs text-ink-600">{t}</span>
          <span className="font-semibold">{u}</span>
          <Money cents={a as number} />
          <Pill tone={m === "Auto" ? "paid" : "pink"}>{m}</Pill>
        </div>
      ))}
    </Card>
  ),
  grid: () => {
    const s = ["paid", "paid", "partial", "paid", "overdue", "paid", "vacant", "paid", "paid", "paid", "partial", "paid"] as const;
    const col = { paid: "bg-paid", partial: "bg-partial", overdue: "bg-overdue", vacant: "bg-vacant/60" };
    return (
      <Card>
        <p className="text-sm font-semibold">Block B · 12 units</p>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {s.map((v, i) => (
            <div key={i} className={`flex aspect-square items-center justify-center rounded-lg text-[10px] font-semibold text-white ${col[v]}`}>
              B{i + 1}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Pill tone="paid">Paid</Pill>
          <Pill tone="partial">Part paid</Pill>
          <Pill tone="overdue">Overdue</Pill>
          <Pill tone="vacant">Vacant</Pill>
        </div>
      </Card>
    );
  },
  flow: () => (
    <div className="space-y-2">
      {[
        { icon: <House size={18} weight="fill" />, t: "Tenant pays with unit code" },
        { icon: <LockSimple size={18} weight="fill" />, t: "Straight into your own Paybill" },
        { icon: <Receipt size={18} weight="fill" />, t: "Rentife reads the confirmation" },
      ].map((s, i) => (
        <Card key={s.t} className={`flex items-center gap-3 py-3 ${i === 1 ? "ml-6" : i === 2 ? "ml-12" : ""}`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-700">{s.icon}</span>
          <span className="text-sm font-semibold">{s.t}</span>
        </Card>
      ))}
    </div>
  ),
  letter: () => (
    <Card className="relative">
      <FileText size={22} className="text-pink-700" weight="fill" />
      <p className="mt-2 font-semibold">Rent history letter</p>
      <p className="text-xs text-ink-600">Wanjiru K. · SUN-B4 · Jan–Nov 2026</p>
      <div className="mt-3 space-y-1.5">
        {[90, 75, 82, 60].map((w) => (
          <div key={w} className="h-1.5 rounded-full bg-cream-100" style={{ width: `${w}%` }} />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Pill tone="paid">11 of 11 months on time</Pill>
        <QrMark small />
      </div>
    </Card>
  ),
  audit: () => (
    <Card className="space-y-2">
      <p className="flex items-center gap-1.5 text-sm font-semibold"><ShieldCheck size={16} weight="fill" className="text-pink-700" /> Audit trail</p>
      {[
        ["10:02", "Manager", "Assigned payment to SUN-B4"],
        ["09:48", "Caretaker", "Confirmed water reading, A2"],
        ["09:14", "System", "Receipt RCT-2026-000456 sent"],
      ].map(([t, who, what]) => (
        <div key={t} className="grid grid-cols-[44px_1fr] gap-2 rounded-xl bg-cream-100 px-3 py-2 text-xs">
          <span className="num text-ink-600">{t}</span>
          <span><b>{who}</b> · {what}</span>
        </div>
      ))}
      <p className="flex items-center gap-1 text-[11px] text-ink-600"><LockSimple size={12} weight="fill" /> Entries can never be edited or deleted.</p>
    </Card>
  ),
  tasks: () => (
    <Card className="space-y-2">
      <p className="text-sm font-semibold">Caretaker · Today</p>
      {[
        { icon: <Drop size={16} />, t: "Water meter round · Block A", s: "8 of 12" },
        { icon: <Wrench size={16} />, t: "Leaking tap · B7", s: "Done" },
        { icon: <Lightning size={16} />, t: "Power token query · C3", s: "New" },
      ].map((r) => (
        <div key={r.t} className="flex items-center gap-2 rounded-xl bg-cream-100 px-3 py-2 text-sm">
          <span className="text-pink-700">{r.icon}</span>
          <span className="flex-1">{r.t}</span>
          <span className="text-xs font-semibold text-ink-600">{r.s}</span>
        </div>
      ))}
      <p className="text-[11px] text-ink-600">Caretakers never handle rent.</p>
    </Card>
  ),
};

function QrMark({ small = false }: { small?: boolean }) {
  // A decorative QR-like mark (not a real code).
  const cells = [1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1];
  return (
    <div aria-hidden className={`grid grid-cols-5 gap-[2px] rounded-md bg-white p-1 ring-1 ring-line ${small ? "h-9 w-9" : "h-14 w-14"}`}>
      {cells.map((c, i) => (
        <span key={i} className={c ? "rounded-[1px] bg-plum-900" : ""} />
      ))}
    </div>
  );
}
