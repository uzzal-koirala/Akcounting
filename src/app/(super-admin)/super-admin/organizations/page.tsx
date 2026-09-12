import { listLiveOrganizations } from "@/actions/organizations";
import { SuperAdminOrganizationsPage } from "@/components/super-admin-organizations-page";

export default async function OrganizationsPage() {
  const liveOrganizations = await listLiveOrganizations();
  return <SuperAdminOrganizationsPage liveOrganizations={liveOrganizations} />;
}
