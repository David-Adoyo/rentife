import Image from "next/image";
import type { ReactNode } from "react";

export const input =
  "mt-1.5 block h-11 w-full rounded-[6px] border border-line bg-white px-3.5 text-[15px] outline-none focus:border-plum-800 focus:ring-2 focus:ring-pink-500/30";

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-600">{hint}</p>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.12em] text-pink-700">{eyebrow}</p>}
        <h1 className="mt-1 text-3xl font-medium tracking-tight sm:text-4xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[1.5rem] bg-white p-5 shadow-soft sm:p-6 ${className}`}>{children}</div>;
}

const pill = {
  occupied: "bg-paid/10 text-paid",
  vacant: "bg-vacant/15 text-[#5f5d55]",
  notice: "bg-partial/15 text-[#8a5c0f]",
  maintenance: "bg-overdue/10 text-overdue",
  active: "bg-paid/10 text-paid",
  ended: "bg-vacant/15 text-[#5f5d55]",
} as const;
export function StatusPill({ status }: { status: string }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${pill[status as keyof typeof pill] ?? "bg-cream-100"}`}>{label}</span>;
}

export function Empty({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-plum-200 bg-white/60 p-10 text-center">
      <p className="text-lg font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-ink-600">{text}</p>
      {children && <div className="mt-5 flex justify-center">{children}</div>}
    </div>
  );
}

export const roleLabel: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  accountant: "Accountant",
  caretaker: "Caretaker",
  passive_owner: "Property owner (view only)",
};

/** Centred card for sign-in, sign-up and two-factor screens. */
export function AuthShell({ title, text, children }: { title: string; text?: ReactNode; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-cream-100 px-4 py-12">
      <div className="w-full max-w-md">
        <a href="/" className="mb-8 flex items-center justify-center gap-2" aria-label="Rentife home">
          <Image src="/brand/rentife-mark.png" alt="" width={491} height={502} className="h-9 w-auto" priority />
          <Image src="/brand/rentife-wordmark.png" alt="Rentife" width={409} height={101} className="h-7 w-auto" priority />
        </a>
        <div className="rounded-[2rem] bg-white p-7 shadow-soft sm:p-9">
          <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
          {text && <div className="mt-2 text-ink-600">{text}</div>}
          <div className="mt-7">{children}</div>
        </div>
      </div>
    </main>
  );
}
