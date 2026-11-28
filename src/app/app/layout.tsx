import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Rentife", template: "%s · Rentife" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function AppRoot({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-cream-100">{children}</div>;
}
