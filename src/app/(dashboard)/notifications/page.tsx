import { listNotificationsForUser } from "@/actions/notifications";
import { NotificationsPage } from "@/components/notifications-page";

export default async function Page() {
  const notifications = await listNotificationsForUser();
  return <NotificationsPage initialNotifications={notifications} />;
}
