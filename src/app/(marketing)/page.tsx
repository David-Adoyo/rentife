import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle, DeviceMobile, HandCoins, MapPin, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { plans } from "@/content/pricing";
import { Eyebrow, Money, SplitHeading } from "@/components/primitives";
import { StoryCarousel, type Story } from "@/components/StoryCarousel";
import { FinalCta, OvalTiles, StadiumCard, type Tile } from "@/components/Sections";
import { CollectionRing } from "@/components/Vignettes";

const stories: Story[] = [
  { tag: "Reminders", title: "Never chase rent", href: "/how-it-works#reminders", scene: "reminder", tone: "plum", photo: "/people/property-kasarani.webp", position: "50% 55%", place: "Kasarani · Apartment block" },
  { tag: "Matching", title: "Smart matching", href: "/how-it-works#matching", scene: "match", tone: "pink", photo: "/people/property-ruaka.webp", position: "50% 45%", place: "Ruaka · Residential towers" },
  { tag: "Receipts", title: "Instant receipts", href: "/how-it-works#receipts", scene: "receipt", tone: "dusk", photo: "/people/property-rongai.webp", position: "50% 55%", place: "Rongai · Bedsitters" },
  { tag: "Utilities", title: "Water and power billing", href: "/how-it-works#utilities", scene: "meter", tone: "blush", photo: "/people/property-kilimani.webp", position: "50% 50%", place: "Kilimani · Metered apartments" },
  { tag: "Deposits", title: "Deposits without disputes", href: "/how-it-works#deposits", scene: "deposit", tone: "plum", photo: "/people/property-southb.webp", position: "50% 55%", place: "South B · Maisonettes" },
  { tag: "Tax", title: "Tax figure ready before the 20th", href: "/how-it-works#tax", scene: "tax", tone: "pink", photo: "/people/property-westlands.webp", position: "50% 50%", place: "Westlands · Shops and flats" },
];

const tiles: Tile[] = [
  { eyebrow: "Landlords", title: "Stop chasing rent", href: "/for-landlords", scene: "ring", tone: "pink", photo: "/people/tile-landlord.webp", position: "50% 30%", text: "Reminders go out on schedule and stop the moment a tenant pays." },
  { eyebrow: "Agents", title: "Owner statements and commission", href: "/for-agents", scene: "statement", tone: "plum", photo: "/people/tile-agent.webp", position: "50% 25%", text: "Commission, expenses and net remittance per owner, every month." },
  { eyebrow: "Diaspora owners", title: "See every shilling from anywhere", href: "/for-diaspora-owners", scene: "feed", tone: "dusk", photo: "/people/tile-diaspora.webp", position: "45% 30%", text: "Payment data straight from M-Pesa confirmations, not typed by an agent." },
  { eyebrow: "Security", title: "Your money never touches us", href: "/security", scene: "flow", tone: "pink", photo: "/people/tile-security.webp", position: "50% 30%", text: "Rent goes into your own Paybill, Till or bank. Rentife only reads confirmations." },
];

const trust = [
  { icon: HandCoins, t: "Your money never touches us" },
  { icon: CheckCircle, t: "Works with your existing Paybill or Till" },
  { icon: MapPin, t: "Built for Kenya" },
  { icon: DeviceMobile, t: "No app for tenants" },
];


