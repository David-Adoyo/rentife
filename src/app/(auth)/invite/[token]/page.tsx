import type { Metadata } from "next";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { AuthShell } from "@/components/app/ui";
import { ActionForm } from "@/components/app/ActionForm";
import { acceptInvite } from "../../actions";

export const metadata: Metadata = { title: "Accept invitation", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Invite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const here = `/invite/${token}`;
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return (
      <AuthShell title="You’ve been invited to Rentife" text="Create an account with the email address the invitation was sent to, or sign in if you already have one.">
        <div className="grid gap-3">
          <Link href={`/signup?next=${encodeURIComponent(here)}`} className="btn btn-primary">Create an account</Link>
          <Link href={`/login?next=${encodeURIComponent(here)}`} className="btn btn-outline">Sign in</Link>
        </div>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Join this Rentife account" text={<>You’re signed in as <b className="text-ink-900">{auth.user.email}</b>. Accept to join the team.</>}>
      <ActionForm action={acceptInvite} submit="Accept invitation" submitClass="btn btn-primary w-full" resetOnSuccess={false}>
        <input type="hidden" name="token" value={token} />
      </ActionForm>
    </AuthShell>
  );
}
