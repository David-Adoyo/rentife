import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/app/ActionForm";
import { AuthShell, Field, input } from "@/components/app/ui";
import { safeNext } from "@/lib/app/safe-next";
import { signUp } from "../actions";

export const metadata: Metadata = { title: "Create your account", robots: { index: false } };

export default async function SignUp({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  return (
    <AuthShell title="Create your Rentife account" text={<>Already have one? <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-pink-700">Sign in</Link></>}>
      <ActionForm action={signUp} submit="Create account" submitClass="btn btn-primary w-full">
        <input type="hidden" name="next" value={next} />
        <Field label="Your name" htmlFor="full_name"><input id="full_name" name="full_name" autoComplete="name" required className={input} /></Field>
        <Field label="Email" htmlFor="email"><input id="email" name="email" type="email" autoComplete="email" required className={input} /></Field>
        <Field label="Password" htmlFor="password" hint="At least 12 characters, with upper and lower case letters and a number.">
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required className={input} />
        </Field>
      </ActionForm>
      <p className="mt-5 text-xs text-ink-600">By creating an account you agree to our <Link href="/legal/terms" className="underline">Terms</Link> and <Link href="/legal/privacy" className="underline">Privacy notice</Link>.</p>
    </AuthShell>
  );
}
