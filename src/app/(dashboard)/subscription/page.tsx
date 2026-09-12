import { requireUserId } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { toPlanName } from "@/lib/plan";
import { daysUntil } from "@/lib/subscription";
import { listPlans } from "@/actions/plans";
import { getMySubscriptionStatus } from "@/actions/subscription";
import { SubscriptionPage } from "@/components/subscription-page";

export default async function SubscriptionRoute({ searchParams }: { searchParams: Promise<{ paid?: string; ended?: string }> }) {
  const userId = await requireUserId();
  const [user, plans, subscriptionStatus] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { plan: true } }),
    listPlans(),
    getMySubscriptionStatus(),
  ]);
  const { paid, ended } = await searchParams;
  const endedReason = ended === "subscription" ? "subscription" : ended === "trial" ? "trial" : null;

  const trialDaysLeft = !subscriptionStatus.hasPaid && !subscriptionStatus.isExpired && subscriptionStatus.planRenewsAt
    ? daysUntil(new Date(subscriptionStatus.planRenewsAt))
    : null;

  return (
    <SubscriptionPage
      currentPlan={toPlanName(user?.plan)}
      plans={plans}
      paidStatus={paid === "1" ? "success" : paid === "0" ? "failed" : null}
      endedReason={endedReason}
      canExtend={subscriptionStatus.canExtend}
      isExpired={subscriptionStatus.isExpired}
      hasPaid={subscriptionStatus.hasPaid}
      trialDaysLeft={trialDaysLeft}
    />
  );
}
