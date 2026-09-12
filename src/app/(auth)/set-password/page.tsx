import { SetPasswordCard } from "@/components/set-password-card";

export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <SetPasswordCard token={token ?? ""} />;
}
