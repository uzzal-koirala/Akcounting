import { getReferralInfo } from "@/actions/referral";
import { ReferPage } from "@/components/refer-page";

export default async function ReferRoute() {
  const referral = await getReferralInfo();
  return <ReferPage referral={referral} />;
}
