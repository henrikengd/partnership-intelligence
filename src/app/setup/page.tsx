import { redirect } from "next/navigation";
import { installationConfigured } from "@/server/organization";
import { AuthForm } from "@/components/auth-form";
import { AuthLayout } from "@/components/auth-layout";
export const dynamic = "force-dynamic";
export default async function Setup() {
  if (await installationConfigured()) redirect("/login");
  return (
    <AuthLayout
      title="Set up your private workspace"
      description="Create the first administrator. This installation serves one organization."
    >
      <AuthForm mode="setup" />
    </AuthLayout>
  );
}
