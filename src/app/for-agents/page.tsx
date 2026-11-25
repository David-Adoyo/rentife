import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { FeatureRows, FinalCta, PageHero } from "@/components/Sections";

export const metadata: Metadata = {
  title: "For agents and property managers",
  description: "Owner portfolios, automatic commission, monthly owner statements, staff roles and an audit trail for Kenyan letting agents.",
};

export default function ForAgents() {
  return (
    <>
      <PageHero
        eyebrow="For agents and property managers"
        title="Many owners, one calm desk"
        scene="statement"
        tone="dusk"
        photo="/people/tile-agent.webp"
        position="50% 22%"
        text="Stop computing commission and remittances by hand. Rentife links every unit to its owner and does the maths every month."
      >
        <Link href="/book-setup" className="btn btn-primary">Book a free setup <ArrowRight size={16} weight="bold" /></Link>
      </PageHero>

      <section className="container-x pt-16 sm:pt-24">
        <FeatureRows
          rows={[
            {
              id: "portfolios",
              title: "Owner portfolios instead of spreadsheets",
              scene: "grid",
              tone: "plum",
              text: "Every unit is linked to an owner, so you can see one owner’s buildings or your whole book at a glance, with a collection rate per building.",
            },
            {
              id: "commission",
              title: "Commission and remittances, worked out for you",
              scene: "statement",
              tone: "pink",
              text: "Set commission as a percentage or a flat fee. Rentife deducts approved expenses and gives you the net remittance per owner, per month.",
            },
            {
              id: "statements",
              title: "Owner statements that answer the WhatsApps",
              scene: "letter",
              tone: "blush",
              text: "A polished monthly statement PDF, emailed to each owner and waiting in their own portal. Payment data comes straight from M-Pesa confirmations, so owners can trust it.",
            },
            {
              id: "roles",
              title: "Staff roles and an audit trail",
              scene: "audit",
              tone: "plum",
              text: "Give each team member the right access for the properties they look after. Every action is recorded in an audit trail that cannot be edited.",
              points: ["Managers, accountants (read-only plus exports) and caretakers", "Payment credentials changed only by people you allow", "Staff turnover without losing the history"],
            },
            {
              id: "maintenance",
              title: "Maintenance with proof",
              scene: "tasks",
              tone: "dusk",
              text: "Tickets with before and after photos and vendor invoices attached. Owners approve costs above a threshold you set, so disputes are settled before they start.",
            },
          ]}
        />
      </section>

      <FinalCta title="Run every owner’s buildings from one place." />
    </>
  );
}
