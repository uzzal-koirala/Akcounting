import { getBusinessProfile } from "@/actions/business-profile";
import { getCalendarPreference, getBusinessCycle } from "@/actions/preferences";
import { getMySubscriptionOverview } from "@/actions/subscription";
import { getMyAiUsage } from "@/actions/ai-usage";
import { getMyProfile } from "@/actions/user-profile";
import { ProfilePage } from "@/components/profile-page";

export default async function SettingsRoute({ searchParams }: { searchParams: Promise<{ tab?: string; aiCredits?: string }> }) {
  const [businessProfile, calendarPreference, businessCycle, subscriptionOverview, aiUsage, myProfile] = await Promise.all([getBusinessProfile(), getCalendarPreference(), getBusinessCycle(), getMySubscriptionOverview(), getMyAiUsage(), getMyProfile()]);
  const { tab, aiCredits } = await searchParams;
  return (
    <ProfilePage
      businessProfile={businessProfile}
      calendarPreference={calendarPreference}
      businessCycle={businessCycle}
      subscriptionOverview={subscriptionOverview}
      aiUsage={aiUsage}
      myProfile={myProfile}
      initialTab={tab === "ai" ? "ai" : undefined}
      aiCreditStatus={aiCredits === "1" ? "success" : aiCredits === "0" ? "failed" : null}
    />
  );
}