export default function Home() {
  return (
    <>
      {/* 1 — Hero panel (rounded media block under the floating nav) */}
      <div className="px-2 pt-2 sm:px-4 sm:pt-4">
        <div className="relative isolate overflow-hidden rounded-b-[3rem] rounded-t-[2rem] bg-plum-900 pt-28 sm:rounded-b-[7rem] sm:pt-32">
          <Image
            src="/people/hero.webp"
            alt="A Kenyan landlady walking through the courtyard of her apartment block at dusk, checking her phone"
            fill
            priority
            sizes="100vw"
            className="-z-20 object-cover object-[22%_center] sm:object-[30%_center]"
          />
          {/* Fade the sky side into plum so the product cards sit on a calm field. */}
          <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(42,15,46,0)_20%,rgba(42,15,46,.35)_60%,rgba(42,15,46,.7)_100%),linear-gradient(180deg,rgba(42,15,46,.25)_0%,rgba(42,15,46,0)_30%,rgba(42,15,46,.45)_100%)]" />
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
      <section className="container-x pt-24 sm:pt-36">
        <Eyebrow>Built for everyone in the building</Eyebrow>
        <h2 className="mt-4 max-w-4xl text-[clamp(2.75rem,7vw,6rem)] font-medium leading-[0.98] tracking-[-0.035em] text-balance">
          Every shilling matched, receipted and recorded
        </h2>
        <p className="mt-6 max-w-xl text-lg text-ink-600">One calm system for landlords, agents, caretakers, tenants and owners abroad.</p>
        <div className="mt-16 sm:mt-24">
          <OvalTiles tiles={tiles} />
        </div>
      </section>

      {/* 5 — Raised container: the promise in three steps, plus the trust card */}
      <section className="px-2 pt-24 sm:px-4 sm:pt-36">
        <div className="rounded-[3rem] bg-cream-50 py-16 sm:rounded-[4rem] sm:py-24">
          <div className="container-x">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-4 max-w-3xl text-[clamp(2.75rem,7vw,6rem)] font-medium leading-[0.98] tracking-[-0.035em] text-balance">
              You never chase rent again
            </h2>
            <ol className="mt-14 grid gap-4 md:grid-cols-3">
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
            <div className="mt-6">
              <StadiumCard
                title="Rent goes straight to you"
                text="Tenants pay into your own Paybill, Till or bank. Rentife only reads the confirmations, so every shilling is yours from the first second."
                href="/how-it-works"
                cta="See how it works"
                scene="flow"
                tone="dusk"
                photo="/people/card-money.webp"
                position="40% 40%"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 6 — Pricing at a glance */}
      <section className="container-x pt-24 sm:pt-36">
        <SplitHeading eyebrow="Pricing" title="Pay only for occupied units">
          Free until your first payment is matched automatically. Vacant units cost nothing.
          <div className="mt-6">
            <Link href="/pricing" className="btn btn-outline">
              See pricing <ArrowRight size={16} />
            </Link>
          </div>
        </SplitHeading>
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {plans.map((p) => (
            <Link key={p.id} href="/pricing" className={`group rounded-[2rem] p-7 transition-colors ${p.id === "growth" ? "bg-plum-800 text-white" : "bg-white shadow-soft hover:bg-cream-50"}`}>
              <p className={`text-sm font-bold uppercase tracking-[0.12em] ${p.id === "growth" ? "text-pink-500" : "text-pink-700"}`}>{p.name}</p>
              <p className="num mt-3 flex items-baseline gap-1.5">
                <span className={`text-base ${p.id === "growth" ? "text-white/70" : "text-ink-600"}`}>KSh</span>
                <span className="text-5xl font-medium tracking-tight">{p.perUnit}</span>
                <span className={`text-sm ${p.id === "growth" ? "text-white/70" : "text-ink-600"}`}>/ unit / month</span>
              </p>
              <p className={`mt-3 ${p.id === "growth" ? "text-white/85" : "text-ink-600"}`}>{p.for}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Testimonials: hidden until real ones exist ({{TESTIMONIALS}}). */}

      {/* 12 — Final CTA */}
      <FinalCta />
    </>
  );
}

function HeroVisual() {
  return (
    <div className="container-x relative flex min-h-[460px] items-end justify-end gap-5 pb-10 sm:min-h-[560px] sm:justify-center sm:pb-20 lg:justify-end">
      {/* Laptop-style dashboard card */}
      <div className="hidden w-[480px] rounded-[1.75rem] bg-white/95 p-6 shadow-float backdrop-blur md:block">
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
      <div className="w-[260px] shrink-0 origin-bottom-right rounded-[2.5rem] border-[6px] border-plum-950 bg-cream-100 p-3 shadow-float max-sm:-mr-2 max-sm:scale-[0.72] sm:w-[280px]">
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
