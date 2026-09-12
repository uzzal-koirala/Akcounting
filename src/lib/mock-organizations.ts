export type OrgStatus = "Active" | "Trial" | "Past due" | "Suspended";
export type SubscriptionState = "Not started" | "Trial" | "Subscribed" | "Extended" | "Expired";
export type Organization = {
  id: string;
  name: string;
  initials: string;
  owner: string;
  email: string;
  phone: string;
  address: string;
  panVat: string;
  plan: "Starter" | "Growth" | "Business";
  status: OrgStatus;
  members: number;
  mrr: number;
  joined: string;
  renewsOn: string;
  daysLeft: number;
  totalDays: number;
  tone: string;
  suspendReason?: string;
  /** Set when this card is backed by a real registered AKCounting user rather than demo data. */
  isLive?: boolean;
  /** Set when the account's login is currently locked out from too many failed password attempts. */
  isLocked?: boolean;
  /** Free 3-day extensions this user has claimed after their subscription ended. Live orgs only. */
  extensions?: { id: string; days: number; extendedAt: string; endsAt: string }[];
  /** Real billing state — whether this account is still on a free trial, actually paying, running on a free extension, or expired. Live orgs only. */
  subscriptionState?: SubscriptionState;
  /** Date of the first completed payment (i.e. when they actually became a paying subscriber), or null if they've never paid. Live orgs only. */
  subscriptionDate?: string | null;
};

/** Maps the real subscription plan names to the mock plan-tier buckets used for card styling. */
export function toMockPlanTier(realPlanName: string): Organization["plan"] {
  if (realPlanName === "Growth Package") return "Growth";
  if (realPlanName === "Premium Package") return "Business";
  return "Starter";
}

export const LIVE_TONES = ["from-violet-500 to-violet-700", "from-blue-500 to-blue-700", "from-emerald-500 to-emerald-700", "from-amber-500 to-amber-700", "from-cyan-500 to-cyan-700", "from-rose-500 to-rose-700"];

export type OrgMember = { name: string; role: string; email: string; initials: string };
export type OrgInvoice = { id: string; date: string; amount: number; status: "Paid" | "Failed" | "Pending"; method?: string };
export type OrgActivity = { text: string; time: string };
export type TicketStatus = "Open" | "Pending" | "In progress" | "Resolved";
export type TicketPriority = "Low" | "Normal" | "Medium" | "High" | "Urgent";
export type OrgTicket = { id: string; subject: string; raisedBy: string; status: TicketStatus; priority: TicketPriority; time: string };

export const PAYMENT_METHODS = ["eSewa", "Bank Transfer", "Cash", "Cheque", "Credit Card"] as const;
export const TICKET_STATUS_TONE: Record<TicketStatus, string> = { Open: "bg-blue-50 text-blue-700", Pending: "bg-amber-50 text-amber-700", "In progress": "bg-amber-50 text-amber-700", Resolved: "bg-emerald-50 text-emerald-700" };
export const TICKET_PRIORITY_TONE: Record<TicketPriority, string> = { Low: "bg-slate-100 text-slate-600", Normal: "bg-blue-50 text-blue-600", Medium: "bg-blue-50 text-blue-600", High: "bg-amber-50 text-amber-600", Urgent: "bg-rose-50 text-rose-600" };

