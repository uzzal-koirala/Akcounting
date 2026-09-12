import { getAffiliateOverview, listAffiliateRewards, listTopReferrers, listWithdrawalRequests } from "@/actions/admin-affiliate";
import { SuperAdminAffiliatePage } from "@/components/super-admin-affiliate-page";

export default async function AffiliatesPage() {
  const [overview, topReferrers, rewards, withdrawals] = await Promise.all([getAffiliateOverview(), listTopReferrers(), listAffiliateRewards(), listWithdrawalRequests()]);
  return <SuperAdminAffiliatePage overview={overview} topReferrers={topReferrers} rewards={rewards} withdrawals={withdrawals} />;
}
