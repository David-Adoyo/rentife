import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Eyebrow, Placeholder } from "@/components/primitives";
import { placeholders } from "@/content/site";

const pages = {
  terms: "Terms of service",
  privacy: "Privacy notice",
  dpa: "Data processing agreement",
} as const;

type Slug = keyof typeof pages;

export function generateStaticParams() {
  return Object.keys(pages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: pages[slug as Slug] ?? "Legal", robots: { index: false } };
}

export default async function Legal({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(slug in pages)) notFound();
  return (
    <section className="container-x max-w-3xl pb-24 pt-36 sm:pt-44">
      <Eyebrow>Legal</Eyebrow>
      <h1 className="display-2 mt-4">{pages[slug as Slug]}</h1>
      <div className="mt-10 rounded-[2rem] bg-white p-8 shadow-soft">
        <p className="text-ink-600">
          This document is being prepared by our lawyers and will be published here before launch.
        </p>
        <p className="mt-4">
          <Placeholder>{placeholders.LEGAL_TEXT}</Placeholder>
        </p>
      </div>
    </section>
  );
}
