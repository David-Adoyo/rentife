import Link from "next/link";
import { inviteIsValid } from "../../actions";
import { AuthCard } from "@/components/admin/AuthCard";
import { InviteFlow } from "./InviteFlow";

export const dynamic = "force-dynamic";

export default async function Invite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await inviteIsValid(token);
  if (!invite) {
    return (
      <AuthCard title="This link has expired" text="Invite links work once and last 24 hours. Ask for a new one.">
        <Link href="/admin/login" className="btn btn-outline w-full">Go to sign in</Link>
      </AuthCard>
    );
  }
  return <InviteFlow token={token} email={invite.email} />;
}
