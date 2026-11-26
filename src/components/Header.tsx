"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { List, X } from "@phosphor-icons/react";
import { Logo } from "./Logo";
import { nav } from "@/content/site";

export function Header() {
  const [mobile, setMobile] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMobile(false), [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobile(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = mobile ? "hidden" : "";
  }, [mobile]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-5">
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
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`rounded-full px-4 py-2.5 text-[0.9375rem] font-medium hover:bg-cream-100 ${
                    isActive(item.href) ? "bg-cream-100 text-pink-700" : ""
                  }`}
                >
                  {item.label}
                </Link>
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
      </div>

      {mobile && (
        <div className="pointer-events-auto fixed inset-x-0 bottom-0 top-[84px] overflow-y-auto bg-cream-100 px-4 pb-10 pt-4 lg:hidden">
          <ul className="divide-y divide-line rounded-3xl bg-white px-5">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`flex min-h-14 items-center text-lg font-medium ${isActive(item.href) ? "text-pink-700" : ""}`}
                >
                  {item.label}
                </Link>
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
