import type { Metadata } from "next";
import { Database, Eye, FileLock, HardDrives, Key, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { Eyebrow, SplitHeading } from "@/components/primitives";
import { FinalCta, PageHero, StadiumCard } from "@/components/Sections";

export const metadata: Metadata = {
  title: "Security",
  description: "How Rentife keeps your money and data safe: rent goes to your own account, data is isolated per organisation and every action is audited.",
};

const pillars = [
  { icon: Database, t: "Your data stays yours", d: "Every organisation’s data is isolated at the database level. One landlord can never see another’s tenants or payments." },
  { icon: Key, t: "Credentials encrypted", d: "Your M-Pesa connection details are encrypted at rest and never sent to the browser. Even Rentife staff cannot read them." },
  { icon: Eye, t: "Masked by default", d: "Lists show only the last digits of payer phone numbers. We never store full national ID numbers." },
  { icon: FileLock, t: "Records that can’t be rewritten", d: "Payments and statement entries are never edited or deleted. Corrections are made as new, visible adjustments." },
  { icon: ShieldCheck, t: "An audit trail for everything", d: "Who did what, and when, is recorded for every important action, and the trail itself cannot be edited." },
  { icon: HardDrives, t: "Kenya Data Protection Act", d: "We follow the Kenya Data Protection Act, 2019, and register with the Office of the Data Protection Commissioner." },
];

export default function Security() {
  return (
    <>
      <PageHero
        eyebrow="Security"
        title="Your money never touches us"
        scene="flow"
        tone="plum"
        text="Rent goes straight into your own Paybill, Till or bank account. Rentife only reads the payment confirmations, so there is nothing for us to hold, lose or delay."
      />

      <section className="container-x pt-16 sm:pt-24">
        <SplitHeading eyebrow="How we protect you" title="Calm, careful and on the record">
          The same principles a bank uses for statements, applied to your buildings.
        </SplitHeading>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-[2rem] bg-white p-8 shadow-soft">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100 text-pink-700">
                <Icon size={24} weight="fill" aria-hidden />
              </span>
              <h3 className="mt-5 text-xl font-medium">{t}</h3>
              <p className="mt-2 text-ink-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-x pt-24 sm:pt-32">
        <Eyebrow>Roles and access</Eyebrow>
        <h2 className="display-2 mt-4 max-w-3xl">Everyone sees only what they need</h2>
        <div className="mt-12 space-y-6">
          <StadiumCard
            title="Caretakers can’t touch the money"
            text="Caretakers see whether a unit has paid, with amounts hidden by default. They cannot record payments at all, so cash never goes missing on their watch."
            href="/how-it-works#people"
            cta="How caretakers work"
            scene="tasks"
            tone="blush"
          />
          <StadiumCard
            flip
            title="Every action leaves a trace"
            text="Managers, accountants and owners each get the access their role needs, limited to the properties they look after. The audit trail shows the rest."
            href="/for-agents#roles"
            cta="Staff roles"
            scene="audit"
            tone="dusk"
          />
        </div>
      </section>

      <FinalCta />
    </>
  );
}
