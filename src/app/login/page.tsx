import { AuthForm } from "@/components/auth-form";
import { AuthLayout } from "@/components/auth-layout";
export default function Login() {
  return (
    <AuthLayout
      title="Sign in"
      description="Use the account invited by your partnership administrator."
    >
      <AuthForm mode="login" />
    </AuthLayout>
  );
}
