import { listPlans } from "@/actions/plans";
import { listCoupons } from "@/actions/coupons";
import { PlansBillingPage } from "@/components/plans-billing-page";

export default async function PlansPage() {
  const [plans, coupons] = await Promise.all([listPlans(), listCoupons()]);
  return <PlansBillingPage plans={plans} coupons={coupons} />;
}
