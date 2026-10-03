import { AuthForm } from "@/components/auth-form";
import { AuthLayout } from "@/components/auth-layout";
export default async function Invite({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthLayout
      title="Join your partnership team"
      description="Use the exact email address your administrator invited."
    >
      {token ? (
        <AuthForm mode="invite" token={token} />
      ) : (
        <p className="error">An invitation link is required.</p>
      )}
    </AuthLayout>
  );
}
