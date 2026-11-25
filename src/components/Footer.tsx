import Link from "next/link";
import { ArrowUpRight, ChatCircleText, EnvelopeSimple, Phone } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "./Logo";
import { footerColumns, placeholders } from "@/content/site";
import { Placeholder } from "./primitives";

export function Footer() {
  return (
    <footer className="bg-plum-950 text-white">
      <div className="container-x pb-10 pt-16 sm:pt-20">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xs">
            <Logo tone="white" />
            <p className="mt-6 text-xl font-medium leading-snug">We&rsquo;re always here when you need us</p>
            <ul className="mt-6 space-y-3 text-sm text-white/80">
              <li className="flex items-center gap-3">
                <Phone size={18} aria-hidden /> <Placeholder>{placeholders.SUPPORT_PHONE}</Placeholder>
              </li>
              <li className="flex items-center gap-3">
                <EnvelopeSimple size={18} aria-hidden /> <Placeholder>{placeholders.SUPPORT_EMAIL}</Placeholder>
              </li>
              <li className="flex items-center gap-3">
                <ChatCircleText size={18} aria-hidden /> WhatsApp <Placeholder>{placeholders.SUPPORT_WHATSAPP}</Placeholder>
              </li>
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4 lg:w-[62%]">
            {footerColumns.map((col) => (
              <div key={col.title}>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/60">{col.title}</p>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="font-medium text-white/90 hover:text-pink-500">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <hr className="mt-14 border-white/15" />

        <div className="mt-8 flex flex-col gap-6 text-sm text-white/70 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
            <span>© {new Date().getFullYear()} Rentife.</span>
            <span>
              Registered with the ODPC: <Placeholder>{placeholders.ODPC_REG_NO}</Placeholder>
            </span>
            <span className="flex gap-4">
              <Link href="/legal/privacy" className="hover:text-white">Privacy</Link>
              <Link href="/legal/terms" className="hover:text-white">Terms</Link>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="lang" className="sr-only">Language</label>
            <select
              id="lang"
              defaultValue="en"
              className="h-11 w-full min-w-0 rounded-full border border-white/40 bg-transparent px-4 pr-8 text-white sm:w-56"
            >
              <option value="en" className="text-ink-900">Kenya (English)</option>
              <option value="sw" disabled className="text-ink-900">Kenya (Kiswahili) — coming soon</option>
            </select>
            <Link href="/book-setup" className="btn btn-ghost-light">
              Book a setup <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
