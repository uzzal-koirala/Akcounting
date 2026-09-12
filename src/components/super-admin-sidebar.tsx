"use client";

import { Bell, Building2, ChevronRight, CircleHelp, CreditCard, Gift, Headphones, LayoutDashboard, LogOut, MoreVertical, PanelLeftClose, PanelLeftOpen, Search, Settings, ShieldCheck, ShoppingBag, UserCog, Wallet, WalletCards, X, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { logoutUser } from "@/actions/auth";

const navGroups = [
  { label: "General", items: [
    { label: "Dashboard", href: "/super-admin", icon: LayoutDashboard },
    { label: "Organizations", href: "/super-admin/organizations", icon: Building2 },
    { label: "Users and role", href: "/super-admin/users", icon: UserCog },
    { label: "Support & tickets", href: "/super-admin/support", icon: Headphones },
  ] },
  { label: "Billing", items: [
    { label: "Plans & billing", href: "/super-admin/plans", icon: CreditCard },
    { label: "Purchased", href: "/super-admin/purchased", icon: ShoppingBag },
    { label: "Revenue & payments", href: "/super-admin/payments", icon: Wallet },
    { label: "Affiliate control", href: "/super-admin/affiliates", icon: Gift },
  ] },
] as const;

export function SuperAdminSidebar({ user }: { user?: { name: string; email: string } }) {
  const displayName = user?.name ?? "Super Admin";
  const displayEmail = user?.email ?? "admin@akcounting.app";
  const initials = displayName.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [accountOpen]);

  return <>
    <button aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="fixed left-4 top-4 z-30 grid size-11 place-items-center rounded-xl border border-violet-100 bg-white text-violet-800 shadow-sm md:hidden"><Menu size={20} /></button>
    <button aria-label="Close navigation overlay" onClick={() => setMobileOpen(false)} className={`fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-[2px] transition-opacity duration-300 ease-in-out md:hidden ${mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`} />
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[282px] flex-col overflow-visible border-r border-violet-100 bg-white px-4 py-5 shadow-[8px_0_30px_rgba(76,29,149,0.04)] transition-[width,transform] duration-300 ease-out will-change-transform md:sticky md:top-0 md:h-screen md:translate-x-0 md:duration-500 md:ease-in-out ${collapsed ? "md:w-[82px]" : "md:w-[282px]"} ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className={`flex items-center gap-3 px-2 ${collapsed ? "md:justify-center md:px-0" : ""}`}>
        <div className="grid size-9 rotate-3 place-items-center rounded-xl bg-gradient-to-br from-violet-700 to-violet-950 text-white shadow-lg shadow-violet-200"><WalletCards size={19} className="-rotate-3" /></div>
        <div className={`whitespace-nowrap transition-all duration-300 ${collapsed ? "md:w-0 md:translate-x-2 md:overflow-hidden md:opacity-0" : "md:w-[130px] md:opacity-100"}`}><p className="text-[15px] font-semibold tracking-tight text-slate-900">AKCounting</p><p className="text-[10px] font-medium uppercase tracking-[0.18em] text-violet-500">Super admin</p></div>
        <button aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed((value) => !value)} className={`ml-auto hidden size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-violet-50 hover:text-violet-700 md:grid ${collapsed ? "md:absolute md:left-[48px] md:top-6 md:rounded-full md:border md:border-violet-100 md:bg-white md:shadow-sm" : ""}`}>{collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</button>
        <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="ml-auto text-slate-400 md:hidden"><X size={20} /></button>
      </div>
      <label className={`mt-6 flex h-10 items-center gap-2.5 rounded-lg border border-violet-100 bg-violet-50/70 px-3 text-slate-400 transition-all duration-500 focus-within:border-violet-300 focus-within:bg-white ${collapsed ? "md:justify-center md:gap-0 md:px-0" : ""}`} title={collapsed ? "Search" : undefined}><Search size={16} className="shrink-0" /><input aria-label="Search navigation" placeholder="Search" className={`min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none transition-all duration-300 placeholder:text-slate-400 ${collapsed ? "md:w-0 md:flex-none md:opacity-0" : "md:opacity-100"}`} /><kbd className={`overflow-hidden whitespace-nowrap rounded border border-violet-100 bg-white px-1.5 py-0.5 text-[9px] text-slate-400 transition-all duration-300 ${collapsed ? "md:w-0 md:border-0 md:px-0 md:opacity-0" : "md:w-7 md:opacity-100"}`}>⌘K</kbd></label>
      <nav className="mt-5 flex-1 overflow-y-auto">
        {navGroups.map((group, index) => <section key={group.label} className={index > 0 ? "mt-5" : ""}>
          <p className={`whitespace-nowrap px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 transition-all duration-300 ${collapsed ? "md:h-0 md:overflow-hidden md:pb-0 md:opacity-0" : "md:h-6 md:opacity-100"}`}>{group.label}</p>
          <div className="flex flex-col gap-1">
            {group.items.map(({ label, href, icon: Icon }) => { const active = pathname === href; return <Link key={href} href={href} title={collapsed ? label : undefined} onClick={() => setMobileOpen(false)} className={`group flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-semibold transition-all duration-300 ${collapsed ? "md:justify-center md:gap-0 md:px-0" : ""} ${active ? "bg-violet-50 text-violet-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}><Icon size={17} strokeWidth={active ? 2.2 : 1.7} className={`shrink-0 ${active ? "text-violet-700" : "text-slate-400 group-hover:text-violet-600"}`} /><span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? "md:w-0 md:opacity-0" : "md:w-[150px] md:opacity-100"}`}>{label}</span>{active && <span className={`shrink-0 rounded-full bg-violet-600 transition-all duration-200 ${collapsed ? "md:ml-0 md:size-0 md:opacity-0" : "ml-auto size-1.5 opacity-100"}`} />}</Link>; })}
          </div>
        </section>)}
      </nav>
      <div className="border-t border-slate-100 pt-3">
        <Link href="/super-admin/announcements" title={collapsed ? "Notifications" : undefined} onClick={() => setMobileOpen(false)} className={`flex h-9 items-center gap-3 rounded-lg px-3 text-xs font-semibold transition-all duration-300 ${pathname === "/super-admin/announcements" ? "bg-violet-50 text-violet-800" : "text-slate-500 hover:bg-slate-50"} ${collapsed ? "md:justify-center md:gap-0 md:px-0" : ""}`}><Bell size={16} className={`shrink-0 ${pathname === "/super-admin/announcements" ? "text-violet-700" : "text-slate-400"}`} /><span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? "md:w-0 md:opacity-0" : "md:w-[140px] md:opacity-100"}`}>Notifications</span></Link>
        <Link href="#" title={collapsed ? "Help center" : undefined} className={`flex h-9 items-center gap-3 rounded-lg px-3 text-xs font-semibold text-slate-500 transition-all duration-300 hover:bg-slate-50 ${collapsed ? "md:justify-center md:gap-0 md:px-0" : ""}`}><CircleHelp size={16} className="shrink-0 text-slate-400" /><span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? "md:w-0 md:opacity-0" : "md:w-[170px] md:opacity-100"}`}>Help center</span></Link>
        <div ref={accountMenuRef} className="relative mt-3">
          {accountOpen && <div role="menu" className={`absolute bottom-[calc(100%+8px)] z-50 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.18)] ${collapsed ? "left-0 w-60" : "inset-x-0"}`}>
            <div className="flex items-center gap-3 rounded-xl px-2.5 py-2"><div className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-300 to-fuchsia-300 text-[10px] font-semibold text-violet-950">{initials}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{displayName}</p><p className="truncate text-[10px] text-slate-400">{displayEmail}</p></div></div>
            <div className="my-1 border-t border-slate-100" />
            <Link role="menuitem" href="/super-admin/system" onClick={() => setAccountOpen(false)} className="flex h-9 items-center gap-3 rounded-lg px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"><Settings size={16} />Settings</Link>
            <Link role="menuitem" href="#" onClick={() => setAccountOpen(false)} className="flex h-9 items-center gap-3 rounded-lg px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"><CircleHelp size={16} />Help<ChevronRight size={15} className="ml-auto" /></Link>
            <div className="my-1 border-t border-slate-100" />
            <form action={logoutUser}><button role="menuitem" type="submit" className="flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-xs font-medium text-slate-700 hover:bg-red-50 hover:text-red-700"><LogOut size={16} />Log out</button></form>
          </div>}
          <button aria-expanded={accountOpen} aria-haspopup="menu" onClick={() => setAccountOpen((value) => !value)} className={`flex w-full items-center rounded-xl border border-violet-100 bg-violet-50/60 p-2.5 text-left transition-all duration-300 hover:border-violet-200 hover:bg-violet-50 ${collapsed ? "md:justify-center md:border-transparent md:bg-transparent md:p-1" : ""}`}><div className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-200 to-rose-200 text-xs font-semibold text-violet-950">{initials}</div><div className={`min-w-0 flex-1 overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? "md:w-0 md:flex-none md:px-0 md:opacity-0" : "md:w-[150px] md:px-2.5 md:opacity-100"}`}><p className="truncate text-[11px] font-semibold text-slate-800">{displayName}</p><p className="flex items-center gap-1 truncate text-[9px] text-slate-500"><ShieldCheck size={10} className="text-violet-600" />Super Admin</p></div><MoreVertical size={15} className={`shrink-0 text-slate-400 transition-all duration-200 ${collapsed ? "md:w-0 md:opacity-0" : "md:opacity-100"}`} /></button>
        </div>
      </div>
    </aside>
  </>;
}
