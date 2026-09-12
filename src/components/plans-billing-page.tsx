"use client";

import { useState, useTransition } from "react";
import { BadgePercent, Calendar, Check, CircleDollarSign, Copy, Crown, Edit3, Loader2, Plus, ReceiptText, Sparkles, Tag, Ticket, Trash2, TrendingUp, WalletCards, X } from "lucide-react";

import { updatePlan, type PlanRecord } from "@/actions/plans";
import { createCoupon, deleteCoupon, toggleCoupon, type CouponRecord } from "@/actions/coupons";

const PLAN_ICON: Record<string, typeof WalletCards> = { "Starter Package": WalletCards, "Growth Package": Sparkles, "Premium Package": Crown };
const PLAN_COLOR: Record<string, string> = { "Starter Package": "from-slate-700 to-slate-900", "Growth Package": "from-violet-600 to-fuchsia-600", "Premium Package": "from-[#0b2a54] to-[#061428]" };
const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" });

export function PlansBillingPage({ plans, coupons }: { plans: PlanRecord[]; coupons: CouponRecord[] }) {
  const [editing, setEditing] = useState<PlanRecord | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const format = (value: number) => `Rs ${new Intl.NumberFormat("en-NP", { maximumFractionDigits: 0 }).format(value)}`;

  const [couponList, setCouponList] = useState(coupons);
  const [syncedCoupons, setSyncedCoupons] = useState(coupons);
  if (coupons !== syncedCoupons) { setSyncedCoupons(coupons); setCouponList(coupons); }

  const totalSubscribers = plans.reduce((sum, plan) => sum + plan.subscriberCount, 0);
  const mrr = plans.reduce((sum, plan) => sum + plan.monthlyPrice * plan.subscriberCount, 0);
  const activeCoupons = couponList.filter((coupon) => coupon.active).length;
  const metrics = [
    { label: "Monthly recurring revenue", value: format(mrr), note: "Live, from active subscribers", icon: TrendingUp, tone: "bg-violet-50 text-violet-700" },
    { label: "Active subscriptions", value: String(totalSubscribers), note: "Across all plans", icon: CircleDollarSign, tone: "bg-blue-50 text-blue-700" },
    { label: "Plans configured", value: String(plans.length), note: "Editable below", icon: ReceiptText, tone: "bg-amber-50 text-amber-700" },
    { label: "Active coupons", value: String(activeCoupons), note: `${couponList.length} total created`, icon: Ticket, tone: "bg-emerald-50 text-emerald-700" },
  ];

  function savePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setError(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await updatePlan(editing.id, formData);
        setEditing(null);
      } catch {
        setError("Could not save changes. Please try again.");
      }
    });
  }

  return <div>
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-violet-600">Revenue management</p><h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950">Plans & billing</h1><p className="mt-1 text-[10px] text-slate-500">Manage AKCounting plans, pricing, and promotional coupons. Changes made here update the customer-facing pricing page immediately.</p></div></header>
    <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((item) => { const Icon = item.icon; return <article key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.035)]"><div className="flex items-start justify-between"><div><p className="text-[9px] font-medium text-slate-500">{item.label}</p><p className="mt-2 text-xl font-semibold text-slate-900">{item.value}</p></div><span className={`grid size-9 place-items-center rounded-lg ${item.tone}`}><Icon size={16} /></span></div><p className="mt-3 text-[8px] text-slate-400">{item.note}</p></article>; })}</section>

    <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-violet-50/40 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-2"><Sparkles size={15} className="text-violet-600" /><h2 className="text-sm font-semibold text-slate-900">Subscription plans</h2></div>
      <p className="mt-1 text-[9px] text-slate-400">Pricing shown before applicable taxes · billed monthly</p>
      <div className="mt-6 grid gap-5 lg:grid-cols-3">{plans.map((plan) => {
        const Icon = PLAN_ICON[plan.name] ?? WalletCards;
        const popular = plan.name === "Growth Package";
        return <article key={plan.id} className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white p-6 transition duration-300 hover:-translate-y-1.5 ${popular ? "border-violet-300 shadow-[0_20px_50px_rgba(124,58,237,0.18)] ring-2 ring-violet-100" : "border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.05)] hover:shadow-[0_20px_45px_rgba(15,23,42,0.1)]"}`}>
          {popular && <span className="absolute right-5 top-0 rounded-b-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-[8px] font-bold uppercase tracking-wider text-white shadow-md">Most popular</span>}
          <span className={`grid size-12 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${PLAN_COLOR[plan.name] ?? "from-slate-700 to-slate-900"}`}><Icon size={20} /></span>
          <h3 className="mt-4 text-base font-semibold text-slate-900">{plan.name}</h3>
          <p className="mt-1 min-h-8 text-[10px] leading-4 text-slate-400">{plan.description}</p>
          <div className="mt-5 flex items-end gap-1.5"><p className="text-3xl font-bold tracking-tight text-slate-900">{format(plan.monthlyPrice)}</p><p className="pb-1.5 text-[10px] font-medium text-slate-400">/month</p></div>
          <p className="mt-1.5 text-[9px] font-medium text-violet-600">{plan.subscriberCount} active subscriber{plan.subscriberCount === 1 ? "" : "s"}</p>
          <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-5">{plan.features.map((feature) => <p key={feature} className="flex items-start gap-2.5 text-[10px] leading-4 text-slate-600"><span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check size={10} /></span>{feature}</p>)}</div>
          <button onClick={() => setEditing(plan)} className={`mt-6 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-[10px] font-semibold transition ${popular ? "bg-violet-600 text-white shadow-md shadow-violet-200 hover:bg-violet-700" : "border border-slate-200 text-slate-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"}`}><Edit3 size={13} />Edit plan</button>
        </article>;
      })}</div>
    </section>

    <CouponSection coupons={couponList} setCoupons={setCouponList} />

    {editing && <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"><form onSubmit={savePlan} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 className="text-lg font-semibold text-slate-900">Edit {editing.name} plan</h2><p className="mt-1 text-[9px] text-slate-400">Update public subscription pricing and limits.</p></div><button type="button" onClick={() => setEditing(null)} className="grid size-8 place-items-center rounded-lg bg-slate-50"><X size={14} /></button></div>
      <div className="mt-5 grid gap-3">
        <label><span className="mb-1.5 block text-[8px] font-semibold text-slate-600">Monthly price (Rs)</span><input name="monthlyPrice" type="number" min={0} defaultValue={editing.monthlyPrice} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[9px] outline-none focus:border-violet-400" /></label>
        <label><span className="mb-1.5 block text-[8px] font-semibold text-slate-600">Description</span><input name="description" type="text" maxLength={200} defaultValue={editing.description} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[9px] outline-none focus:border-violet-400" /></label>
        <label><span className="mb-1.5 block text-[8px] font-semibold text-slate-600">Features (one per line)</span><textarea name="features" rows={5} defaultValue={editing.features.join("\n")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[9px] outline-none focus:border-violet-400" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label><span className="mb-1.5 block text-[8px] font-semibold text-slate-600">Max team members</span><input name="maxTeamMembers" type="number" min={1} defaultValue={editing.maxTeamMembers} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[9px] outline-none focus:border-violet-400" /></label>
          <label><span className="mb-1.5 block text-[8px] font-semibold text-slate-600">Max documents</span><input name="maxDocuments" type="number" min={0} defaultValue={editing.maxDocuments} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[9px] outline-none focus:border-violet-400" /></label>
        </div>
        <label className="flex items-center gap-2"><input name="canUploadImages" type="checkbox" defaultChecked={editing.canUploadImages} className="size-3.5 rounded border-slate-300" /><span className="text-[8px] font-semibold text-slate-600">Allow proof/image uploads</span></label>
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[8px] font-medium text-rose-600">{error}</p>}
      <div className="mt-5 rounded-xl bg-amber-50 p-3 text-[8px] leading-4 text-amber-700">Pricing changes apply immediately to the customer-facing plans page and eSewa checkout.</div>
      <div className="mt-6 flex gap-2"><button type="button" onClick={() => setEditing(null)} disabled={isPending} className="h-10 flex-1 rounded-lg border border-slate-200 text-[9px] font-semibold text-slate-600 disabled:opacity-50">Cancel</button><button disabled={isPending} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#061d40] text-[9px] font-semibold text-white disabled:opacity-70">{isPending && <Loader2 size={12} className="animate-spin" />}Save changes</button></div>
    </form></div>}
  </div>;
}

function CouponSection({ coupons, setCoupons }: { coupons: CouponRecord[]; setCoupons: (updater: (current: CouponRecord[]) => CouponRecord[]) => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [nowMs] = useState(() => Date.now());

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await createCoupon(formData);
        form.reset();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not create this coupon.");
      }
    });
  }

  function toggle(coupon: CouponRecord) {
    setCoupons((current) => current.map((item) => item.id === coupon.id ? { ...item, active: !item.active } : item));
    startTransition(async () => { await toggleCoupon(coupon.id, !coupon.active); });
  }

  function remove(coupon: CouponRecord) {
    setCoupons((current) => current.filter((item) => item.id !== coupon.id));
    startTransition(async () => { await deleteCoupon(coupon.id); });
  }

  function copyCode(coupon: CouponRecord) {
    navigator.clipboard?.writeText(coupon.code).catch(() => {});
    setCopiedId(coupon.id);
    setTimeout(() => setCopiedId((current) => (current === coupon.id ? null : current)), 1500);
  }

  return <section className="mt-4 grid gap-4 xl:grid-cols-[380px_1fr]">
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-lg bg-violet-50 text-violet-600"><BadgePercent size={16} /></span><div><h2 className="text-sm font-semibold text-slate-900">Create a coupon</h2><p className="mt-0.5 text-[8px] text-slate-400">Discount vouchers customers can redeem at checkout</p></div></div>
      <form onSubmit={submit} className="mt-5 space-y-3.5">
        <label><span className="mb-1.5 block text-[9px] font-semibold text-slate-600">Coupon code</span><input name="code" required maxLength={30} placeholder="e.g. WELCOME20" className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[10px] font-semibold uppercase tracking-wide text-slate-800 outline-none transition placeholder:font-normal placeholder:normal-case placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label><span className="mb-1.5 block text-[9px] font-semibold text-slate-600">Discount type</span><select name="type" className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[10px] font-medium text-slate-700 outline-none focus:border-violet-300 focus:bg-white"><option value="Percent">Percent (%)</option><option value="Amount">Flat amount (Rs)</option></select></label>
          <label><span className="mb-1.5 block text-[9px] font-semibold text-slate-600">Value</span><input name="value" type="number" min={1} required placeholder="20" className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[10px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-300 focus:bg-white" /></label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label><span className="mb-1.5 block text-[9px] font-semibold text-slate-600">Max redemptions <span className="font-normal text-slate-400">(optional)</span></span><input name="maxRedemptions" type="number" min={1} placeholder="Unlimited" className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[10px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-300 focus:bg-white" /></label>
          <label><span className="mb-1.5 block text-[9px] font-semibold text-slate-600">Expires on <span className="font-normal text-slate-400">(optional)</span></span><input name="expiresAt" type="date" className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[10px] text-slate-800 outline-none focus:border-violet-300 focus:bg-white" /></label>
        </div>
        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[9px] font-medium text-rose-600">{error}</p>}
        <button disabled={isPending} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-violet-600 text-[10px] font-semibold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700 disabled:opacity-60">{isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}Create coupon</button>
      </form>
    </article>

    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between border-b border-slate-100 p-4"><div><h2 className="text-sm font-semibold text-slate-900">Active coupons</h2><p className="mt-0.5 text-[8px] text-slate-400">{coupons.length} coupon{coupons.length === 1 ? "" : "s"} created</p></div><Ticket size={16} className="text-violet-600" /></div>
      {coupons.length === 0 ? <div className="grid min-h-48 place-items-center text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400"><Tag size={18} /></span><p className="mt-3 text-[11px] font-semibold text-slate-700">No coupons yet</p><p className="mt-1 text-[9px] text-slate-400">Create your first discount voucher on the left.</p></div></div> :
      <div className="max-h-[520px] divide-y divide-slate-50 overflow-y-auto">{coupons.map((coupon) => {
        const expired = coupon.expiresAt ? new Date(coupon.expiresAt).getTime() < nowMs : false;
        const exhausted = coupon.maxRedemptions !== null && coupon.redemptions >= coupon.maxRedemptions;
        const live = coupon.active && !expired && !exhausted;
        return <div key={coupon.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-white shadow-sm ${live ? "bg-gradient-to-br from-violet-600 to-fuchsia-600" : "bg-slate-300"}`}><BadgePercent size={17} /></span>
            <div>
              <div className="flex items-center gap-2"><p className="font-mono text-[12px] font-bold tracking-wide text-slate-800">{coupon.code}</p><button type="button" onClick={() => copyCode(coupon)} className="grid size-6 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-violet-600">{copiedId === coupon.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}</button></div>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-slate-400">
                <span className="font-semibold text-violet-600">{coupon.type === "Percent" ? `${coupon.value}% off` : `Rs ${coupon.value} off`}</span>
                <span>· {coupon.redemptions}{coupon.maxRedemptions ? `/${coupon.maxRedemptions}` : ""} redeemed</span>
                {coupon.expiresAt && <span className="flex items-center gap-1"><Calendar size={9} />{expired ? "Expired" : "Expires"} {dateFormatter.format(new Date(coupon.expiresAt))}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className={`rounded-full px-2.5 py-1 text-[8px] font-semibold ${live ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{live ? "Active" : expired ? "Expired" : exhausted ? "Exhausted" : "Paused"}</span>
            <button type="button" onClick={() => toggle(coupon)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[8px] font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700">{coupon.active ? "Pause" : "Resume"}</button>
            <button type="button" onClick={() => remove(coupon)} aria-label="Delete coupon" className="grid size-7 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 size={13} /></button>
          </div>
        </div>;
      })}</div>}
    </article>
  </section>;
}
