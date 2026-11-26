import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Eyebrow, SplitHeading } from "@/components/primitives";
import { CostCalculator } from "@/components/CostCalculator";
import { Faq, FinalCta, PageHero, StadiumCard } from "@/components/Sections";
import { AllPaidPanel, BeforeAfter, faqs } from "@/components/LandlordBlocks";
import { Scene, type SceneKind, type SceneTone } from "@/components/Vignettes";

export const metadata: Metadata = {
  title: "For landlords",
  description:
    "Stop chasing rent. Automatic M-Pesa matching, instant receipts, polite reminders and your monthly tax figure, for Kenyan landlords with 5 to 500 units.",
};

const features: { title: string; text: string; href: string; scene: SceneKind; tone: SceneTone }[] = [
  { title: "Polite reminders", text: "Before, on and after the due date, by SMS and WhatsApp. They stop the moment a tenant pays.", href: "/how-it-works#reminders", scene: "reminder", tone: "plum" },
  { title: "Smart matching", text: "Paid from a spouse’s phone or without the unit code? Rentife still finds the right unit, and learns.", href: "/how-it-works#matching", scene: "match", tone: "pink" },
  { title: "Instant receipts", text: "A numbered receipt for every payment, with a QR code anyone can check.", href: "/how-it-works#receipts", scene: "receipt", tone: "dusk" },
  { title: "Water and power billing", text: "Meter photos become charges, with the photo attached as evidence.", href: "/how-it-works#utilities", scene: "meter", tone: "blush" },
  { title: "Deposits without disputes", text: "Move-in and move-out inspections with timestamped photos.", href: "/how-it-works#deposits", scene: "deposit", tone: "plum" },
  { title: "Tax figure before the 20th", text: "Gross rent received and the amount due, ready to file. Information, not tax advice.", href: "/how-it-works#tax", scene: "tax", tone: "pink" },
];

export default function ForLandlords() {
  return (
    <>
      <PageHero
        eyebrow="For landlords"
        title="Stop chasing rent"
        scene="ring"
        tone="pink"
        photo="/people/tile-landlord.webp"
        position="50% 18%"
        text="Rentife reminds your tenants, matches every M-Pesa payment to the right unit, sends receipts and keeps a clean record, while rent goes straight to your own Paybill."
      >
        <Link href="/book-setup" className="btn btn-primary">
          Book a free setup <ArrowRight size={16} weight="bold" />
        </Link>
        <Link href="/how-it-works" className="btn btn-outline">
          See how it works
        </Link>
      </PageHero>

      <section className="container-x pt-16 sm:pt-24">
        <Eyebrow>The 1st of the month, before and after</Eyebrow>
        <h2 className="display-2 mt-4 max-w-3xl">The first week of the month, given back to you</h2>
        <BeforeAfter />
      </section>

      <section className="container-x pt-24 sm:pt-32">
        <SplitHeading eyebrow="What you get" title="Everything a landlord needs, nothing you don’t">
          Six things that take the work out of rent, all included in every plan.
        </SplitHeading>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Link key={f.title} href={f.href} className="group overflow-hidden rounded-[2rem] bg-white shadow-soft">
              <Scene kind={f.scene} tone={f.tone} label={false} className="aspect-[4/3] transition-transform duration-500 group-hover:scale-[1.02]" />
              <div className="p-7">
                <h3 className="text-xl font-medium group-hover:text-pink-700">{f.title}</h3>
                <p className="mt-2 text-ink-600">{f.text}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-x pt-24 sm:pt-32">
        <SplitHeading eyebrow="See it in action" title="Watch a month collect itself">
          From the first reminder to the last receipt, one screen tells you where every unit stands.
        </SplitHeading>
        <AllPaidPanel />
      </section>

      <section className="container-x pt-24 sm:pt-32">
        <SplitHeading eyebrow="The cost of chasing" title="What late rent is costing you">
          Move the sliders to match your buildings. Everything is worked out from your own numbers.
        </SplitHeading>
        <div className="mt-12">
          <CostCalculator />
        </div>
      </section>

      <section className="container-x pt-24 sm:pt-32">
        <StadiumCard
          title="Tenants love it too"
          text="An instant receipt for every payment, a rent history letter for loans and visas, and repairs they can report and track. No app to download."
          href="/how-it-works#people"
          cta="What tenants get"
          scene="letter"
          tone="blush"
          photo="/people/card-tenant.webp"
          position="35% 40%"
        />
      </section>

      <section id="faq" className="container-x scroll-mt-28 pt-24 sm:pt-32">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
          <div>
            <Eyebrow>Questions</Eyebrow>
            <h2 className="display-2 mt-4">Questions landlords ask</h2>
          </div>
          <Faq items={faqs} />
        </div>
      </section>

      <FinalCta />
    </>
  );
}
