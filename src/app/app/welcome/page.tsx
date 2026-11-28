import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { ActionForm } from "@/components/app/ActionForm";
import { AuthShell, Field, input } from "@/components/app/ui";
import { createOrganisation } from "../actions";

export const metadata: Metadata = { title: "Set up your account" };

export default async function Welcome() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login?next=/app");
  const [{ data: aal }, { data: m }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.from("memberships").select("id").eq("user_id", auth.user.id).limit(1),
  ]);
  if (aal?.currentLevel !== "aal2") redirect("/auth/mfa?next=/app/welcome");
  if (m?.length) redirect("/app");
  const name = (auth.user.user_metadata?.full_name as string | undefined) ?? "";
  return (
    <AuthShell title="Welcome to Rentife" text="Step 1 of 7 · About you. Setting up takes under an hour, and you can stop and come back any time.">
      <ActionForm action={createOrganisation} submit="Continue" submitClass="btn btn-primary w-full" resetOnSuccess={false}>
        <Field label="Your name" htmlFor="full_name"><input id="full_name" name="full_name" defaultValue={name} required className={input} /></Field>
        <Field label="Your mobile number (optional)" htmlFor="phone" hint="So we can reach you about your account.">
          <input id="phone" name="phone" type="tel" inputMode="tel" placeholder="0712 345 678" className={input} />
        </Field>
        <Field label="Organisation name" htmlFor="name" hint="What tenants and owners will see, e.g. Mwangaza Homes.">
          <input id="name" name="name" required className={input} />
        </Field>
        <fieldset>
          <legend className="text-sm font-medium">You are</legend>
          <div className="mt-2 grid gap-2">
            {[["individual", "An individual landlord"], ["family", "A family managing property together"], ["agency", "An agent or property manager"]].map(([v, l], i) => (
              <label key={v} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-4 py-3 has-[:checked]:border-plum-800 has-[:checked]:bg-plum-100">
                <input type="radio" name="type" value={v} defaultChecked={i === 0} className="accent-plum-800" /> {l}
              </label>
            ))}
          </div>
        </fieldset>
      </ActionForm>
    </AuthShell>
  );
}
