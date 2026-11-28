import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle, Circle, DownloadSimple, FilePdf } from "@phosphor-icons/react/dist/ssr";
import { appContext } from "@/lib/app/context";
import { ActionForm } from "@/components/app/ActionForm";
import { RegisterImport } from "@/components/app/RegisterImport";
import { Field, input } from "@/components/app/ui";
import { createProperty } from "../actions";
import { aiImportEnabled } from "../import-actions";
import { REMINDER_STEPS, TONES, render, type Tone } from "@/lib/messages";
import { ksh } from "@/lib/money";
import { finishOnboarding, goToStep, savePayment, saveReminders } from "./actions";

export const metadata: Metadata = { title: "Set up Rentife" };

const STEPS = ["About you", "First property", "Units and tenants", "How tenants pay", "Tell your tenants", "Reminders", "Go live"];

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ step?: string; property?: string }> }) {
  const sp = await searchParams;
  const { supabase, org, can, role } = await appContext();
  if (!can.edit) redirect("/app");
  const step = Math.min(7, Math.max(2, Number(sp.step) || org.onboarding_step || 2));

  const [{ data: props }, { data: pay }, { data: rule }, { data: board }, { count: tenantCount }] = await Promise.all([
    supabase.from("properties").select("id, name, code_prefix").eq("org_id", org.id).order("created_at", { ascending: false }),
    supabase.from("payment_settings").select("method, shortcode, bank_name, bank_account_hint").eq("org_id", org.id).maybeSingle(),
    supabase.from("reminder_rules").select("tone, channels").eq("org_id", org.id).is("property_id", null).maybeSingle(),
    supabase.from("unit_board").select("id, property_id, label, unit_code, rent_amount, status").eq("org_id", org.id),
    supabase.from("tenants").select("id", { count: "exact", head: true }).eq("org_id", org.id),
  ]);
  const property = props?.find((p) => p.id === sp.property) ?? props?.[0];
  const units = board ?? [];

  return (
    <div className="min-h-dvh bg-cream-100">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <Link href="/app" className="flex items-center gap-2" aria-label="Rentife home">
            <Image src="/brand/rentife-mark.png" alt="" width={491} height={502} className="h-7 w-auto" />
            <Image src="/brand/rentife-wordmark.png" alt="Rentife" width={409} height={101} className="hidden h-5 w-auto sm:block" />
          </Link>
          <Link href="/app" className="text-sm font-medium text-ink-600 hover:text-pink-700">Finish later</Link>
        </div>
        <ol className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-4 sm:px-8" aria-label="Set-up progress">
          {STEPS.map((label, i) => {
            const n = i + 1, state = n < step ? "done" : n === step ? "now" : "next";
            return (
              <li key={label} className="min-w-[90px] flex-1" aria-current={state === "now" ? "step" : undefined}>
                <div className={`h-1.5 rounded-full ${state === "next" ? "bg-line" : "bg-pink-500"}`} />
                <p className={`mt-1.5 text-xs ${state === "now" ? "font-semibold text-ink-900" : "text-ink-600"}`}>{n}. {label}</p>
              </li>
            );
          })}
        </ol>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
        {step === 2 && (
          <Step title="Add your first property" text="A building or compound. You can add more later.">
            {props?.length ? (
              <div className="mb-6 rounded-2xl bg-white p-5 shadow-soft">
                <p className="text-sm text-ink-600">You’ve added {props.map((p) => p.name).join(", ")}.</p>
                <form action={goToStep} className="mt-3"><input type="hidden" name="step" value="3" /><button className="btn btn-primary">Continue to units</button></form>
              </div>
            ) : null}
            <div className="max-w-lg rounded-[1.5rem] bg-white p-6 shadow-soft">
              <ActionForm action={createProperty} submit={props?.length ? "Add another property" : "Add property and continue"}>
                <input type="hidden" name="then" value="onboarding" />
                <Field label="Property name" htmlFor="name"><input id="name" name="name" required placeholder="Sunrise Court" className={input} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Estate" htmlFor="estate"><input id="estate" name="estate" placeholder="Kasarani" className={input} /></Field>
                  <Field label="County" htmlFor="county"><input id="county" name="county" placeholder="Nairobi" className={input} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Type" htmlFor="type"><select id="type" name="type" className={input}><option value="residential">Residential</option><option value="commercial">Commercial</option><option value="mixed">Mixed</option></select></Field>
                  <Field label="Rent due day" htmlFor="default_due_day"><input id="default_due_day" name="default_due_day" type="number" min={1} max={28} defaultValue={5} className={input} /></Field>
                </div>
                <Field label="Unit-code prefix (optional)" htmlFor="code_prefix" hint="Tenants will pay with codes like SUN-B4. Leave blank and we’ll pick one.">
                  <input id="code_prefix" name="code_prefix" maxLength={5} placeholder="SUN" className={`${input} uppercase`} />
                </Field>
              </ActionForm>
            </div>
          </Step>
        )}

        {step === 3 && (
          property ? (
            <Step title={`Add units and tenants to ${property.name}`} text="No more scrolling M-Pesa messages: once your units are in, we match payments for you. Check everything on screen before it’s saved.">
              {props!.length > 1 && (
                <div className="mb-5 flex flex-wrap gap-2 text-sm">
                  {props!.map((p) => (
                    <Link key={p.id} href={`/app/onboarding?step=3&property=${p.id}`} className={`rounded-full px-3.5 py-1.5 ${p.id === property.id ? "bg-plum-800 text-white" : "bg-white shadow-soft"}`}>{p.name}</Link>
                  ))}
                </div>
              )}
              {units.some((u) => u.property_id === property.id) && (
                <p className="mb-5 rounded-xl bg-paid/10 px-4 py-3 text-sm text-paid">
                  {property.name} has {units.filter((u) => u.property_id === property.id).length} units. Add more below, or <Link href="/app/onboarding?step=4" className="font-semibold underline">continue</Link>.
                </p>
              )}
              <RegisterImport propertyId={property.id} prefix={property.code_prefix}
                existingCodes={units.map((u) => u.unit_code.replace(/[^A-Z0-9]/g, ""))}
                aiEnabled={await aiImportEnabled()} doneHref="/app/onboarding?step=4" />
            </Step>
          ) : (
            <Step title="Add a property first" text="Units belong to a property."><Link href="/app/onboarding?step=2" className="btn btn-primary">Add a property</Link></Step>
          )
        )}

        {step === 4 && (
          <Step title="How do your tenants pay?" text="Rent goes straight to your own account. Rentife never holds your money.">
            {role !== "owner" ? (
              <div className="rounded-2xl bg-white p-5 shadow-soft">
                <p>Only the account owner can set how tenants pay.</p>
                <form action={goToStep} className="mt-3"><input type="hidden" name="step" value="5" /><button className="btn btn-outline h-10 min-h-10">Skip for now</button></form>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
                <div className="rounded-[1.5rem] bg-white p-6 shadow-soft">
                  <ActionForm action={savePayment} submit="Save and continue" resetOnSuccess={false}>
                    <fieldset className="space-y-2">
                      <legend className="sr-only">Payment method</legend>
                      {([
                        ["mpesa_paybill", "M-Pesa Paybill", "Tenants use a business number and their unit code. Best for matching."],
                        ["mpesa_till", "M-Pesa Till (Buy Goods)", "No account number, so we match by the tenant’s phone."],
                        ["bank_paybill", "Bank Paybill", "Your bank’s Paybill, paying into your account."],
                        ["none_yet", "I don’t have one yet", "We’ll show you how to get a Paybill."],
                      ] as const).map(([v, l, h]) => (
                        <label key={v} className="flex cursor-pointer gap-3 rounded-xl border border-line p-3.5 has-[:checked]:border-plum-800 has-[:checked]:bg-plum-100">
                          <input type="radio" name="method" value={v} defaultChecked={(pay?.method ?? "mpesa_paybill") === v} className="mt-1 accent-plum-800" />
                          <span><b className="text-[15px]">{l}</b><br /><span className="text-sm text-ink-600">{h}</span></span>
                        </label>
                      ))}
                    </fieldset>
                    <Field label="Paybill or Till number" htmlFor="shortcode" hint="Leave blank if you don’t have one yet.">
                      <input id="shortcode" name="shortcode" inputMode="numeric" defaultValue={pay?.shortcode ?? ""} placeholder="e.g. 522533" className={input} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Bank (bank Paybill only)" htmlFor="bank_name"><input id="bank_name" name="bank_name" defaultValue={pay?.bank_name ?? ""} className={input} /></Field>
                      <Field label="Account no. tenants enter" htmlFor="bank_account_hint"><input id="bank_account_hint" name="bank_account_hint" defaultValue={pay?.bank_account_hint ?? ""} className={input} /></Field>
                    </div>
                  </ActionForm>
                </div>
                <aside className="h-fit space-y-4 rounded-[1.5rem] bg-plum-800 p-6 text-white">
                  <p className="font-medium">Automatic matching</p>
                  <p className="text-sm text-white/80">To receive M-Pesa confirmations, we’ll connect your Paybill to Safaricom (Daraja) with a “Test connection” step. That part is being built; your settings here carry straight over.</p>
                  <p className="font-medium">Don’t have a Paybill yet?</p>
                  <ol className="list-decimal space-y-1.5 pl-5 text-sm text-white/85">
                    <li>Have your KRA PIN and ID ready (and business registration, if you have one).</li>
                    <li>Open or choose the bank account the rent should go to.</li>
                    <li>Apply for M-PESA for Business via Safaricom or your bank.</li>
                    <li>Meanwhile you can import M-Pesa statements to keep records.</li>
                  </ol>
                </aside>
              </div>
            )}
          </Step>
        )}

        {step === 5 && (() => {
          const sample = units.find((u) => u.status === "occupied") ?? units[0];
          const vars = { first_name: "Wanjiru", property: props?.find((p) => p.id === sample?.property_id)?.name ?? property?.name ?? "your building", paybill: pay?.shortcode ?? "—", unit_code: sample?.unit_code ?? "SUN-B4", link: "rentife.co.ke/t/…" };
          const canNotice = !!pay?.shortcode && pay.method !== "none_yet";
          return (
            <Step title="Tell your tenants how to pay" text="Each tenant gets a welcome message with their unit code, and you can put up a notice in the building.">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  {(["en", "sw"] as const).map((l) => (
                    <div key={l} className="rounded-[1.5rem] bg-white p-5 shadow-soft">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-pink-700">Welcome SMS · {l === "en" ? "English" : "Kiswahili"}</p>
                      <p className="mt-3 rounded-2xl rounded-bl-md bg-cream-100 p-4 text-[15px] leading-relaxed">{render("welcome", l, vars)}</p>
                    </div>
                  ))}
                  <p className="rounded-xl bg-plum-100 px-4 py-3 text-sm text-plum-900">SMS and WhatsApp sending is being connected. Your {tenantCount ?? 0} tenants will get this message, in their chosen language, as soon as it’s live. Nothing is sent before then.</p>
                </div>
                <div className="h-fit rounded-[1.5rem] bg-white p-6 shadow-soft">
                  <FilePdf size={32} className="text-pink-700" />
                  <p className="mt-2 text-lg font-medium">“How to pay rent” notice</p>
                  <p className="mt-1 text-sm text-ink-600">An A4 notice in English and Kiswahili with your {pay?.method === "mpesa_till" ? "Till" : "Paybill"} number and every unit’s code. Print it for the notice board or send it on WhatsApp.</p>
                  {canNotice ? (
                    <ul className="mt-4 space-y-2">
                      {props?.map((p) => (
                        <li key={p.id}><a href={`/app/properties/${p.id}/notice`} target="_blank" rel="noopener" className="btn btn-outline w-full justify-between"><span>{p.name}</span><DownloadSimple size={16} /></a></li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 rounded-xl bg-partial/15 px-4 py-3 text-sm text-[#8a5c0f]">Add your Paybill or Till number first. <Link href="/app/onboarding?step=4" className="font-semibold underline">Go back</Link></p>
                  )}
                </div>
              </div>
              <form action={goToStep} className="mt-8"><input type="hidden" name="step" value="6" /><button className="btn btn-primary">Continue</button></form>
            </Step>
          );
        })()}

        {step === 6 && (() => {
          const current = (rule?.tone as Tone) ?? "standard";
          const sample = units.find((u) => u.status === "occupied") ?? units[0];
          const vars = { first_name: "Wanjiru", amount: sample?.rent_amount ? ksh(sample.rent_amount).replace("KSh ", "") : "15,000", balance: sample?.rent_amount ? ksh(sample.rent_amount).replace("KSh ", "") : "15,000", unit: sample?.label ?? "B4", unit_code: sample?.unit_code ?? "SUN-B4", due_date: "5 Dec", paybill: pay?.shortcode ?? "—", link: "rentife.co.ke/t/…", manager_name: org.name, manager_phone: org.contact_phone ?? "your landlord’s number" };
          return (
            <Step title="Choose your reminders" text="Polite, predictable reminders by SMS. They stop the moment a tenant pays, and never go out between 9pm and 7am.">
              <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
                <div className="h-fit rounded-[1.5rem] bg-white p-6 shadow-soft">
                  <ActionForm action={saveReminders} submit="Save and continue" resetOnSuccess={false}>
                    <fieldset className="space-y-2">
                      <legend className="text-sm font-medium">Style</legend>
                      {(Object.entries(TONES) as [Tone, (typeof TONES)[Tone]][]).map(([k, t]) => (
                        <label key={k} className="flex cursor-pointer gap-3 rounded-xl border border-line p-3.5 has-[:checked]:border-plum-800 has-[:checked]:bg-plum-100">
                          <input type="radio" name="tone" value={k} defaultChecked={k === current} className="mt-1 accent-plum-800" />
                          <span><b>{t.label}</b><br /><span className="text-sm text-ink-600">{t.text}</span></span>
                        </label>
                      ))}
                    </fieldset>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="whatsapp" defaultChecked={rule?.channels?.includes("whatsapp")} className="accent-plum-800" /> Also send on WhatsApp to tenants who agreed</label>
                  </ActionForm>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium">What tenants receive (English)</p>
                  {REMINDER_STEPS.map((s) => (
                    <div key={s.key} className="rounded-2xl bg-white p-4 shadow-soft">
                      <p className="text-xs font-semibold text-ink-600">{s.label} · {Object.entries(TONES).filter(([, t]) => (t.offsets as readonly number[]).includes(s.offset)).map(([, t]) => t.label).join(", ")}</p>
                      <p className="mt-1.5 text-sm leading-relaxed">{render(s.key, "en", vars)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Step>
          );
        })()}

        {step === 7 && (() => {
          const checks = [
            { ok: true, label: "Your account and organisation" },
            { ok: !!props?.length, label: `${props?.length ?? 0} ${props?.length === 1 ? "property" : "properties"}`, href: "/app/onboarding?step=2" },
            { ok: units.length > 0, label: `${units.length} units with M-Pesa codes`, href: "/app/onboarding?step=3" },
            { ok: (tenantCount ?? 0) > 0, label: `${tenantCount ?? 0} tenants`, href: "/app/onboarding?step=3" },
            { ok: !!pay && pay.method !== "none_yet", label: pay?.method === "none_yet" ? "Paybill: not yet (statement import meanwhile)" : pay ? `Tenants pay via ${pay.method === "mpesa_till" ? "Till" : "Paybill"} ${pay.shortcode}` : "How tenants pay", href: "/app/onboarding?step=4" },
            { ok: !!rule, label: rule ? `Reminders: ${TONES[rule.tone as Tone]?.label ?? rule.tone}` : "Reminders", href: "/app/onboarding?step=6" },
          ];
          const done = checks.filter((c) => c.ok).length;
          return (
            <Step title="You’re ready to go live" text={`${done} of ${checks.length} done. Your first payment matched automatically starts your free period.`}>
              <div className="max-w-xl rounded-[1.5rem] bg-white p-6 shadow-soft">
                <div className="h-2 overflow-hidden rounded-full bg-cream-100"><div className="h-full rounded-full bg-paid" style={{ width: `${(done / checks.length) * 100}%` }} /></div>
                <ul className="mt-5 space-y-2.5">
                  {checks.map((c) => (
                    <li key={c.label} className="flex items-center gap-3">
                      {c.ok ? <CheckCircle size={22} weight="fill" className="shrink-0 text-paid" /> : <Circle size={22} className="shrink-0 text-ink-400" />}
                      <span className={c.ok ? "" : "text-ink-600"}>{c.label}</span>
                      {!c.ok && c.href && <Link href={c.href} className="ml-auto text-sm font-semibold text-pink-700">Do this</Link>}
                    </li>
                  ))}
                </ul>
                <form action={finishOnboarding} className="mt-6"><button className="btn btn-primary w-full">Go to my dashboard</button></form>
              </div>
            </Step>
          );
        })()}
      </main>
    </div>
  );
}

function Step({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <section>
      <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-lg text-ink-600">{text}</p>
      <div className="mt-8">{children}</div>
    </section>
  );
}
