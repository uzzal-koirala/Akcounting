import { notFound } from "next/navigation";

import { getOrganization } from "@/lib/mock-organizations";
import { getLiveOrganization, getOrganizationDetail } from "@/actions/organizations";
import { SuperAdminOrganizationProfile } from "@/components/super-admin-organization-profile";

export default async function OrganizationProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (id.startsWith("user_")) {
    const userId = id.slice("user_".length);
    const [org, detail] = await Promise.all([getLiveOrganization(userId), getOrganizationDetail(userId)]);
    if (!org) notFound();
    return <SuperAdminOrganizationProfile org={org} detail={detail} />;
  }

  const org = getOrganization(id);
  if (!org) notFound();
  return <SuperAdminOrganizationProfile org={org} detail={null} />;
}
