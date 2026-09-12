import { listAdminUsers } from "@/actions/admin-users";
import { PlatformUsersPage } from "@/components/platform-users-page";

export default async function AdminUsersPage() {
  const admins = await listAdminUsers();
  return <PlatformUsersPage initialAdmins={admins} />;
}
