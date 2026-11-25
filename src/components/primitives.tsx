import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

/** Small uppercase label with the brand pink dot (the section "eyebrow"). */
export function Eyebrow({ children, tone = "dark" }: { children: ReactNode; tone?: "dark" | "light" }) {
  return (
    <p
      className={`flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.14em] ${
        tone === "light" ? "text-white/85" : "text-ink-900"
      }`}
    >
      <span aria-hidden className="h-2 w-2 rounded-full bg-pink-500" />
      {children}
    </p>
  );
}

/** A visible, honest placeholder token from the masterplan register. */
export function Placeholder({ children }: { children: ReactNode }) {
  return <span className="placeholder" title="To be confirmed before launch">{children}</span>;
}

/** KSh 15,000 — currency small and secondary, amount tabular. */
export function Money({ cents, className = "" }: { cents: number; className?: string }) {
  const shillings = Math.round(cents / 100);
  return (
    <span className={`num whitespace-nowrap ${className}`}>
      <span className="mr-[0.2em] text-[0.8em] opacity-70">KSh</span>
      <span className="font-medium">{shillings.toLocaleString("en-KE")}</span>
    </span>
  );
}

/** Two-column section heading: large title left, supporting copy right. */
export function SplitHeading({
  eyebrow,
  title,
  children,
  as: Tag = "h2",
  size = "display-2",
}: {
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
  as?: "h1" | "h2";
  size?: "display-1" | "display-2";
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:gap-16">
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <Tag className={`${size} ${eyebrow ? "mt-4" : ""} text-balance`}>{title}</Tag>
      </div>
      {children && <div className="text-lg leading-relaxed text-ink-600 lg:pb-2">{children}</div>}
    </div>
  );
}

/** Round white arrow button used on image tiles. Decorative: the whole tile is the link. */
export function ArrowDisc({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`flex h-14 w-14 items-center justify-center rounded-full bg-white text-ink-900 shadow-soft transition-transform group-hover:translate-x-1 ${className}`}
    >
      <ArrowRight size={22} />
    </span>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 font-semibold text-pink-700 underline-offset-4 hover:underline">
      {children} <ArrowRight size={16} weight="bold" />
    </Link>
  );
}
