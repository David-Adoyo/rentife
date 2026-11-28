import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/app/ActionForm";
import { AuthShell, Field, input } from "@/components/app/ui";
import { safeNext } from "@/lib/app/safe-next";
import { sendMagicLink, signIn } from "../actions";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  return (
    <AuthShell title="Sign in to Rentife" text={<>New here? <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-pink-700">Create an account</Link></>}>
      <ActionForm action={signIn} submit="Sign in" submitClass="btn btn-primary w-full" resetOnSuccess={false}>
        <input type="hidden" name="next" value={next} />
        <Field label="Email" htmlFor="email"><input id="email" name="email" type="email" autoComplete="email" required className={input} /></Field>
        <Field label="Password" htmlFor="password"><input id="password" name="password" type="password" autoComplete="current-password" required className={input} /></Field>
      </ActionForm>
      <details className="mt-6 border-t border-line pt-5">
        <summary className="cursor-pointer text-sm font-semibold text-pink-700">Email me a sign-in link instead</summary>
        <div className="mt-4">
          <ActionForm action={sendMagicLink} submit="Send link" submitClass="btn btn-outline w-full">
            <input type="hidden" name="next" value={next} />
            <Field label="Email" htmlFor="ml-email"><input id="ml-email" name="email" type="email" autoComplete="email" required className={input} /></Field>
          </ActionForm>
        </div>
      </details>
    </AuthShell>
  );
}
