import { listNotificationsAdmin } from "@/actions/notifications";
import { SuperAdminNotificationsPage } from "@/components/super-admin-notifications-page";

export default async function AnnouncementsPage() {
  const notifications = await listNotificationsAdmin();
  return <SuperAdminNotificationsPage initialHistory={notifications} />;
}
