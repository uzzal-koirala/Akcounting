import { redirect } from "next/navigation";

import { SuperAdminSidebar } from "@/components/super-admin-sidebar";
import { getSession } from "@/lib/auth/session";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/dashboard");

  return <div className="min-h-screen bg-[#f8f8fc] md:flex"><SuperAdminSidebar user={{ name: session.name, email: session.email }} /><main className="w-full min-w-0 p-5 pt-20 md:p-7 lg:p-8">{children}</main></div>;
}