export const money = (value: number) => `Rs ${new Intl.NumberFormat("en-NP", { maximumFractionDigits: 0 }).format(value)}`;
export const STATUS_TONE: Record<OrgStatus, string> = { Active: "bg-emerald-50 text-emerald-700", Trial: "bg-blue-50 text-blue-700", "Past due": "bg-rose-50 text-rose-700", Suspended: "bg-slate-200 text-slate-600" };
export const SUBSCRIPTION_STATE_TONE: Record<SubscriptionState, string> = { "Not started": "bg-slate-100 text-slate-500", Trial: "bg-blue-50 text-blue-700", Subscribed: "bg-emerald-50 text-emerald-700", Extended: "bg-amber-50 text-amber-700", Expired: "bg-rose-50 text-rose-700" };
export const PLAN_TONE: Record<Organization["plan"], string> = { Starter: "bg-slate-100 text-slate-600", Growth: "bg-violet-50 text-violet-700", Business: "bg-[#0b2a56]/10 text-[#0b2a56]" };
export const PLAN_CARD_TONE: Record<Organization["plan"], string> = { Starter: "border-slate-200 bg-slate-50/60 hover:border-slate-300", Growth: "border-violet-200 bg-violet-50/50 hover:border-violet-300", Business: "border-blue-200 bg-blue-50/50 hover:border-blue-300" };
export const PLAN_BORDER_TONE: Record<Organization["plan"], string> = { Starter: "border-l-slate-300", Growth: "border-l-violet-400", Business: "border-l-blue-400" };
export const PLAN_ACCENT_BAR: Record<Organization["plan"], string> = { Starter: "bg-slate-400", Growth: "bg-violet-500", Business: "bg-blue-500" };
export const PLAN_ICON_CHIP: Record<Organization["plan"], string> = { Starter: "bg-slate-100 text-slate-500", Growth: "bg-violet-100 text-violet-600", Business: "bg-blue-100 text-blue-600" };
export const PLAN_CARD_BORDER: Record<Organization["plan"], string> = { Starter: "border-slate-200 hover:border-slate-300", Growth: "border-violet-200 hover:border-violet-300", Business: "border-blue-200 hover:border-blue-300" };
export const PLAN_SOFT_BG: Record<Organization["plan"], string> = { Starter: "bg-slate-50", Growth: "bg-violet-50", Business: "bg-blue-50" };

export const ORGANIZATIONS: Organization[] = [
  { id: "org_1", name: "Everest Commerce", initials: "EC", owner: "Aarav Joshi", email: "aarav@everestcommerce.com", phone: "+977 981-2345678", address: "Baneshwor, Kathmandu", panVat: "600123456", plan: "Business", status: "Active", members: 28, mrr: 24500, joined: "Jan 14, 2025", renewsOn: "Sep 25, 2026", daysLeft: 22, totalDays: 30, tone: "from-violet-500 to-violet-700" },
  { id: "org_2", name: "Himalayan Works", initials: "HW", owner: "Priya Rai", email: "priya@himalayanworks.com", phone: "+977 984-1122334", address: "New Road, Pokhara", panVat: "600223344", plan: "Growth", status: "Active", members: 11, mrr: 8900, joined: "Mar 02, 2025", renewsOn: "Sep 12, 2026", daysLeft: 9, totalDays: 30, tone: "from-blue-500 to-blue-700" },
  { id: "org_3", name: "Cloud Nine Labs", initials: "CN", owner: "Suman Karki", email: "suman@cloudninelabs.io", phone: "+977 970-5566778", address: "Butwal, Rupandehi", panVat: "600334455", plan: "Starter", status: "Trial", members: 3, mrr: 0, joined: "Jun 21, 2025", renewsOn: "Sep 08, 2026", daysLeft: 5, totalDays: 14, tone: "from-amber-500 to-amber-700" },
  { id: "org_4", name: "Kathmandu Digital", initials: "KD", owner: "Neha Shrestha", email: "neha@kathmandudigital.com", phone: "+977 985-9988776", address: "Lalitpur, Kathmandu", panVat: "600445566", plan: "Growth", status: "Active", members: 8, mrr: 8900, joined: "Sep 10, 2024", renewsOn: "Sep 21, 2026", daysLeft: 18, totalDays: 30, tone: "from-emerald-500 to-emerald-700" },
  { id: "org_5", name: "Sagarmatha Traders", initials: "ST", owner: "Rojina Lama", email: "rojina@sagarmathatraders.com", phone: "+977 961-3344556", address: "Biratnagar, Morang", panVat: "600556677", plan: "Starter", status: "Past due", members: 4, mrr: 0, joined: "Nov 28, 2025", renewsOn: "Sep 01, 2026", daysLeft: 0, totalDays: 30, tone: "from-rose-500 to-rose-700" },
  { id: "org_6", name: "Pokhara Foods", initials: "PF", owner: "Bikash Thapa", email: "bikash@pokharafoods.com", phone: "+977 970-1122334", address: "Lakeside, Pokhara", panVat: "600667788", plan: "Business", status: "Active", members: 34, mrr: 24500, joined: "Dec 05, 2025", renewsOn: "Sep 30, 2026", daysLeft: 27, totalDays: 30, tone: "from-cyan-500 to-cyan-700" },
];

