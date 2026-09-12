import { getSession } from "@/lib/auth/session";
import { getCurrentPlan } from "@/actions/plan";
import { listTeamMembers } from "@/actions/team-members";
import { UsersRolesPage } from "@/components/users-roles-page";

export default async function Page() {
  const [session, plan, members] = await Promise.all([getSession(), getCurrentPlan(), listTeamMembers()]);
  const isOwner = !session?.ownerId;
  return <UsersRolesPage plan={plan} initialMembers={members} isOwner={isOwner} />;
}
