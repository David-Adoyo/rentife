import Link from "next/link";
import { ArrowRight, CheckCircle, DeviceMobile, HandCoins, MapPin, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { Eyebrow, Money, SplitHeading, TextLink } from "@/components/primitives";
import { StoryCarousel, type Story } from "@/components/StoryCarousel";
import { CostCalculator } from "@/components/CostCalculator";
import { Faq, FinalCta, OvalTiles, StadiumCard, type Tile } from "@/components/Sections";
import { CollectionRing, Scene } from "@/components/Vignettes";

const stories: Story[] = [
  { tag: "Reminders", title: "Never chase rent", href: "/how-it-works#reminders", scene: "reminder", tone: "plum" },
  { tag: "Matching", title: "Smart matching", href: "/how-it-works#matching", scene: "match", tone: "pink" },
  { tag: "Receipts", title: "Instant receipts", href: "/how-it-works#receipts", scene: "receipt", tone: "dusk" },
  { tag: "Utilities", title: "Water and power billing", href: "/how-it-works#utilities", scene: "meter", tone: "blush" },
  { tag: "Deposits", title: "Deposits without disputes", href: "/how-it-works#deposits", scene: "deposit", tone: "plum" },
  { tag: "Tax", title: "Tax figure ready before the 20th", href: "/how-it-works#tax", scene: "tax", tone: "pink" },
];

const tiles: Tile[] = [
  { eyebrow: "Landlords", title: "Stop chasing rent", href: "/how-it-works", scene: "ring", tone: "pink", text: "Reminders go out on schedule and stop the moment a tenant pays." },
  { eyebrow: "Agents", title: "Owner statements and commission", href: "/for-agents", scene: "statement", tone: "plum", text: "Commission, expenses and net remittance per owner, every month." },
  { eyebrow: "Diaspora owners", title: "See every shilling from anywhere", href: "/for-diaspora-owners", scene: "feed", tone: "dusk", text: "Payment data straight from M-Pesa confirmations, not typed by an agent." },
  { eyebrow: "Caretakers", title: "Meter rounds and repairs, no cash", href: "/how-it-works#people", scene: "tasks", tone: "blush", text: "Caretakers never handle rent. Every action is logged." },
  { eyebrow: "Buildings", title: "Look down at your whole building", href: "/how-it-works", scene: "grid", tone: "plum", text: "Every unit as a tile: paid, part paid, overdue or vacant." },
  { eyebrow: "Security", title: "Your money never touches us", href: "/security", scene: "flow", tone: "pink", text: "Rent goes into your own Paybill, Till or bank. Rentife only reads confirmations." },
];

const trust = [
  { icon: HandCoins, t: "Your money never touches us" },
  { icon: CheckCircle, t: "Works with your existing Paybill or Till" },
  { icon: MapPin, t: "Built for Kenya" },
  { icon: DeviceMobile, t: "No app for tenants" },
];

const faqs = [
  { q: "Do I need a Paybill?", a: "Rentife works with your own M-Pesa Paybill, Till or bank account. Rent goes straight to you. If you don’t have API access, you can import your M-Pesa or bank statement instead, and we’ll guide you through getting a Paybill." },
  { q: "What if a tenant pays without the unit code?", a: "Rentife tries the phone numbers it has learned, then the payer’s name and the amount. Anything it isn’t sure about goes to a one-tap review queue, and it remembers your choice for next time." },
  { q: "Can my caretaker see the money?", a: "Caretakers see whether a unit has paid, with amounts hidden by default. They can log meter readings, repairs and inspections, but they can never record payments." },
  { q: "Is my data safe?", a: "Every organisation’s data is isolated at the database level, payment credentials are encrypted, and every action is written to an audit trail that cannot be edited." },
  { q: "Do tenants need to download an app?", a: "No. Tenants pay with M-Pesa as they do today, get receipts by SMS or WhatsApp, and can open a lightweight web portal with a one-time code. No password, no app." },
  { q: "What about tax?", a: "The tax centre shows the gross residential rent you received each month and the figure due, with reminders before the due date and an export pack. It is information, not tax advice." },
  { q: "Can I import my Excel?", a: "Yes. Upload your existing sheet of units and tenants, check the preview, and fix anything flagged before it goes live." },
  { q: "What happens if I stop paying for Rentife?", a: "Rent keeps flowing into your own account, because it never passed through us. Your records stay available to view and export." },
];

export default function Home() {
  return (
    <>
      {/* 1 — Hero panel (rounded media block under the floating nav) */}
      <div className="px-2 pt-2 sm:px-4 sm:pt-4">
        <div className="relative isolate overflow-hidden rounded-b-[3rem] rounded-t-[2rem] bg-[radial-gradient(120%_100%_at_15%_0%,#7a2a70_0%,#4a2052_40%,#2a0f2e_100%)] pt-28 sm:rounded-b-[7rem] sm:pt-32">
          <svg aria-hidden className="absolute inset-0 -z-10 h-full w-full" viewBox="0 0 1400 700" preserveAspectRatio="xMidYMid slice">
            <path d="M200 520 L700 140 L1200 520" fill="none" stroke="#e94098" strokeOpacity=".35" strokeWidth="2" />
            <circle cx="1180" cy="120" r="260" fill="none" stroke="#fff" strokeOpacity=".08" />
            <circle cx="140" cy="640" r="300" fill="none" stroke="#fff" strokeOpacity=".06" />
          </svg>
          <HeroVisual />
        </div>
      </div>

      <section className="container-x pt-14 sm:pt-20">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:gap-16">
          <h1 className="display-1 text-balance">Rent that collects itself.</h1>
          <div className="lg:pb-3">
            <p className="text-lg leading-relaxed text-ink-600">
              Automatic M-Pesa matching, instant receipts and polite reminders for Kenyan landlords. Your money goes straight to your own Paybill.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/book-setup" className="btn btn-primary">
                Book a free setup <ArrowRight size={16} weight="bold" />
              </Link>
              <Link href="/how-it-works" className="btn btn-outline">
                See how it works
              </Link>
            </div>
          </div>
        </div>

        {/* 2 — Trust strip */}
        <ul className="mt-14 grid grid-cols-1 gap-3 border-y border-line py-6 sm:grid-cols-2 lg:grid-cols-4">
          {trust.map(({ icon: Icon, t }) => (
            <li key={t} className="flex items-center gap-3 font-medium">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 text-pink-700">
                <Icon size={20} weight="fill" aria-hidden />
              </span>
              {t}
            </li>
          ))}
        </ul>
      </section>

      {/* 3 — Feature story carousel */}
      <div className="pt-16 sm:pt-24">
        <StoryCarousel stories={stories} />
      </div>

      {/* 4 — Who it's for: zig-zag oval tiles */}
      <section id="features" className="container-x scroll-mt-28 pt-24 sm:pt-36">
        <Eyebrow>Built for everyone in the building</Eyebrow>
        <h2 className="mt-4 max-w-4xl text-[clamp(2.75rem,7vw,6rem)] font-medium leading-[0.98] tracking-[-0.035em] text-balance">
          Every shilling matched, receipted and recorded
        </h2>
        <p className="mt-6 max-w-xl text-lg text-ink-600">One calm system for landlords, agents, caretakers, tenants and owners abroad.</p>
        <div className="mt-16 sm:mt-24">
          <OvalTiles tiles={tiles} />
        </div>
      </section>

      {/* 5 — Raised container: before/after, how it works, stadium cards */}
      <section className="px-2 pt-24 sm:px-4 sm:pt-36">
        <div className="rounded-[3rem] bg-cream-50 py-16 sm:rounded-[4rem] sm:py-24">
          <div className="container-x">
            <Eyebrow>The 1st of the month, before and after</Eyebrow>
            <h2 className="mt-4 max-w-3xl text-[clamp(2.75rem,7vw,6rem)] font-medium leading-[0.98] tracking-[-0.035em] text-balance">
              You never chase rent again
            </h2>
            <p className="mt-6 max-w-xl text-lg text-ink-600">
              No more first week of calls, WhatsApps and notebooks. Rentife reminds, matches, receipts and records, so the 1st of the month is just another day.
            </p>
            <Link href="/how-it-works" className="btn btn-primary mt-8">
              See how it works
            </Link>

            <BeforeAfter />

            <ol className="mt-20 grid gap-4 md:grid-cols-3">
              {[
                ["Tenant pays with their unit code", "Into your own Paybill or Till, from any phone."],
                ["Rentife matches and receipts", "The payment lands on the right unit and the tenant gets a numbered receipt."],
                ["You see everything", "Collection rate, arrears and your tax figure, always up to date."],
              ].map(([t, d], i) => (
                <li key={t} className="rounded-[2rem] border border-line bg-white p-7">
                  <span className="num flex h-10 w-10 items-center justify-center rounded-full bg-plum-800 text-sm font-semibold text-white">{i + 1}</span>
                  <p className="mt-5 text-xl font-medium">{t}</p>
                  <p className="mt-2 text-ink-600">{d}</p>
                </li>
              ))}
            </ol>

            <div className="mt-16 space-y-6">
              <StadiumCard
                title="Your money never touches us"
                text="Rent goes straight into your own Paybill, Till or bank. Rentife only reads the confirmations, so every shilling is yours from the first second."
                href="/security"
                cta="How money flows"
                scene="flow"
                tone="dusk"
              />
              <StadiumCard
                flip
                title="Tenants love it too"
                text="An instant receipt for every payment, a rent history letter for loans and visas, and repairs they can report and track. No app to download."
                href="/how-it-works#people"
                cta="What tenants get"
                scene="letter"
                tone="blush"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 6 — Cost of chasing calculator */}
      <section className="container-x pt-24 sm:pt-36">
        <SplitHeading eyebrow="The cost of chasing" title="What late rent is costing you">
          Move the sliders to match your buildings. Everything is worked out from your own numbers.
        </SplitHeading>
        <div className="mt-12">
          <CostCalculator />
        </div>
      </section>

      {/* 7 — Big media panel: see it in action */}
      <section className="container-x pt-24 sm:pt-36">
        <SplitHeading eyebrow="See it in action" title="Watch a month collect itself">
          From the first reminder to the last receipt, one screen tells you where every unit stands.
          <div className="mt-6">
            <Link href="/book-setup" className="btn btn-outline">
              Book a free setup <ArrowRight size={16} />
            </Link>
          </div>
        </SplitHeading>
        <AllPaidPanel />
      </section>

      {/* 8 — For agents and diaspora owners */}
      <section className="container-x pt-24 sm:pt-36">
        <div className="grid gap-6 md:grid-cols-2">
          <Link href="/for-agents" className="group relative overflow-hidden rounded-[2.5rem] bg-plum-800 p-8 text-white sm:p-12">
            <Eyebrow tone="light">For agents and property managers</Eyebrow>
            <p className="display-3 mt-4 max-w-sm">Many owners, one calm desk</p>
            <p className="mt-3 max-w-sm text-white/80">Owner portfolios, automatic commission, polished statements and an audit trail.</p>
            <span className="mt-8 inline-flex items-center gap-2 font-semibold">Rentife for agents <ArrowRight className="transition-transform group-hover:translate-x-1" /></span>
          </Link>
          <Link href="/for-diaspora-owners" className="group relative overflow-hidden rounded-[2.5rem] bg-pink-100 p-8 sm:p-12">
            <Eyebrow>For diaspora owners</Eyebrow>
            <p className="display-3 mt-4 max-w-sm">See every shilling from anywhere</p>
            <p className="mt-3 max-w-sm text-ink-600">A real-time owner dashboard and a monthly statement, wherever you live.</p>
            <span className="mt-8 inline-flex items-center gap-2 font-semibold text-pink-700">Rentife for diaspora owners <ArrowRight className="transition-transform group-hover:translate-x-1" /></span>
          </Link>
        </div>
      </section>

      {/* 9 — Security */}
      <section className="container-x pt-24 sm:pt-36">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <Scene kind="audit" tone="plum" className="aspect-square rounded-full" />
          <div>
            <Eyebrow>Security and trust</Eyebrow>
            <h2 className="display-2 mt-4 text-balance">Built like a bank statement, not a spreadsheet</h2>
            <ul className="mt-8 space-y-4 text-lg">
              {[
                "Rent goes to your own account. Rentife never holds it.",
                "Every organisation’s data is isolated at the database level.",
                "Payment credentials are encrypted and never shown in the browser.",
                "An audit trail records who did what, and it cannot be edited.",
              ].map((p) => (
                <li key={p} className="flex gap-3">
                  <ShieldCheck size={24} weight="fill" className="mt-0.5 shrink-0 text-pink-700" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <TextLink href="/security">Read about security</TextLink>
            </div>
          </div>
        </div>
      </section>

      {/* 10 — Testimonials: hidden until real ones exist ({{TESTIMONIALS}}). */}

      {/* 11 — Pricing teaser + FAQ */}
      <section id="faq" className="container-x scroll-mt-28 pt-24 sm:pt-36">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
          <div>
            <Eyebrow>Pricing and questions</Eyebrow>
            <h2 className="display-2 mt-4">Questions landlords ask</h2>
            <div className="mt-8 rounded-[2rem] bg-white p-7 shadow-soft">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-600">Pricing</p>
              <p className="mt-2 text-2xl font-medium">Per occupied unit, per month</p>
              <p className="mt-2 text-ink-600">Free until your first payment is matched automatically.</p>
              <div className="mt-5">
                <TextLink href="/pricing">See pricing</TextLink>
              </div>
            </div>
          </div>
          <Faq items={faqs} />
        </div>
      </section>

      {/* 12 — Final CTA */}
      <FinalCta />
    </>
  );
}

function HeroVisual() {
  return (
    <div className="container-x relative flex min-h-[440px] items-end justify-center gap-6 pb-16 sm:min-h-[520px] sm:pb-24">
      <span className="absolute left-6 top-0 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/90 sm:left-12">
        Illustration · demo data
      </span>
      {/* Laptop-style dashboard card */}
      <div className="hidden w-[560px] rounded-[1.75rem] bg-white p-6 shadow-float md:block">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-ink-600">Mwangaza Homes · December</p>
            <p className="mt-0.5 text-xl font-medium">Good morning</p>
          </div>
          <span className="rounded-full bg-paid/10 px-3 py-1 text-xs font-semibold text-paid">3 new payments</span>
        </div>
        <div className="mt-5 grid grid-cols-[auto_1fr] items-center gap-6">
          <CollectionRing pct={82} size={168} stroke={14} />
          <dl className="num space-y-3 text-sm">
            <div className="flex justify-between border-b border-line pb-2"><dt className="text-ink-600">Collected</dt><dd><Money cents={124000000} /></dd></div>
            <div className="flex justify-between border-b border-line pb-2"><dt className="text-ink-600">Expected</dt><dd><Money cents={151200000} /></dd></div>
            <div className="flex justify-between border-b border-line pb-2"><dt className="text-ink-600">Auto-matched</dt><dd className="font-medium">57 of 61</dd></div>
            <div className="flex justify-between"><dt className="text-ink-600">Waiting for review</dt><dd className="font-medium text-pink-700">4</dd></div>
          </dl>
        </div>
      </div>
      {/* Phone with an M-Pesa style confirmation and a Rentife receipt */}
      <div className="w-[260px] shrink-0 rounded-[2.5rem] border-[6px] border-plum-950 bg-cream-100 p-3 shadow-float sm:w-[280px]">
        <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-plum-950/80" />
        <div className="rounded-2xl rounded-bl-md bg-white p-3 text-[12.5px] leading-snug text-ink-900 shadow-soft">
          <b>Confirmed.</b> <Money cents={1500000} /> sent to Sunrise Court for account SUN-B4 on 3/12/26 at 9:14 AM.
        </div>
        <div className="mt-2 overflow-hidden rounded-2xl bg-white shadow-soft">
          <div className="flex items-center justify-between bg-plum-800 px-3 py-2 text-white">
            <span className="text-xs font-semibold">Rentife receipt</span>
            <span className="num text-[10px] text-white/75">RCT-2026-000456</span>
          </div>
          <div className="px-3 py-3">
            <p className="text-[11px] text-ink-600">Wanjiru K. · SUN-B4 · December rent</p>
            <Money cents={1500000} className="mt-1 block text-2xl" />
            <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-paid">
              <ShieldCheck size={13} weight="fill" /> Verified by Rentife
            </p>
          </div>
        </div>
        <div className="mt-2 rounded-2xl bg-white p-3 text-[12px] text-ink-600 shadow-soft">Balance for December: <b className="text-paid">Fully paid</b></div>
      </div>
    </div>
  );
}

function BeforeAfter() {
  return (
    <div className="mt-16 grid overflow-hidden rounded-[2.5rem] border border-line md:grid-cols-2">
      <div className="bg-white p-8 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-overdue">Before</p>
        <ul className="mt-5 space-y-3 text-lg text-ink-600">
          {["Calling and WhatsApping tenants all week", "Scrolling M-Pesa messages against a notebook", "“I paid from my wife’s phone”", "Writing receipts by hand", "Guessing your monthly tax figure"].map((t) => (
            <li key={t} className="flex gap-3"><span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-400" />{t}</li>
          ))}
        </ul>
      </div>
      <div className="bg-plum-800 p-8 text-white sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-pink-500">After</p>
        <ul className="mt-5 space-y-3 text-lg">
          {["Polite reminders go out on schedule", "Every payment matched to the right unit", "Rentife learns that phone for next time", "Numbered receipts sent instantly", "Tax figure ready before the 20th"].map((t) => (
            <li key={t} className="flex gap-3"><CheckCircle size={22} weight="fill" className="mt-0.5 shrink-0 text-pink-500" aria-hidden />{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AllPaidPanel() {
  const units = ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4", "C1", "C2", "C3", "C4"];
  return (
    <div className="mt-12 overflow-hidden rounded-[2.5rem] bg-[radial-gradient(100%_100%_at_0%_0%,#fce6f1_0%,#f1e6ef_50%,#dcc6d8_100%)] p-4 sm:p-10">
      <div className="mx-auto max-w-4xl rounded-[1.75rem] bg-white p-6 shadow-float sm:p-8">
        <div className="relative overflow-hidden rounded-2xl bg-plum-800 px-5 py-4 text-white">
          <p className="font-medium">Every unit at Sunrise Court has paid for December</p>
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-[linear-gradient(90deg,transparent,#e94098,transparent)] bg-[length:200%_100%] [animation:shimmer_2.4s_ease-out_1]" />
        </div>
        <div className="mt-6 grid items-center gap-8 sm:grid-cols-[auto_1fr]">
          <CollectionRing pct={100} size={176} stroke={14} />
          <div>
            <p className="text-sm font-semibold text-ink-600">Sunrise Court, Kasarani · 12 units</p>
            <div className="mt-3 grid grid-cols-6 gap-2">
              {units.map((u) => (
                <div key={u} className="flex aspect-square items-center justify-center rounded-lg bg-paid text-xs font-semibold text-white">{u}</div>
              ))}
            </div>
            <p className="mt-4 text-sm text-ink-600">Illustration with demo data. A product demo video will appear here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
