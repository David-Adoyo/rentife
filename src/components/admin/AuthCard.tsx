import Image from "next/image";
import type { ReactNode } from "react";

/** Centred card used by sign-in, the code step and the invite flow. */
export function AuthCard({ title, text, children }: { title: string; text?: ReactNode; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <Image src="/brand/rentife-mark.png" alt="" width={491} height={502} className="h-9 w-auto" priority />
          <Image src="/brand/rentife-wordmark.png" alt="Rentife" width={409} height={101} className="h-7 w-auto" priority />
          <span className="ml-1 rounded-full bg-plum-800 px-2.5 py-0.5 text-xs font-semibold text-white">Admin</span>
        </div>
        <div className="rounded-[2rem] bg-white p-7 shadow-soft sm:p-9">
          <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
          {text && <div className="mt-2 text-ink-600">{text}</div>}
          <div className="mt-7">{children}</div>
        </div>
      </div>
    </main>
  );
}

export const inputClass =
  "mt-2 block h-12 w-full rounded-[6px] border border-line bg-white px-4 text-base outline-none focus:border-plum-800 focus:ring-2 focus:ring-pink-500/30";

export function FormError({ error }: { error?: string }) {
  return error ? (
    <p role="alert" className="rounded-xl bg-overdue/10 px-4 py-3 text-sm text-overdue">
      {error}
    </p>
  ) : null;
}
