import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Eyebrow, Placeholder, SplitHeading } from "@/components/primitives";
import { FeatureRows, FinalCta, PageHero, StadiumCard } from "@/components/Sections";
import { placeholders } from "@/content/site";

export const metadata: Metadata = {
  title: "How it works",
  description: "How Rentife collects, matches, receipts and records rent for Kenyan landlords — and gets you live in under an hour.",
};

const timeline = [
  ["Tell us about your buildings", "Properties, units and rent amounts. Upload your existing Excel if you have one."],
  ["Connect your Paybill or Till", "Rent keeps going to your own account. No Paybill yet? We’ll walk you through getting one."],
  ["Share unit codes with tenants", "Each tenant gets a short code like SUN-B4 to use as the M-Pesa account number."],
  ["Watch the first payment match", "Rentife is free until your first payment is matched automatically."],
];

export default function HowItWorks() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title="Pay, match, receipt, record"
        scene="feed"
        tone="plum"
        text="Tenants pay into your own Paybill or Till using their unit code. Rentife matches every payment to the right unit, sends an instant receipt and keeps a clean record you can trust."
      >
        <Link href="/book-setup" className="btn btn-primary">Book a free setup <ArrowRight size={16} weight="bold" /></Link>
      </PageHero>

      <section className="container-x pt-16 sm:pt-24">
        <FeatureRows
          rows={[
            {
              id: "reminders",
              title: "Polite reminders, on schedule",
              scene: "reminder",
              tone: "plum",
              text: "Reminders go out before the due date, on the day and after it, by SMS and WhatsApp, each with a one-tap M-Pesa payment prompt. They stop the moment the tenant pays.",
              points: ["Quiet hours respected: no messages late at night", "Respectful wording, never threats or shaming", "Late fees are off unless you switch them on"],
            },
            {
              id: "matching",
              title: "Smart matching that learns",
              scene: "match",
              tone: "pink",
              text: "Tenants pay from a spouse’s phone, forget the unit number or type it oddly. Rentife checks the unit code, then phone numbers it has learned, then the payer’s name and amount.",
              points: ["Anything uncertain goes to a one-tap review queue", "Your choice is remembered for next time", "Partial payments carry forward automatically"],
            },
            {
              id: "receipts",
              title: "Instant, numbered receipts",
              scene: "receipt",
              tone: "dusk",
              text: "Every payment gets a numbered digital receipt by SMS or WhatsApp, with a PDF and a QR code anyone can scan to check it is genuine.",
              points: ["No more handwritten receipt books", "Fewer disputes about who paid what", "Tenants can download a statement any time"],
            },
            {
              id: "utilities",
              title: "Water and power billing without the fights",
              scene: "meter",
              tone: "blush",
              text: "Your caretaker photographs each meter. The reading is checked and confirmed, and the charge goes on the tenant’s invoice with the photo attached as evidence.",
              points: ["Guided meter rounds, unit by unit", "Works offline on site", "Unusual jumps in usage are flagged"],
            },
            {
              id: "deposits",
              title: "Deposits without disputes",
              scene: "deposit",
              tone: "plum",
              text: "Move-in and move-out inspections with timestamped photos, itemised deductions and a deposit record, acknowledged by the tenant.",
            },
            {
              id: "tax",
              title: "Your tax figure, ready before the 20th",
              scene: "tax",
              tone: "pink",
              text: "The tax centre shows the gross residential rent received each month and the amount due, with reminders before the due date and an export pack for filing. This is information, not tax advice.",
            },
          ]}
        />
      </section>

      <section id="people" className="scroll-mt-28 px-2 pt-24 sm:px-4 sm:pt-36">
        <div className="rounded-[3rem] bg-cream-50 py-16 sm:rounded-[4rem] sm:py-24">
          <div className="container-x">
            <SplitHeading eyebrow="Caretakers and tenants" title="Good for everyone in the building">
              Caretakers stop being blamed for missing cash. Tenants get proof of every payment and never need another app.
            </SplitHeading>
            <div className="mt-14 space-y-6">
              <StadiumCard
                title="Caretakers never handle rent"
                text="A simple task list for meter rounds, repairs and inspections. They can see who has paid, with amounts hidden by default, and every action is logged."
                href="/book-setup"
                cta="Set up your team"
                scene="tasks"
                tone="blush"
              />
              <StadiumCard
                flip
                title="Tenants need no app and no password"
                text="Pay with M-Pesa as today. Get receipts by SMS or WhatsApp, a statement and a rent history letter for loans or visas, and report repairs from a simple web page."
                href="/book-setup"
                cta="Book a free setup"
                scene="letter"
                tone="dusk"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="container-x pt-24 sm:pt-36">
        <Eyebrow>Live in under an hour</Eyebrow>
        <h2 className="display-2 mt-4 max-w-3xl">From sign-up to your first matched payment</h2>
        <ol className="mt-12 grid gap-4 md:grid-cols-4">
          {timeline.map(([t, d], i) => (
            <li key={t} className="relative rounded-[2rem] bg-white p-7 shadow-soft">
              <span className="num text-sm font-bold text-pink-700">Step {i + 1}</span>
              <p className="mt-3 text-xl font-medium">{t}</p>
              <p className="mt-2 text-ink-600">{d}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-sm text-ink-600">
          Demo video: <Placeholder>{placeholders.DEMO_VIDEO_URL}</Placeholder>
        </p>
      </section>

      <FinalCta />
    </>
  );
}
