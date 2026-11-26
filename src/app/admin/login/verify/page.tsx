import { redirect } from "next/navigation";
import { pendingAdmin } from "@/lib/admin/session";
import { AuthCard } from "@/components/admin/AuthCard";
import { CodeForm } from "./CodeForm";

export const dynamic = "force-dynamic";

export default async function Verify() {
  if (!(await pendingAdmin())) redirect("/admin/login");
  return (
    <AuthCard title="Enter your code" text="Open your authenticator app and enter the 6-digit code for Rentife.">
      <CodeForm />
    </AuthCard>
  );
}
