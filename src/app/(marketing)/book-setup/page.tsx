import type { Metadata } from "next";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { Eyebrow } from "@/components/primitives";
import { BookSetupForm } from "./BookSetupForm";

export const metadata: Metadata = {
  title: "Book a free setup",
  description: "Book a free Rentife setup. We’ll help you get live in under an hour.",
};

export default function BookSetup() {
  return (
    <section className="container-x pb-24 pt-36 sm:pt-44">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div>
          <Eyebrow>Book a free setup</Eyebrow>
          <h1 className="display-1 mt-4 text-balance">Live in under an hour</h1>
          <p className="mt-6 max-w-md text-lg text-ink-600">
            Tell us a little about your buildings and when suits you. We’ll call to set up Rentife with you.
          </p>
          <ul className="mt-10 space-y-4 text-lg">
            {["Bring your Excel sheet, or start from scratch", "Keep your existing Paybill or Till", "Free until your first payment is matched"].map((t) => (
              <li key={t} className="flex gap-3">
                <CheckCircle size={24} weight="fill" className="mt-0.5 shrink-0 text-pink-700" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <BookSetupForm />
      </div>
    </section>
  );
}