export function getOrganization(id: string) {
  return ORGANIZATIONS.find((org) => org.id === id) ?? null;
}

export function getOrgMembers(org: Organization): OrgMember[] {
  const seed = [
    { name: org.owner, role: "Owner", tone: 0 },
    { name: "Sita Gurung", role: "Accountant", tone: 1 },
    { name: "Milan Adhikari", role: "Team Member", tone: 2 },
    { name: "Puja Karki", role: "Team Member", tone: 3 },
  ];
  return seed.slice(0, Math.min(4, Math.max(1, Math.min(org.members, 4)))).map((member) => ({
    name: member.name,
    role: member.role,
    email: `${member.name.toLowerCase().replace(/\s+/g, ".")}@${org.email.split("@")[1]}`,
    initials: member.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase(),
  }));
}

export function getOrgInvoices(org: Organization): OrgInvoice[] {
  if (org.mrr <= 0) return [{ id: `INV-${org.id.slice(-3)}-1`, date: org.joined, amount: 0, status: "Pending" }];
  return [
    { id: `INV-${org.id.slice(-3)}-4`, date: "Aug 25, 2026", amount: org.mrr, status: "Paid" },
    { id: `INV-${org.id.slice(-3)}-3`, date: "Jul 25, 2026", amount: org.mrr, status: "Paid" },
    { id: `INV-${org.id.slice(-3)}-2`, date: "Jun 25, 2026", amount: org.mrr, status: org.status === "Past due" ? "Failed" : "Paid" },
    { id: `INV-${org.id.slice(-3)}-1`, date: "May 25, 2026", amount: org.mrr, status: "Paid" },
  ];
}

export function getOrgTickets(org: Organization): OrgTicket[] {
  const base: OrgTicket[] = [
    { id: `TKT-${org.id.slice(-3)}-1`, subject: "Cannot download PDF invoice", raisedBy: org.owner, status: "Open", priority: "High", time: "2 hours ago" },
    { id: `TKT-${org.id.slice(-3)}-2`, subject: "Requesting plan upgrade", raisedBy: org.owner, status: "Pending", priority: "Normal", time: "1 day ago" },
    { id: `TKT-${org.id.slice(-3)}-3`, subject: "Payment mismatch on last invoice", raisedBy: org.owner, status: "Resolved", priority: "Urgent", time: "5 days ago" },
  ];
  if (org.status === "Past due") base.unshift({ id: `TKT-${org.id.slice(-3)}-0`, subject: "Payment failed — please retry", raisedBy: org.owner, status: "Open", priority: "Urgent", time: "3 hours ago" });
  return base;
}

export function getOrgActivity(org: Organization): OrgActivity[] {
  return [
    { text: `${org.owner} updated the business profile`, time: "2 days ago" },
    { text: `Invoice for ${money(org.mrr || 5000)} generated`, time: "6 days ago" },
    { text: "New team member invited", time: "12 days ago" },
    { text: `Upgraded to ${org.plan} plan`, time: "1 month ago" },
    { text: "Workspace created", time: org.joined },
  ];
}
