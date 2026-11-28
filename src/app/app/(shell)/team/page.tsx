import type { Metadata } from "next";
import { appContext } from "@/lib/app/context";
import { ActionForm } from "@/components/app/ActionForm";
import { Card, Field, PageHeader, input, roleLabel } from "@/components/app/ui";
import { dateKE } from "@/lib/money";
import { createOwner, inviteMember, removeMember, revokeInvite, updateMember } from "../../actions";

export const metadata: Metadata = { title: "Team" };

const roleHelp: Record<string, string> = {
  manager: "Runs properties day to day. Cannot change billing or payment settings.",
  accountant: "Reads ledgers and reports, exports. Cannot change anything.",
  caretaker: "Meter readings, repairs, inspections. Sees who has paid, not amounts. Never handles money.",
  passive_owner: "An owner whose units you manage: views their own properties and statements.",
};

export default async function Team() {
  const { supabase, org, can, user } = await appContext();
  const [{ data: members }, { data: props }, { data: invites }, { data: owners }] = await Promise.all([
    supabase.from("memberships").select("id, user_id, role, property_scope, created_at").eq("org_id", org.id).order("created_at"),
    supabase.from("properties").select("id, name").eq("org_id", org.id).order("name"),
    can.manageTeam ? supabase.from("invitations").select("id, email, role, expires_at, accepted_at").eq("org_id", org.id).is("accepted_at", null).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    can.edit ? supabase.from("owners").select("id, full_name, phone, residency").eq("org_id", org.id).order("full_name") : Promise.resolve({ data: [] }),
  ]);
  const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", (members ?? []).map((m) => m.user_id));
  const who = (uid: string) => profiles?.find((p) => p.user_id === uid);
  const propName = (id: string) => props?.find((p) => p.id === id)?.name ?? "—";
  const scopeBoxes = (name: string, selected: string[] | null) => (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium">Properties</legend>
      <p className="text-xs text-ink-600">Leave all unticked for every property (not allowed for caretakers).</p>
      {props?.map((p) => (
        <label key={p.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name={name} value={p.id} defaultChecked={selected?.includes(p.id)} className="accent-plum-800" /> {p.name}</label>
      ))}
    </fieldset>
  );

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={org.name} title="Team" />
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <section aria-label="Members" className="space-y-3">
            {members?.map((m) => {
              const p = who(m.user_id);
              return (
                <details key={m.id} className="rounded-[1.25rem] bg-white shadow-soft">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 [&::-webkit-details-marker]:hidden">
                    <span><span className="block font-medium">{p?.full_name || p?.email || "Team member"}{m.user_id === user.id && " (you)"}</span><span className="text-sm text-ink-600">{p?.email}</span></span>
                    <span className="text-right text-sm"><b>{roleLabel[m.role]}</b><br /><span className="text-ink-600">{m.property_scope ? m.property_scope.map(propName).join(", ") : "All properties"}</span></span>
                  </summary>
                  {can.manageTeam && (
                    <div className="grid gap-5 border-t border-line p-4 sm:grid-cols-[1.4fr_1fr]">
                      <ActionForm action={updateMember} submit="Save" resetOnSuccess={false} submitClass="btn btn-outline h-10 min-h-10">
                        <input type="hidden" name="id" value={m.id} />
                        <Field label="Role" htmlFor={`role-${m.id}`}>
                          <select id={`role-${m.id}`} name="role" defaultValue={m.role} className={input}>
                            {Object.entries(roleLabel).filter(([r]) => r !== "passive_owner" || m.role === "passive_owner").map(([r, l]) => <option key={r} value={r}>{l}</option>)}
                          </select>
                        </Field>
                        {scopeBoxes("property_scope", m.property_scope)}
                      </ActionForm>
                      {m.user_id !== user.id && (
                        <ActionForm action={removeMember} submit="Remove from team" submitClass="btn h-10 min-h-10 border border-overdue/40 text-overdue hover:bg-overdue/10">
                          <input type="hidden" name="id" value={m.id} />
                          <p className="text-sm text-ink-600">They lose access straight away. Their past actions stay in the activity log.</p>
                        </ActionForm>
                      )}
                    </div>
                  )}
                </details>
              );
            })}
          </section>

          {!!invites?.length && (
            <Card>
              <h2 className="font-medium">Waiting to accept</h2>
              <ul className="mt-3 divide-y divide-line">
                {invites.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <span><b>{i.email}</b> · {roleLabel[i.role]} · expires {dateKE(i.expires_at)}</span>
                    <ActionForm action={revokeInvite} submit="Cancel" className="" submitClass="text-sm font-semibold text-overdue"><input type="hidden" name="id" value={i.id} /></ActionForm>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {org.type === "agency" && can.edit && (
            <Card>
              <h2 className="font-medium">Property owners</h2>
              <p className="mt-1 text-sm text-ink-600">The people whose buildings you manage. Link them to properties and invite them to view their own statements.</p>
              <ul className="mt-3 divide-y divide-line text-sm">
                {owners?.map((o) => <li key={o.id} className="flex justify-between py-2.5"><span>{o.full_name}</span><span className="num text-ink-600">{o.phone ?? ""}{o.residency === "non_resident" ? " · abroad" : ""}</span></li>)}
                {!owners?.length && <li className="py-2.5 text-ink-600">No owners added yet.</li>}
              </ul>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold text-pink-700">Add an owner</summary>
                <div className="mt-3">
                  <ActionForm action={createOwner} submit="Add owner">
                    <Field label="Full name" htmlFor="o-name"><input id="o-name" name="full_name" required className={input} /></Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Phone" htmlFor="o-phone"><input id="o-phone" name="phone" type="tel" className={input} /></Field>
                      <Field label="Lives" htmlFor="o-res"><select id="o-res" name="residency" className={input}><option value="resident">In Kenya</option><option value="non_resident">Abroad</option></select></Field>
                    </div>
                    <Field label="Email" htmlFor="o-email"><input id="o-email" name="email" type="email" className={input} /></Field>
                  </ActionForm>
                </div>
              </details>
            </Card>
          )}
        </div>

        {can.manageTeam ? (
          <Card className="h-fit">
            <h2 className="text-lg font-medium">Invite someone</h2>
            <div className="mt-4">
              <ActionForm action={inviteMember} submit="Send invitation">
                <Field label="Email" htmlFor="i-email"><input id="i-email" name="email" type="email" required className={input} /></Field>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Role</legend>
                  {Object.entries(roleHelp).filter(([r]) => r !== "passive_owner" || org.type === "agency").map(([r, help], i) => (
                    <label key={r} className="flex cursor-pointer gap-3 rounded-xl border border-line p-3 text-sm has-[:checked]:border-plum-800 has-[:checked]:bg-plum-100">
                      <input type="radio" name="role" value={r} defaultChecked={i === 0} className="mt-1 accent-plum-800" />
                      <span><b>{roleLabel[r]}</b><br /><span className="text-ink-600">{help}</span></span>
                    </label>
                  ))}
                </fieldset>
                {scopeBoxes("property_scope", null)}
                {org.type === "agency" && !!owners?.length && (
                  <Field label="Owner record (property owners only)" htmlFor="i-owner">
                    <select id="i-owner" name="owner_id" className={input}><option value="">—</option>{owners.map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}</select>
                  </Field>
                )}
              </ActionForm>
            </div>
          </Card>
        ) : (
          <Card className="h-fit text-sm text-ink-600">Only the organisation’s owners can invite people or change roles.</Card>
        )}
      </div>
    </div>
  );
}
