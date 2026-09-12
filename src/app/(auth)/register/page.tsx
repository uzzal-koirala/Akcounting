import { AuthCard } from "@/components/auth-card";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  return <AuthCard mode="register" referralCode={ref ?? null} />;
}
