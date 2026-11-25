import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { FeatureRows, FinalCta, PageHero } from "@/components/Sections";

export const metadata: Metadata = {
  title: "For diaspora owners",
  description: "See every shilling from anywhere: a real-time owner dashboard, monthly statements and non-resident tax information for Kenyan property.",
};

export default function ForDiaspora() {
  return (
    <>
      <PageHero
        eyebrow="For diaspora owners"
        title="See every shilling from anywhere"
        scene="ring"
        tone="pink"
        photo="/people/tile-diaspora.webp"
        position="50% 28%"
        text="No more relying on relatives or waiting for your agent to reply. Check your buildings whenever you like, from wherever you live."
      >
        <Link href="/book-setup" className="btn btn-primary">Book a free setup <ArrowRight size={16} weight="bold" /></Link>
      </PageHero>

      <section className="container-x pt-16 sm:pt-24">
        <FeatureRows
          rows={[
            {
              id: "dashboard",
              title: "Your own owner dashboard",
              scene: "feed",
              tone: "plum",
              text: "A read-only, real-time view of payments, arrears and occupancy for your units. Payment data comes straight from M-Pesa confirmations, not typed in by your agent, with a full audit trail behind it.",
            },
            {
              id: "statements",
              title: "A monthly statement you can rely on",
              scene: "statement",
              tone: "blush",
              text: "Gross rent collected, commission, approved expenses and net remittance, in a clear PDF emailed to you and kept in your portal. You approve expenses above the threshold you set.",
            },
            {
              id: "tax",
              title: "Non-resident tax information",
              scene: "tax",
              tone: "dusk",
              text: "Mark yourself as non-resident and the tax centre shows the configured non-resident regime and a summary for each period. This is information, not tax advice.",
            },
          ]}
        />
      </section>

      <FinalCta title="Know exactly what your property earns." />
    </>
  );
}
