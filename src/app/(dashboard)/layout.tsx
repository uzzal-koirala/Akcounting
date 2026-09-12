import { headers } from "next/headers";

import { AiAssistant } from "@/components/ai-assistant";
import { Sidebar } from "@/components/sidebar";
import { getUnreadNotificationCount } from "@/actions/notifications";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { SuspendedNotice } from "@/components/suspended-notice";
import { SubscriptionEndedNotice } from "@/components/subscription-ended-notice";
import { TrialBanner } from "@/components/trial-banner";
import { ExtensionWarningBanner } from "@/components/extension-warning-banner";
import { PlanSelectionGate } from "@/components/plan-selection-gate";
import { listPlans } from "@/actions/plans";
import { daysUntil, isPlanExpired } from "@/lib/subscription";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const [user, paidPaymentCount, lastPayment, latestExtension, unreadNotifications, headersList] = await Promise.all([
    session ? prisma.user.findUnique({ where: { id: session.userId }, select: { plan: true, status: true, suspendReason: true, planRenewsAt: true, avatarUrl: true } }) : null,
    session ? prisma.payment.count({ where: { userId: session.userId, status: "Complete" } }) : 0,
    session ? prisma.payment.findFirst({ where: { userId: session.userId, status: "Complete" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }) : null,
    session ? prisma.subscriptionExtension.findFirst({ where: { userId: session.userId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }) : null,
    session ? getUnreadNotificationCount() : Promise.resolve(0),
    headers(),
  ]);

  if (session && user?.status === "Suspended") return <SuspendedNotice reason={user.suspendReason} />;

  // Brand-new accounts (never picked a plan, so planRenewsAt is still null) are blocked behind a
  // mandatory plan-picker until they choose one and start their 7-day free trial — no dashboard
  // page renders until then, whether this is right after signup or a later login.
  if (session && !session.ownerId && !user?.planRenewsAt) {
    const plans = await listPlans();
    return <PlanSelectionGate plans={plans} name={session.name.split(" ")[0]} />;
  }

  const pathname = headersList.get("x-pathname") ?? "";
  const subscriptionExpired = Boolean(session) && isPlanExpired(user?.planRenewsAt);
  if (subscriptionExpired && pathname !== "/subscription") return <SubscriptionEndedNotice />;

  const isOnFreeTrial = Boolean(session) && paidPaymentCount === 0 && !subscriptionExpired;
  const trialDaysLeft = isOnFreeTrial ? daysUntil(user?.planRenewsAt) : 0;

  const isOnFreeExtension = Boolean(session) && !subscriptionExpired && Boolean(latestExtension) && (!lastPayment || latestExtension!.createdAt.getTime() > lastPayment.createdAt.getTime());
  const extensionDaysLeft = isOnFreeExtension ? daysUntil(user?.planRenewsAt) : 0;

  return <div className="min-h-screen bg-[#f8f8fc] md:flex">
    <Sidebar user={session ? { name: session.name, email: session.email, plan: user?.plan, avatarUrl: user?.avatarUrl } : undefined} initialUnreadCount={unreadNotifications} />
    <main className="w-full min-w-0 p-5 pt-20 md:p-7 lg:p-8">
      {isOnFreeExtension && pathname !== "/subscription" && <ExtensionWarningBanner daysLeft={extensionDaysLeft} />}
      {isOnFreeTrial && pathname !== "/subscription" && <TrialBanner daysLeft={trialDaysLeft} />}
      {children}
    </main>
    {session && <AiAssistant />}
  </div>;
}
