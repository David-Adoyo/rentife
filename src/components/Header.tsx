"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CaretDown, List, X } from "@phosphor-icons/react";
import { Logo } from "./Logo";
import { nav } from "@/content/site";

export function Header() {
  const [open, setOpen] = useState<number | null>(null);
  const [mobile, setMobile] = useState(false);
  const [mobileSection, setMobileSection] = useState<number | null>(null);
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  // Close menus on navigation.
  useEffect(() => {
    setOpen(null);
    setMobile(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        setMobile(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = mobile ? "hidden" : "";
  }, [mobile]);

  const active = open !== null ? nav[open] : null;

  return (
    <div ref={ref} className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-5">
      <a
        href="#main"
        className="pointer-events-auto sr-only rounded-full bg-white px-4 py-2 font-semibold focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>
      <div className="pointer-events-auto mx-auto max-w-[1180px]">
        <nav
          aria-label="Main"
          className="flex h-16 items-center justify-between rounded-full bg-white/95 pl-5 pr-2 shadow-soft backdrop-blur sm:h-[72px] sm:pl-7"
        >
          <Logo />
          <ul className="hidden items-center gap-1 lg:flex">
            {nav.map((item, i) => (
              <li key={item.label}>
                {"href" in item ? (
                  <Link
                    href={item.href}
                    className={`rounded-full px-4 py-2.5 text-[0.9375rem] font-medium hover:bg-cream-100 ${
                      pathname === item.href ? "text-pink-700" : ""
                    }`}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    type="button"
                    aria-expanded={open === i}
                    aria-controls="mega-panel"
                    onClick={() => setOpen(open === i ? null : i)}
                    onMouseEnter={() => setOpen(i)}
                    className={`flex items-center gap-1 rounded-full px-4 py-2.5 text-[0.9375rem] font-medium hover:bg-cream-100 ${
                      open === i ? "bg-cream-100" : ""
                    }`}
                  >
                    {item.label}
                    <CaretDown size={12} weight="bold" className={`transition-transform ${open === i ? "rotate-180" : ""}`} />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <Link href="/book-setup" className="btn btn-primary hidden sm:inline-flex">
              Book a free setup
            </Link>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-900/15 lg:hidden"
              aria-label={mobile ? "Close menu" : "Open menu"}
              aria-expanded={mobile}
              onClick={() => setMobile(!mobile)}
            >
              {mobile ? <X size={20} /> : <List size={20} />}
            </button>
          </div>
        </nav>

        {/* Desktop mega panel */}
        {active && !("href" in active) && (
          <div
            id="mega-panel"
            onMouseLeave={() => setOpen(null)}
            className="animate-rise mt-2 hidden overflow-hidden rounded-[2rem] bg-white shadow-float lg:grid lg:grid-cols-[1.1fr_2fr]"
          >
            <div className="bg-plum-800 p-10 text-white">
              <p className="display-3">{active.intro.title}</p>
              <p className="mt-3 max-w-sm text-white/80">{active.intro.text}</p>
              <Link href={active.intro.href} className="btn btn-light mt-8">
                {active.intro.cta} <ArrowRight size={16} weight="bold" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-8 p-10">
              {active.groups.map((g) => (
                <div key={g.title}>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-600">{g.title}</p>
                  <ul className="mt-4 space-y-1">
                    {g.links.map((l) => (
                      <li key={l.href}>
                        <Link href={l.href} className="group flex items-center justify-between rounded-xl px-3 py-2.5 -mx-3 font-medium hover:bg-cream-100">
                          {l.label}
                          <ArrowRight size={16} className="opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile menu */}
      {mobile && (
        <div className="pointer-events-auto fixed inset-x-0 bottom-0 top-[84px] overflow-y-auto bg-cream-100 px-4 pb-10 pt-4 lg:hidden">
          <ul className="divide-y divide-line rounded-3xl bg-white px-5">
            {nav.map((item, i) => (
              <li key={item.label} className="py-1">
                {"href" in item ? (
                  <Link href={item.href} className="flex min-h-12 items-center text-lg font-medium">
                    {item.label}
                  </Link>
                ) : (
                  <>
                    <button
                      type="button"
                      aria-expanded={mobileSection === i}
                      onClick={() => setMobileSection(mobileSection === i ? null : i)}
                      className="flex min-h-12 w-full items-center justify-between text-lg font-medium"
                    >
                      {item.label}
                      <CaretDown size={16} className={`transition-transform ${mobileSection === i ? "rotate-180" : ""}`} />
                    </button>
                    {mobileSection === i && (
                      <div className="pb-4">
                        <Link href={item.intro.href} className="mb-3 flex items-center gap-2 font-semibold text-pink-700">
                          {item.intro.cta} <ArrowRight size={16} />
                        </Link>
                        {item.groups.map((g) => (
                          <div key={g.title} className="mt-3">
                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-600">{g.title}</p>
                            <ul className="mt-1">
                              {g.links.map((l) => (
                                <li key={l.href}>
                                  <Link href={l.href} className="flex min-h-11 items-center text-ink-900">
                                    {l.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
          <Link href="/book-setup" className="btn btn-primary mt-4 w-full">
            Book a free setup
          </Link>
        </div>
      )}
    </div>
  );
}
