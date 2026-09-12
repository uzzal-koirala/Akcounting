"use client";

import { AlertTriangle, ArrowLeft, Ban, Building2, Calendar, CheckCircle2, ChevronDown, Clock3, CreditCard, Download, Eye, EyeOff, Headphones, KeyRound, Lock, LockKeyholeOpen, Mail, MapPin, MessageSquare, MoreHorizontal, Pencil, Phone, PlayCircle, Plus, ReceiptText, ShieldCheck, Trash2, TrendingUp, Wallet, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";

import { deleteOrganizationAccount, extendLiveSubscription, reactivateUser, setLiveSubscription, suspendUser, unlockUser, updateOrganizationDetails, updateUserCredentials, type OrganizationDetail } from "@/actions/organizations";
import { getOrgInvoices, getOrgMembers, getOrgTickets, money, PAYMENT_METHODS, SUBSCRIPTION_STATE_TONE, TICKET_PRIORITY_TONE, TICKET_STATUS_TONE, type Organization, type OrgInvoice } from "@/lib/mock-organizations";

const INVOICE_STATUS_TONE = { Paid: "bg-emerald-50 text-emerald-700", Failed: "bg-rose-50 text-rose-700", Pending: "bg-amber-50 text-amber-700" } as const;
const EXTEND_OPTIONS = [7, 30, 90] as const;
const PLAN_PRICE: Record<Organization["plan"], number> = { Starter: 0, Growth: 8900, Business: 24500 };

function addDays(dateLabel: string, days: number) {
  const parsed = new Date(dateLabel);
  const base = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  base.setDate(base.getDate() + days);
  return base.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export function SuperAdminOrganizationProfile({ org: initialOrg, detail }: { org: Organization; detail: OrganizationDetail | null }) {
  const router = useRouter();
  const [org, setOrg] = useState(initialOrg);
  const [extraInvoices, setExtraInvoices] = useState<OrgInvoice[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendReasonDraft, setSuspendReasonDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [banner, setBanner] = useState("");
  const [suspendError, setSuspendError] = useState("");
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [credentialsError, setCredentialsError] = useState("");
  const [showCredentialsPassword, setShowCredentialsPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const extendRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const liveUserId = org.isLive ? org.id.slice("user_".length) : null;

  const members = detail?.members ?? getOrgMembers(org);
  const invoices = detail ? detail.invoices : [...extraInvoices, ...getOrgInvoices(org)];
  const tickets = detail?.tickets ?? getOrgTickets(org);
  const openTicketCount = tickets.filter((ticket) => ticket.status !== "Resolved").length;
  const lifetimeValue = invoices.filter((invoice) => invoice.status === "Paid").reduce((sum, invoice) => sum + invoice.amount, 0);
  const progress = Math.round((org.daysLeft / org.totalDays) * 100);
  const isSuspended = org.status === "Suspended";

  useEffect(() => {
    if (!banner) return;
    const timer = window.setTimeout(() => setBanner(""), 3500);
    return () => window.clearTimeout(timer);
  }, [banner]);

  useEffect(() => {
    function onOutsideClick(event: MouseEvent) {
      if (extendRef.current && !extendRef.current.contains(event.target as Node)) setExtendOpen(false);
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) setMoreOpen(false);
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  function toggleSuspend() {
    if (isSuspended) {
      if (liveUserId) {
        startTransition(async () => {
          try {
            await reactivateUser(liveUserId);
            setOrg((current) => ({ ...current, status: "Active", suspendReason: undefined }));
            setBanner(`${org.name} has been reactivated.`);
          } catch {
            setBanner("Could not reactivate this user. Please try again.");
          }
        });
      } else {
        setOrg((current) => ({ ...current, status: "Active", suspendReason: undefined }));
        setBanner(`${org.name} has been reactivated.`);
      }
    } else {
      setSuspendReasonDraft("");
      setSuspendError("");
      setSuspendDialogOpen(true);
    }
  }

  function confirmSuspendAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = suspendReasonDraft.trim();
    if (!reason) return;

    if (liveUserId) {
      startTransition(async () => {
        try {
          await suspendUser(liveUserId, reason);
          setOrg((current) => ({ ...current, status: "Suspended", suspendReason: reason }));
          setBanner(`${org.name} has been suspended and can no longer access AKCounting.`);
          setSuspendDialogOpen(false);
        } catch {
          setSuspendError("Could not suspend this user. Please try again.");
        }
      });
    } else {
      setOrg((current) => ({ ...current, status: "Suspended", suspendReason: reason }));
      setBanner(`${org.name} has been suspended and can no longer access AKCounting.`);
      setSuspendDialogOpen(false);
    }
  }

  function extendSubscription(days: number) {
    if (liveUserId) {
      startTransition(async () => {
        try {
          await extendLiveSubscription(liveUserId, days);
          setOrg((current) => ({ ...current, daysLeft: current.daysLeft + days, renewsOn: addDays(current.renewsOn, days) }));
          setBanner(`Subscription extended by ${days} days.`);
        } catch {
          setBanner("Could not extend this subscription. Please try again.");
        }
      });
    } else {
      setOrg((current) => ({ ...current, daysLeft: Math.min(current.totalDays, current.daysLeft + days), renewsOn: addDays(current.renewsOn, days) }));
      setBanner(`Subscription extended by ${days} days.`);
    }
    setExtendOpen(false);
  }

  function changePlan(plan: Organization["plan"]) {
    if (liveUserId) {
      startTransition(async () => {
        try {
          await setLiveSubscription(liveUserId, plan);
          setOrg((current) => ({ ...current, plan, status: "Active", suspendReason: undefined, daysLeft: current.totalDays }));
          setBanner(`Plan changed to ${plan}.`);
        } catch {
          setBanner("Could not change this plan. Please try again.");
        }
      });
    } else {
      setOrg((current) => ({ ...current, plan }));
      setBanner(`Plan changed to ${plan}.`);
    }
    setMoreOpen(false);
  }

  function unlockLogin() {
    if (!liveUserId) return;
    startTransition(async () => {
      try {
        await unlockUser(liveUserId);
        setOrg((current) => ({ ...current, isLocked: false }));
        setBanner(`${org.name}'s login has been unlocked.`);
      } catch {
        setBanner("Could not unlock this account. Please try again.");
      }
    });
  }

  function saveCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!liveUserId) return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get("loginEmail") ?? "").trim();
    const password = String(data.get("loginPassword") ?? "").trim();
    setCredentialsError("");

    startTransition(async () => {
      try {
        await updateUserCredentials(liveUserId, { email: email || undefined, password: password || undefined });
        setOrg((current) => ({ ...current, email: email || current.email }));
        setCredentialsOpen(false);
        setShowCredentialsPassword(false);
        setBanner("Login credentials updated.");
      } catch (err) {
        setCredentialsError(err instanceof Error ? err.message : "Could not update credentials. Please try again.");
      }
    });
  }

  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const owner = String(data.get("owner") ?? org.owner);
    const email = String(data.get("email") ?? org.email);
    const phone = String(data.get("phone") ?? org.phone);
    const address = String(data.get("address") ?? org.address);
    const panVat = String(data.get("panVat") ?? org.panVat);

    if (liveUserId) {
      startTransition(async () => {
        try {
          await updateOrganizationDetails(liveUserId, { owner, email, phone, address, panVat });
          setOrg((current) => ({ ...current, owner, email, phone, address, panVat }));
          setEditOpen(false);
          setBanner("Organization details updated.");
          router.refresh();
        } catch (err) {
          setBanner(err instanceof Error ? err.message : "Could not update organization details. Please try again.");
        }
      });
    } else {
      setOrg((current) => ({ ...current, owner, email, phone, address, panVat }));
      setEditOpen(false);
      setBanner("Organization details updated.");
    }
  }

  function addSubscription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const plan = String(data.get("plan")) as Organization["plan"];
    const method = String(data.get("method"));
    const amount = Number(data.get("amount")) || 0;
    const paidOn = String(data.get("paidOn")) || new Date().toISOString().slice(0, 10);
    const paidOnLabel = new Date(paidOn).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

    if (liveUserId) {
      startTransition(async () => {
        try {
          await setLiveSubscription(liveUserId, plan);
          setBanner(`New ${plan} subscription recorded at the plan's real price.`);
          router.refresh();
        } catch {
          setBanner("Could not record this subscription. Please try again.");
        }
      });
    } else {
      setExtraInvoices((current) => [{ id: `INV-${org.id.slice(-3)}-${current.length + invoices.length + 1}`, date: paidOnLabel, amount, status: "Paid", method }, ...current]);
      setOrg((current) => ({ ...current, plan, mrr: amount, status: current.status === "Trial" || current.status === "Suspended" ? "Active" : current.status, daysLeft: current.totalDays, renewsOn: addDays(paidOnLabel, 30) }));
      setBanner(`New ${plan} subscription recorded via ${method}.`);
    }
    setSubscriptionOpen(false);
  }

  function deleteOrganization(adminPassword: string) {
    if (liveUserId) {
      setDeleteError("");
      startTransition(async () => {
        try {
          await deleteOrganizationAccount(liveUserId, adminPassword);
          setConfirmDelete(false);
          router.push("/super-admin/organizations");
        } catch (err) {
          setDeleteError(err instanceof Error ? err.message : "Could not delete this organization. Please try again.");
        }
      });
    } else {
      setConfirmDelete(false);
      router.push("/super-admin/organizations");
    }
  }

  const isOnTrial = org.subscriptionState === "Trial" || org.subscriptionState === "Not started";
  const hasNotStarted = org.subscriptionState === "Not started";
  const stats = [
    { label: "Amount paid", value: isOnTrial ? "Free trial" : org.mrr > 0 ? money(org.mrr) : "—", icon: Wallet, tone: "bg-emerald-50 text-emerald-600" },
    { label: "Subscription date", value: org.subscriptionDate ?? "No subscription", icon: CreditCard, tone: org.subscriptionDate ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500" },
    { label: "Lifetime value", value: money(lifetimeValue), icon: TrendingUp, tone: "bg-violet-50 text-violet-600" },
    { label: isOnTrial && !hasNotStarted ? "Free trial end" : "Subscription end date", value: isSuspended ? "Suspended" : hasNotStarted ? "No plan yet" : org.renewsOn, icon: Calendar, tone: isSuspended || hasNotStarted ? "bg-slate-100 text-slate-500" : org.daysLeft <= 5 ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600" },
  ];

  return <div className="mx-auto max-w-[1500px] space-y-5">
    <Link href="/super-admin/organizations" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-violet-700"><ArrowLeft size={13} />Back to organizations</Link>

    {banner && <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[11px] font-medium text-emerald-700"><CheckCircle2 size={14} className="shrink-0" />{banner}</div>}

    {isSuspended && <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] text-rose-700"><Ban size={14} className="mt-0.5 shrink-0" /><div><span className="font-semibold">This organization is suspended.</span><span className="ml-1">{org.suspendReason ? <>Reason: {org.suspendReason}</> : "No reason was provided."}</span></div></div>}

    <header className="relative rounded-lg border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 shadow-[0_16px_40px_rgba(2,6,23,0.25)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg"><span className="absolute -right-16 -top-20 size-64 rounded-full bg-violet-500/20 blur-3xl" /></div>
      <div className="relative flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <span className={`grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-lg font-bold text-white shadow-lg ${org.tone} ${isSuspended ? "grayscale" : ""}`}>{org.initials}</span>
          <div>
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-semibold tracking-tight text-white">{org.name}</h1><span className="rounded-full bg-white/15 px-2 py-1 text-[8px] font-semibold text-white ring-1 ring-white/20">{org.status}</span><span className="rounded-md bg-white/10 px-2 py-1 text-[8px] font-semibold text-violet-100 ring-1 ring-white/15">{org.plan} plan</span>{org.subscriptionState && <span className={`rounded-full px-2 py-1 text-[8px] font-semibold ring-1 ring-white/10 ${SUBSCRIPTION_STATE_TONE[org.subscriptionState]}`}>{org.subscriptionState === "Trial" ? "Free trial" : org.subscriptionState === "Subscribed" ? "Active subscription" : org.subscriptionState}</span>}{org.isLocked && <span className="flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-1 text-[8px] font-semibold text-rose-200 ring-1 ring-rose-400/30"><Lock size={9} />Login locked</span>}</div>
            <p className="mt-1 text-[11px] text-slate-300">Owned by {org.owner} · Joined {org.joined}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-[10px] font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"><MessageSquare size={13} />Message</button>
          <button onClick={() => setEditOpen(true)} className="flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-[10px] font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"><Pencil size={13} />Edit</button>
          <button onClick={() => setSubscriptionOpen(true)} className="flex h-9 items-center gap-2 rounded-lg bg-violet-500 px-3 text-[10px] font-semibold text-white transition hover:bg-violet-400"><Plus size={13} />Add subscription</button>

          <div ref={extendRef} className="relative">
            <button onClick={() => setExtendOpen((value) => !value)} className="flex h-9 items-center gap-2 rounded-lg bg-emerald-500/90 px-3 text-[10px] font-semibold text-white transition hover:bg-emerald-500">Extend<ChevronDown size={12} /></button>
            {extendOpen && <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">{EXTEND_OPTIONS.map((days) => <button key={days} onClick={() => extendSubscription(days)} className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[10px] font-medium text-slate-700 hover:bg-slate-50">Extend by {days} days<Calendar size={12} className="text-slate-400" /></button>)}</div>}
          </div>

          {org.isLocked && <button onClick={unlockLogin} disabled={isPending} className="flex h-9 items-center gap-2 rounded-lg bg-amber-500/90 px-3 text-[10px] font-semibold text-white transition hover:bg-amber-500 disabled:opacity-60"><LockKeyholeOpen size={13} />{isPending ? "Unlocking..." : "Unlock login"}</button>}

          <button onClick={toggleSuspend} className={`flex h-9 items-center gap-2 rounded-lg px-3 text-[10px] font-semibold text-white transition ${isSuspended ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-500/90 hover:bg-rose-500"}`}>{isSuspended ? <><PlayCircle size={13} />Reactivate</> : <><Ban size={13} />Suspend</>}</button>

          <div ref={moreRef} className="relative">
            <button onClick={() => setMoreOpen((value) => !value)} aria-label="More actions" className="grid size-9 place-items-center rounded-lg bg-white/10 text-white ring-1 ring-white/15 transition hover:bg-white/15"><MoreHorizontal size={15} /></button>
            {moreOpen && <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
              <p className="px-2.5 pb-1 pt-1.5 text-[8px] font-semibold uppercase tracking-wider text-slate-400">Change plan</p>
              {(["Starter", "Growth", "Business"] as const).map((plan) => <button key={plan} onClick={() => changePlan(plan)} disabled={plan === org.plan} className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[10px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-violet-600">{plan}{plan === org.plan && <CheckCircle2 size={12} className="text-violet-600" />}</button>)}
              <div className="my-1 border-t border-slate-100" />
              <button onClick={() => { setMoreOpen(false); setDeleteError(""); setConfirmDelete(true); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[10px] font-medium text-rose-600 hover:bg-rose-50"><Trash2 size={13} />Delete organization</button>
            </div>}
          </div>
        </div>
      </div>
    </header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => { const Icon = stat.icon; return <article key={stat.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.03)]"><div className="flex items-start justify-between"><div><p className="text-[10px] font-medium text-slate-400">{stat.label}</p><p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{stat.value}</p></div><span className={`grid size-10 place-items-center rounded-lg ${stat.tone}`}><Icon size={17} /></span></div></article>; })}</section>

    <section className="grid gap-4 xl:grid-cols-[1.55fr_0.75fr]">
      <div className="space-y-4">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><ShieldCheck size={15} className="text-violet-600" />Subscription & billing</h2><span className={`text-[10px] font-semibold ${isSuspended || hasNotStarted ? "text-slate-500" : org.daysLeft <= 5 ? "text-rose-600" : "text-emerald-600"}`}>{isSuspended ? "Access suspended" : hasNotStarted ? "No plan selected yet" : org.daysLeft > 0 ? `${org.daysLeft} days left` : "Renewal overdue"}</span></div>
          {!hasNotStarted && <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${isSuspended ? "bg-slate-400" : org.daysLeft <= 5 ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${Math.max(progress, 4)}%` }} /></div>}
          <div className="mt-4 grid grid-cols-4 gap-3 text-center"><div className="rounded-md bg-slate-50 p-3"><p className="text-[8px] text-slate-400">Plan</p><p className="mt-1 text-[11px] font-semibold text-slate-800">{org.plan}</p></div><div className="rounded-md bg-slate-50 p-3"><p className="text-[8px] text-slate-400">Billing cycle</p><p className="mt-1 text-[11px] font-semibold text-slate-800">Monthly</p></div><div className="rounded-md bg-slate-50 p-3"><p className="text-[8px] text-slate-400">{org.subscriptionState === "Trial" ? "Free trial ends" : "Renews on"}</p><p className="mt-1 text-[11px] font-semibold text-slate-800">{org.renewsOn}</p></div><div className="rounded-md bg-slate-50 p-3"><p className="text-[8px] text-slate-400">Billing state</p>{org.subscriptionState ? <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${SUBSCRIPTION_STATE_TONE[org.subscriptionState]}`}>{org.subscriptionState === "Trial" ? "Free trial" : org.subscriptionState}</span> : <p className="mt-1 text-[11px] font-semibold text-slate-800">—</p>}</div></div>
        </article>

        <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between border-b border-slate-100 p-4"><h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><ReceiptText size={15} className="text-violet-600" />Billing history</h2><button className="flex items-center gap-1 text-[9px] font-semibold text-violet-700"><Download size={11} />Export</button></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left"><thead><tr className="border-b border-slate-100 bg-slate-50/50 text-[8px] font-semibold uppercase tracking-wider text-slate-400"><th className="px-4 py-2.5">Invoice</th><th className="px-3 py-2.5">Date</th><th className="px-3 py-2.5">Amount</th><th className="px-3 py-2.5">Method</th><th className="px-3 py-2.5">Status</th></tr></thead>
            <tbody>{invoices.map((invoice) => <tr key={invoice.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50"><td className="px-4 py-2.5 text-[10px] font-semibold text-slate-700">{invoice.id}</td><td className="px-3 py-2.5 text-[9px] text-slate-500">{invoice.date}</td><td className="px-3 py-2.5 text-[9px] font-semibold text-slate-700">{invoice.amount > 0 ? money(invoice.amount) : "—"}</td><td className="px-3 py-2.5 text-[9px] text-slate-500">{invoice.method ?? "—"}</td><td className="px-3 py-2.5"><span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${INVOICE_STATUS_TONE[invoice.status]}`}>{invoice.status}</span></td></tr>)}</tbody>
          </table></div>
        </article>

        {org.extensions && org.extensions.length > 0 && <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
          <div className="flex items-center gap-3 border-b border-slate-100 p-4"><span className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600"><Clock3 size={15} /></span><div><h2 className="text-sm font-semibold text-slate-900">Free extension history</h2><p className="mt-0.5 text-[8px] text-slate-400">One-time free extensions this user has claimed after their subscription ended</p></div></div>
          <div className="divide-y divide-slate-50">{org.extensions.map((extension) => <div key={extension.id} className="flex items-center justify-between px-4 py-3"><p className="text-[10px] font-semibold text-slate-700">+{extension.days} days added for free</p><div className="text-right"><p className="text-[8px] text-slate-500">Extended {new Date(extension.extendedAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}</p><p className="mt-0.5 text-[8px] text-slate-400">Ended {new Date(extension.endsAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}</p></div></div>)}</div>
        </article>}

        <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between border-b border-slate-100 p-4"><h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Headphones size={15} className="text-violet-600" />Support tickets</h2><div className="flex items-center gap-2"><span className="rounded-full bg-rose-50 px-2 py-1 text-[8px] font-semibold text-rose-600">{openTicketCount} open</span><Link href="/super-admin/support" className="text-[9px] font-semibold text-violet-700">View all</Link></div></div>
          <div className="divide-y divide-slate-50">{tickets.map((ticket) => <Link key={ticket.id} href={`/super-admin/support?ticket=${ticket.id}`} className="flex items-center gap-3 p-4 transition hover:bg-slate-50">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500"><Headphones size={14} /></span>
            <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold text-slate-800">{ticket.subject}</p><p className="mt-0.5 flex items-center gap-1 text-[8px] text-slate-400"><Clock3 size={9} />{ticket.raisedBy} · {ticket.time}</p></div>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[7px] font-semibold ${TICKET_PRIORITY_TONE[ticket.priority]}`}>{ticket.priority}</span>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[7px] font-semibold ${TICKET_STATUS_TONE[ticket.status]}`}>{ticket.status}</span>
          </Link>)}
          {tickets.length === 0 && <p className="p-6 text-center text-[10px] text-slate-400">No support tickets from this organization.</p>}
          </div>
        </article>
      </div>

      <div className="space-y-4">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
          <h2 className="text-sm font-semibold text-slate-900">Contact information</h2>
          <div className="mt-3 space-y-2.5">
            <p className="flex items-center gap-2 text-[10px] text-slate-600"><Mail size={12} className="shrink-0 text-slate-400" />{org.email}</p>
            <p className="flex items-center gap-2 text-[10px] text-slate-600"><Phone size={12} className="shrink-0 text-slate-400" />{org.phone}</p>
            <p className="flex items-center gap-2 text-[10px] text-slate-600"><MapPin size={12} className="shrink-0 text-slate-400" />{org.address}</p>
            <p className="flex items-center gap-2 text-[10px] text-slate-600"><Building2 size={12} className="shrink-0 text-slate-400" />PAN/VAT: {org.panVat}</p>
          </div>
          {liveUserId && <button onClick={() => { setCredentialsError(""); setCredentialsOpen(true); }} className="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 text-[9px] font-semibold text-slate-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"><KeyRound size={12} />Change login email / password</button>}
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-900">Team members</h2><span className="text-[9px] text-slate-400">{org.members} total</span></div>
          <div className="mt-3 space-y-2.5">{members.map((member) => <div key={member.email} className="flex items-center gap-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-slate-400 to-slate-600 text-[9px] font-semibold text-white">{member.initials}</span><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold text-slate-800">{member.name}</p><p className="truncate text-[8px] text-slate-400">{member.role}</p></div></div>)}</div>
        </article>

        {isSuspended && org.suspendReason && <article className="rounded-lg border border-rose-200 bg-rose-50 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-rose-800"><Ban size={14} />Suspension reason</h2>
          <p className="mt-2 text-[10px] leading-5 text-rose-700">{org.suspendReason}</p>
        </article>}

        <article className="rounded-lg border border-rose-100 bg-rose-50/40 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-rose-800"><Ban size={14} />Danger zone</h2>
          <p className="mt-1 text-[9px] leading-4 text-rose-600">{isSuspended ? "This organization is currently suspended." : "Suspending this organization immediately blocks their access to AKCounting."}</p>
          <button onClick={toggleSuspend} className="mt-3 h-9 w-full rounded-lg border border-rose-200 bg-white text-[10px] font-semibold text-rose-700 transition hover:bg-rose-50">{isSuspended ? "Reactivate organization" : "Suspend organization"}</button>
          <div className="my-4 border-t border-rose-100" />
          <p className="text-[9px] leading-4 text-rose-600">Permanently delete this organization and all of their data. This cannot be undone.</p>
          <button onClick={() => { setDeleteError(""); setConfirmDelete(true); }} className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-rose-600 text-[10px] font-semibold text-white transition hover:bg-rose-700"><Trash2 size={13} />Delete organization</button>
        </article>
      </div>
    </section>

    {editOpen && <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditOpen(false); }}>
      <form onSubmit={saveEdit} className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5"><h2 className="text-sm font-semibold text-slate-900">Edit organization</h2><button type="button" onClick={() => setEditOpen(false)} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={15} /></button></div>
        <div className="space-y-3.5 p-5">
          <Field label="Owner name" name="owner" defaultValue={org.owner} />
          <Field label="Email" name="email" type="email" defaultValue={org.email} />
          <Field label="Phone" name="phone" defaultValue={org.phone} />
          <Field label="Address" name="address" defaultValue={org.address} />
          <Field label="PAN / VAT" name="panVat" defaultValue={org.panVat} />
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 p-4"><button type="button" onClick={() => setEditOpen(false)} className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-[10px] font-semibold text-slate-600">Cancel</button><button type="submit" className="h-9 rounded-lg bg-violet-600 px-4 text-[10px] font-semibold text-white shadow-sm shadow-violet-200 hover:bg-violet-700">Save changes</button></div>
      </form>
    </div>}

    {credentialsOpen && <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !isPending) { setCredentialsOpen(false); setShowCredentialsPassword(false); } }}>
      <form onSubmit={saveCredentials} className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="text-sm font-semibold text-slate-900">Change login email / password</h2><p className="mt-1 text-[9px] text-slate-400">Update how {org.owner} signs in to AKCounting. Leave a field blank to keep it unchanged.</p></div><button type="button" onClick={() => { setCredentialsOpen(false); setShowCredentialsPassword(false); }} className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={15} /></button></div>
        <div className="space-y-3.5 p-5">
          <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-600">Login email</span><span className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 transition focus-within:border-violet-400 focus-within:bg-white"><Mail size={13} className="shrink-0 text-slate-400" /><input name="loginEmail" type="email" defaultValue={org.email} placeholder="user@example.com" className="min-w-0 w-full bg-transparent text-[10px] text-slate-800 outline-none" /></span></label>
          <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-600">New password</span><span className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 transition focus-within:border-violet-400 focus-within:bg-white"><Lock size={13} className="shrink-0 text-slate-400" /><input name="loginPassword" type={showCredentialsPassword ? "text" : "password"} minLength={8} pattern="(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}" title="At least 8 characters, including an uppercase letter, a number, and a symbol." placeholder="Uppercase, number & symbol · 8+ characters (blank to keep current)" className="min-w-0 w-full bg-transparent text-[10px] text-slate-800 outline-none" /><button type="button" aria-label={showCredentialsPassword ? "Hide password" : "Show password"} onClick={() => setShowCredentialsPassword((value) => !value)} className="shrink-0 text-slate-400 hover:text-violet-600">{showCredentialsPassword ? <EyeOff size={13} /> : <Eye size={13} />}</button></span></label>
          {credentialsError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[9px] font-medium text-rose-600">{credentialsError}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 p-4"><button type="button" disabled={isPending} onClick={() => { setCredentialsOpen(false); setShowCredentialsPassword(false); }} className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-[10px] font-semibold text-slate-600 disabled:opacity-50">Cancel</button><button type="submit" disabled={isPending} className="h-9 rounded-lg bg-violet-600 px-4 text-[10px] font-semibold text-white shadow-sm shadow-violet-200 hover:bg-violet-700 disabled:opacity-60">{isPending ? "Saving..." : "Save credentials"}</button></div>
      </form>
    </div>}

    {subscriptionOpen && <AddSubscriptionDialog org={org} onClose={() => setSubscriptionOpen(false)} onSubmit={addSubscription} />}

    {suspendDialogOpen && <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setSuspendDialogOpen(false); }}>
      <form onSubmit={confirmSuspendAction} className="w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 shadow-2xl">
        <span className="grid size-11 place-items-center rounded-full bg-rose-50 text-rose-600"><Ban size={20} /></span>
        <h2 className="mt-4 text-sm font-semibold text-slate-900">Suspend this organization?</h2>
        <p className="mt-1.5 text-[11px] leading-5 text-slate-500">{org.name} will immediately lose access to AKCounting. Please give a reason — it will be shown on this profile.</p>
        <label className="mt-4 block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-600">Reason for suspension</span><textarea required value={suspendReasonDraft} onChange={(event) => setSuspendReasonDraft(event.target.value)} rows={3} placeholder="e.g. Repeated failed payments, policy violation..." className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-[11px] leading-5 text-slate-800 outline-none transition focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100" /></label>
        {suspendError && <p role="alert" className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-medium text-rose-600">{suspendError}</p>}
        <div className="mt-5 flex gap-2"><button type="button" onClick={() => setSuspendDialogOpen(false)} disabled={isPending} className="h-10 flex-1 rounded-lg border border-slate-200 text-[10px] font-semibold text-slate-600 disabled:opacity-50">Cancel</button><button type="submit" disabled={!suspendReasonDraft.trim() || isPending} className="h-10 flex-1 rounded-lg bg-rose-600 text-[10px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50">{isPending ? "Suspending..." : "Suspend"}</button></div>
      </form>
    </div>}

    {confirmDelete && <DeleteOrganizationDialog orgName={org.name} pending={isPending} error={deleteError} onConfirm={deleteOrganization} onCancel={() => { setConfirmDelete(false); setDeleteError(""); }} />}
  </div>;
}

function AddSubscriptionDialog({ org, onClose, onSubmit }: { org: Organization; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const [plan, setPlan] = useState<Organization["plan"]>(org.plan);
  return <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form onSubmit={onSubmit} className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-700 to-violet-900 px-6 py-5 text-white">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 grid size-8 place-items-center rounded-lg bg-white/10 hover:bg-white/20"><X size={15} /></button>
        <span className="grid size-10 place-items-center rounded-xl bg-white/15"><CreditCard size={18} /></span>
        <h2 className="mt-3 text-base font-semibold">Add subscription</h2>
        <p className="mt-0.5 text-[10px] text-violet-100">Record a new or renewed subscription for {org.name}.</p>
      </div>
      <div className="space-y-3.5 p-5">
        <div>
          <span className="mb-1.5 block text-[10px] font-semibold text-slate-600">Select plan</span>
          <div className="grid grid-cols-3 gap-2">{(["Starter", "Growth", "Business"] as const).map((item) => <label key={item} className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-2.5 text-center transition ${plan === item ? "border-violet-400 bg-violet-50 ring-2 ring-violet-100" : "border-slate-200 hover:bg-slate-50"}`}><input type="radio" name="plan" value={item} checked={plan === item} onChange={() => setPlan(item)} className="sr-only" /><span className="text-[10px] font-semibold text-slate-800">{item}</span><span className="text-[8px] text-slate-400">{PLAN_PRICE[item] > 0 ? money(PLAN_PRICE[item]) : "Free"}</span></label>)}</div>
        </div>
        <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-600">Payment method</span><select name="method" defaultValue={PAYMENT_METHODS[0]} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 text-[11px] text-slate-800 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100">{PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-600">Amount paid (Rs)</span><input name="amount" type="number" min="0" step="1" defaultValue={PLAN_PRICE[plan]} key={plan} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 text-[11px] text-slate-800 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100" /></label>
          <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-600">Payment date</span><input name="paidOn" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 text-[11px] text-slate-800 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100" /></label>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 p-4"><button type="button" onClick={onClose} className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-[10px] font-semibold text-slate-600">Cancel</button><button type="submit" className="h-9 rounded-lg bg-violet-600 px-4 text-[10px] font-semibold text-white shadow-sm shadow-violet-200 hover:bg-violet-700">Record subscription</button></div>
    </form>
  </div>;
}

function Field({ label, name, type = "text", defaultValue }: { label: string; name: string; type?: string; defaultValue: string }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-600">{label}</span><input name={name} type={type} defaultValue={defaultValue} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 text-[11px] text-slate-800 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100" /></label>;
}

function DeleteOrganizationDialog({ orgName, pending, error, onConfirm, onCancel }: { orgName: string; pending: boolean; error: string; onConfirm: (password: string) => void; onCancel: () => void }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) return;
    onConfirm(password);
  }

  return <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onCancel(); }}>
    <form onSubmit={handleSubmit} className="w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 shadow-2xl">
      <span className="grid size-11 place-items-center rounded-full bg-rose-50 text-rose-600"><AlertTriangle size={20} /></span>
      <h2 className="mt-4 text-sm font-semibold text-slate-900">Delete this organization?</h2>
      <p className="mt-1.5 text-[11px] leading-5 text-slate-500">This permanently removes {orgName} and all of their data. This cannot be undone.</p>
      <label className="mt-4 block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-600">Confirm your admin password to continue</span><span className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 transition focus-within:border-rose-300 focus-within:bg-white"><Lock size={13} className="shrink-0 text-slate-400" /><input required autoFocus type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" className="min-w-0 w-full bg-transparent text-[11px] text-slate-800 outline-none" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)} className="shrink-0 text-slate-400 hover:text-rose-600">{showPassword ? <EyeOff size={13} /> : <Eye size={13} />}</button></span></label>
      {error && <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-medium text-rose-600">{error}</p>}
      <div className="mt-5 flex gap-2"><button type="button" onClick={onCancel} disabled={pending} className="h-10 flex-1 rounded-lg border border-slate-200 text-[10px] font-semibold text-slate-600 disabled:opacity-50">Cancel</button><button type="submit" disabled={pending || !password} className="h-10 flex-1 rounded-lg bg-rose-600 text-[10px] font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{pending ? "Deleting..." : "Delete organization"}</button></div>
    </form>
  </div>;
}
