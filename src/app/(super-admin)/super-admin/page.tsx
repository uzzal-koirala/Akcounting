import { SuperAdminOverview } from "@/components/super-admin-overview";
import { getSession } from "@/lib/auth/session";
import { listLiveOrganizations, getSubscriptionMetrics } from "@/actions/organizations";
import { listAllPayments } from "@/actions/admin-payments";

export default async function SuperAdminPage() {
  const [session, organizations, subscriptionMetrics, paymentSummary] = await Promise.all([
    getSession(),
    listLiveOrganizations(),
    getSubscriptionMetrics(),
    listAllPayments(),
  ]);
  const firstName = (session?.name ?? "Admin").split(" ")[0];

  const topOrganizations = [...organizations].sort((a, b) => b.mrr - a.mrr).slice(0, 5);
  const recentCustomers = organizations.slice(0, 5);

  return <SuperAdminOverview
    adminName={firstName}
    organizations={topOrganizations}
    recentCustomers={recentCustomers}
    planDistribution={subscriptionMetrics.planDistribution}
    metrics={{
      totalRevenue: paymentSummary.totalRevenue,
      monthRevenue: paymentSummary.monthRevenue,
      monthChangePct: paymentSummary.monthChangePct,
      organizationCount: subscriptionMetrics.organizationCount,
      activeSubscriptions: subscriptionMetrics.activeSubscriptions,
      trialCount: subscriptionMetrics.trialCount,
    }}
  />;
}
