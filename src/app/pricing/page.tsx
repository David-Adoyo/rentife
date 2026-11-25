import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { Eyebrow, Placeholder, SplitHeading } from "@/components/primitives";
import { CostCalculator } from "@/components/CostCalculator";
import { Faq, FinalCta } from "@/components/Sections";
import { placeholders } from "@/content/site";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Rentife is priced per occupied unit per month, and free until your first payment is matched automatically.",
};

const plans = [
  { name: "Starter", price: placeholders.PLAN_STARTER, for: "Landlords with a single building", featured: false },
  { name: "Growth", price: placeholders.PLAN_GROWTH, for: "Landlords with several buildings", featured: true },
  { name: "Agency", price: placeholders.PLAN_AGENCY, for: "Agents managing for many owners", featured: false },
];

const included = [
  "Automatic M-Pesa matching and review queue",
  "Instant numbered receipts",
  "SMS and WhatsApp reminders",
  "Tenant portal with no app",
  "Arrears, statements and tax centre",
];

const compare: [string, boolean, boolean, boolean][] = [
  ["Matching, receipts and reminders", true, true, true],
  ["Water and power billing", true, true, true],
  ["Deposits and inspections", true, true, true],
  ["Multi-property dashboard", false, true, true],
  ["Owner portfolios and commission", false, false, true],
  ["Owner portal and monthly owner statements", false, false, true],
];

export default function Pricing() {
  return (
    <>
      <section className="container-x pt-36 sm:pt-44">
        <SplitHeading as="h1" size="display-1" eyebrow="Pricing" title="Pay per occupied unit">
          Free until your first payment is matched automatically. Vacant units cost nothing. Final prices are being confirmed.
        </SplitHeading>
      </section>

      <section className="container-x pt-14">
        <div className="grid gap-5 lg:grid-cols-3">
          {plans.map((p) => (
            <div key={p.name} className={`flex flex-col rounded-[2.5rem] p-8 sm:p-10 ${p.featured ? "bg-plum-800 text-white" : "bg-white shadow-soft"}`}>
              <p className={`text-sm font-bold uppercase tracking-[0.12em] ${p.featured ? "text-pink-500" : "text-pink-700"}`}>{p.name}</p>
              <p className="mt-4 text-3xl font-medium">
                <Placeholder>{p.price}</Placeholder>
              </p>
              <p className={`mt-1 text-sm ${p.featured ? "text-white/70" : "text-ink-600"}`}>per occupied unit, per month</p>
              <p className="mt-5">{p.for}</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {included.map((i) => (
                  <li key={i} className="flex gap-2">
                    <Check size={18} weight="bold" className={`shrink-0 ${p.featured ? "text-pink-500" : "text-pink-700"}`} aria-hidden />
                    {i}
                  </li>
                ))}
              </ul>
              <Link href="/book-setup" className={`btn mt-8 ${p.featured ? "btn-light" : "btn-primary"}`}>
                Book a free setup
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-ink-600">
          Minimum monthly fee: <Placeholder>{placeholders.MIN_MONTHLY_FEE}</Placeholder>. Price per unit: <Placeholder>{placeholders.PRICE_PER_UNIT}</Placeholder>.
        </p>
      </section>

      <section className="container-x pt-24 sm:pt-32">
        <Eyebrow>Compare plans</Eyebrow>
        <h2 className="display-2 mt-4">What each plan includes</h2>
        <div className="mt-10 overflow-x-auto rounded-[2rem] bg-white shadow-soft">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="p-5 font-semibold">Feature</th>
                {plans.map((p) => (
                  <th key={p.name} scope="col" className="p-5 text-center font-semibold">{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compare.map(([f, ...v]) => (
                <tr key={f} className="border-b border-line last:border-0">
                  <th scope="row" className="p-5 font-normal">{f}</th>
                  {v.map((on, i) => (
                    <td key={i} className="p-5 text-center">
                      {on ? <Check size={20} weight="bold" className="mx-auto text-paid" aria-label="Included" /> : <span className="text-ink-400" aria-label="Not included">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="container-x pt-24 sm:pt-32">
        <SplitHeading eyebrow="The cost of chasing" title="What late rent is costing you">
          Compare it with what you spend chasing today.
        </SplitHeading>
        <div className="mt-12">
          <CostCalculator />
        </div>
      </section>

      <section className="container-x pt-24 sm:pt-32">
        <h2 className="display-2 mb-10">Pricing questions</h2>
        <Faq
          items={[
            { q: "When do I start paying?", a: "Rentife is free until your first payment is matched automatically. After that you pay per occupied unit each month." },
            { q: "Do vacant units count?", a: "No. You only pay for occupied units." },
            { q: "Does Rentife take a cut of my rent?", a: "No. Rent goes straight to your own Paybill, Till or bank. Rentife never receives or holds it." },
            { q: "What happens if I stop paying for Rentife?", a: "Rent keeps flowing into your own account. Your records stay available to view and export." },
          ]}
        />
      </section>

      <FinalCta />
    </>
  );
}
