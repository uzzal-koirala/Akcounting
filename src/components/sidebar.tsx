"use client";

import { ArrowLeftRight, Bell, Check, ChevronDown, ChevronRight, CircleHelp, Eye, EyeOff, FileBarChart2, FileText, FolderArchive, Gift, LayoutDashboard, LockKeyhole, LogOut, Mail, Menu, MoreVertical, Package, Palette, PanelLeftClose, PanelLeftOpen, Plus, Search, Settings, ShieldCheck, Sparkles, Users2, WalletCards, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { logoutUser } from "@/actions/auth";
import { getUnreadNotificationCount } from "@/actions/notifications";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Invoices", href: "/invoices", icon: FileText },
  { label: "Customers", href: "/customers", icon: Users2 },
  { label: "Products", href: "/products", icon: Package },
  { label: "Users & Roles", href: "/users", icon: ShieldCheck },
  { label: "Documents", href: "/documents", icon: FolderArchive },
  { label: "Reports", href: "/reports", icon: FileBarChart2 },
] as const;
const transactionPages = [{ label: "Income", href: "/income" }, { label: "Expenses", href: "/expenses" }, { label: "Salaries", href: "/salaries" }, { label: "Loan & EMI", href: "/loans" }, { label: "Due amounts", href: "/dues" }] as const;

export type SidebarUser = { name: string; email: string; plan?: string; avatarUrl?: string | null };
type SwitcherAccount = { id: string; name: string; email: string; plan: string };

export function Sidebar({ user, initialUnreadCount = 0 }: { user?: SidebarUser; initialUnreadCount?: number }) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const defaultName = user?.name ?? "Alex Morgan";
  const defaultEmail = user?.email ?? "alex@akcounting.app";
  const defaultPlan = user?.plan ?? "Starter Package";
  const avatarUrl = user?.avatarUrl ?? null;
  const [accounts, setAccounts] = useState<SwitcherAccount[]>([{ id: "primary", name: defaultName, email: defaultEmail, plan: defaultPlan }]);
  const [activeAccountId, setActiveAccountId] = useState("primary");
  const [accountSwitcherOpen, setAccountSwitcherOpen] = useState(false);
  const [addingAccount, setAddingAccount] = useState(false);
  const [showAccountPassword, setShowAccountPassword] = useState(false);
  const activeAccount = accounts.find((account) => account.id === activeAccountId) ?? accounts[0];
  const displayName = activeAccount.name;
  const displayEmail = activeAccount.email;
  const displayPlan = activeAccount.plan;
  const isPrimaryAccount = activeAccount.id === "primary";
  const initials = displayName.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [transactionsOpen, setTransactionsOpen] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const transactionsActive = transactionPages.some((item) => pathname === item.href);

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

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const poll = window.setInterval(async () => {
      try {
        const count = await getUnreadNotificationCount();
        if (cancelled) return;
        setUnreadCount((previous) => {
          if (count > previous) audioRef.current?.play().catch(() => {});
          return count;
        });
      } catch {
        // ignore transient polling errors
      }
    }, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [user]);

  return <>
    <button aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="fixed left-4 top-4 z-30 grid size-11 place-items-center rounded-xl border border-violet-100 bg-white text-violet-800 shadow-sm md:hidden"><Menu size={20} /></button>
    <button aria-label="Close navigation overlay" onClick={() => setMobileOpen(false)} className={`fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-[2px] transition-opacity duration-300 ease-in-out md:hidden ${mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`} />
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[282px] flex-col overflow-visible border-r border-violet-100 bg-white px-4 py-5 shadow-[8px_0_30px_rgba(76,29,149,0.04)] transition-[width,transform] duration-300 ease-out will-change-transform md:sticky md:top-0 md:h-screen md:translate-x-0 md:duration-500 md:ease-in-out ${collapsed ? "md:w-[82px]" : "md:w-[282px]"} ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className={`flex items-center gap-3 px-2 ${collapsed ? "md:justify-center md:px-0" : ""}`}>
        <div className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-white shadow-lg shadow-violet-200"><Image src="/logo.png" alt="AKCounting logo" fill className="object-contain p-1" /></div>
        <div className={`whitespace-nowrap transition-all duration-300 ${collapsed ? "md:w-0 md:translate-x-2 md:overflow-hidden md:opacity-0" : "md:w-[120px] md:opacity-100"}`}><p className="text-[15px] font-semibold tracking-tight text-slate-900">AKCounting</p><p className="text-[10px] font-medium uppercase tracking-[0.18em] text-violet-500">by Nepsus</p></div>
        <button aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed((value) => !value)} className={`ml-auto hidden size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-violet-50 hover:text-violet-700 md:grid ${collapsed ? "md:absolute md:left-[48px] md:top-6 md:rounded-full md:border md:border-violet-100 md:bg-white md:shadow-sm" : ""}`}>{collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</button>
        <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="ml-auto text-slate-400 md:hidden"><X size={20} /></button>
      </div>
      <label className={`mt-6 flex h-10 items-center gap-2.5 rounded-lg border border-violet-100 bg-violet-50/70 px-3 text-slate-400 transition-all duration-500 focus-within:border-violet-300 focus-within:bg-white ${collapsed ? "md:justify-center md:gap-0 md:px-0" : ""}`} title={collapsed ? "Search" : undefined}><Search size={16} className="shrink-0" /><input aria-label="Search navigation" placeholder="Search" className={`min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none transition-all duration-300 placeholder:text-slate-400 ${collapsed ? "md:w-0 md:flex-none md:opacity-0" : "md:opacity-100"}`} /><kbd className={`overflow-hidden whitespace-nowrap rounded border border-violet-100 bg-white px-1.5 py-0.5 text-[9px] text-slate-400 transition-all duration-300 ${collapsed ? "md:w-0 md:border-0 md:px-0 md:opacity-0" : "md:w-7 md:opacity-100"}`}>⌘K</kbd></label>
      <nav className="mt-5 flex-1 overflow-y-auto">
        <p className={`whitespace-nowrap px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 transition-all duration-300 ${collapsed ? "md:h-0 md:overflow-hidden md:pb-0 md:opacity-0" : "md:h-6 md:opacity-100"}`}>Workspace</p>
        <div className="flex flex-col gap-px">
          {navigation.map(({ label, href, icon: Icon }) => { const active = pathname === href; return <Link key={href} href={href} title={collapsed ? label : undefined} onClick={() => setMobileOpen(false)} className={`group flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] font-semibold transition-all duration-300 ${label === "Dashboard" ? "order-0" : "order-2"} ${collapsed ? "md:justify-center md:gap-0 md:px-0" : ""} ${active ? "bg-violet-50 text-violet-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}><Icon size={17} strokeWidth={active ? 2.2 : 1.7} className={`shrink-0 ${active ? "text-violet-700" : "text-slate-400 group-hover:text-violet-600"}`} /><span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? "md:w-0 md:opacity-0" : "md:w-[150px] md:opacity-100"}`}>{label}</span>{active && <span className={`shrink-0 rounded-full bg-violet-600 transition-all duration-200 ${collapsed ? "md:ml-0 md:size-0 md:opacity-0" : "ml-auto size-1.5 opacity-100"}`} />}</Link>; })}
          <div className={`order-1 rounded-lg ${transactionsActive ? "bg-violet-50" : ""}`}>
            <button title={collapsed ? "Transactions" : undefined} onClick={() => collapsed ? setCollapsed(false) : setTransactionsOpen((value) => !value)} className={`flex h-9 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-semibold transition-all duration-300 ${collapsed ? "md:justify-center md:gap-0 md:px-0" : ""} ${transactionsActive ? "text-violet-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}><ArrowLeftRight size={17} className={`shrink-0 ${transactionsActive ? "text-violet-700" : "text-slate-400"}`} /><span className={`overflow-hidden whitespace-nowrap text-left transition-all duration-300 ${collapsed ? "md:w-0 md:opacity-0" : "md:w-auto md:flex-1 md:opacity-100"}`}>Transactions</span><ChevronDown size={14} className={`shrink-0 transition-all duration-300 ${collapsed ? "md:w-0 md:opacity-0" : "ml-auto"} ${transactionsOpen ? "rotate-180" : ""}`} /></button>
            {transactionsOpen && <div className={`ml-5 overflow-hidden border-l border-violet-100 pl-5 transition-all duration-300 ${collapsed ? "md:max-h-0 md:py-0 md:opacity-0" : "max-h-40 pb-1 opacity-100"}`}>{transactionPages.map((item) => <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`block rounded-md px-2 py-2 text-xs font-medium ${pathname === item.href ? "text-violet-700" : "text-slate-500 hover:text-slate-900"}`}>{item.label}</Link>)}</div>}
          </div>
        </div>
      </nav>
      <div className="border-t border-slate-100 pt-3">
        <Link href="/notifications" title={collapsed ? "Notifications" : undefined} onClick={() => setMobileOpen(false)} className={`flex h-9 items-center gap-3 rounded-lg px-3 text-xs font-semibold transition-all duration-300 ${pathname === "/notifications" ? "bg-violet-50 text-violet-800" : "text-slate-500 hover:bg-slate-50"} ${collapsed ? "md:justify-center md:gap-0 md:px-0" : ""}`}><Bell size={16} className={`shrink-0 ${pathname === "/notifications" ? "text-violet-700" : "text-slate-400"}`} /><span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? "md:w-0 md:opacity-0" : "md:w-[140px] md:opacity-100"}`}>Notifications</span>{unreadCount > 0 && <span className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-violet-100 text-[9px] text-violet-700 transition-all duration-200 ${collapsed ? "md:ml-0 md:size-0 md:opacity-0" : "ml-auto size-5 opacity-100"}`}>{unreadCount > 9 ? "9+" : unreadCount}</span>}</Link>
        <Link href="/support" title={collapsed ? "Support" : undefined} className={`flex h-9 items-center gap-3 rounded-lg px-3 text-xs font-semibold text-slate-500 transition-all duration-300 hover:bg-slate-50 ${collapsed ? "md:justify-center md:gap-0 md:px-0" : ""}`}><CircleHelp size={16} className="shrink-0 text-slate-400" /><span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? "md:w-0 md:opacity-0" : "md:w-[170px] md:opacity-100"}`}>Support</span></Link>
        <div ref={accountMenuRef} className="relative mt-3">
          {accountOpen && <div role="menu" className={`absolute bottom-[calc(100%+8px)] z-50 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.18)] ${collapsed ? "left-0 w-60" : "inset-x-0"}`}>
            <button type="button" onClick={() => { setAccountSwitcherOpen((value) => !value); setAddingAccount(false); }} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-slate-50"><div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-violet-300 to-fuchsia-300 text-[10px] font-semibold text-violet-950">{isPrimaryAccount && avatarUrl ? <img src={avatarUrl} alt={displayName} className="size-full object-cover" /> : initials}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{displayName}</p><p className="truncate text-[10px] text-slate-400">{displayEmail}</p></div><ChevronRight size={16} className={`text-slate-500 transition ${accountSwitcherOpen ? "rotate-90" : ""}`} /></button>
            {accountSwitcherOpen && <div className="absolute bottom-0 left-0 z-[60] w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_55px_rgba(15,23,42,0.2)] md:left-[calc(100%+10px)] md:w-72"><p className="px-2 pb-1.5 pt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">Switch account</p><div className="space-y-1">{accounts.map((account) => { const selected = account.id === activeAccountId; const accountInitials = account.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase(); return <button key={account.id} type="button" onClick={() => { setActiveAccountId(account.id); setAccountSwitcherOpen(false); }} className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition ${selected ? "bg-violet-50" : "hover:bg-slate-50"}`}><span className="grid size-8 shrink-0 place-items-center rounded-full bg-fuchsia-100 text-[8px] font-semibold text-fuchsia-700">{accountInitials}</span><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-semibold text-slate-700">{account.name}</span><span className="block truncate text-[8px] text-slate-400">{account.email}</span></span>{selected && <Check size={15} className="shrink-0 text-violet-700" />}</button>; })}</div><div className="my-2 border-t border-slate-200" /><button type="button" onClick={() => { setAddingAccount(true); setAccountSwitcherOpen(false); setAccountOpen(false); }} className="flex h-10 w-full items-center gap-2 rounded-xl px-2.5 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-50"><Plus size={16} />Add another account</button></div>}
            <div className="my-1 border-t border-slate-100" />
            <Link role="menuitem" href="/subscription" onClick={() => setAccountOpen(false)} className="flex h-9 items-center gap-3 rounded-lg px-2.5 text-xs font-medium text-violet-700 hover:bg-violet-50"><Sparkles size={16} />Subscription</Link>
            <Link role="menuitem" href="/personalization" onClick={() => setAccountOpen(false)} className="flex h-9 items-center gap-3 rounded-lg px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"><Palette size={16} />Personalization</Link>
            <Link role="menuitem" href="/settings" onClick={() => setAccountOpen(false)} className="flex h-9 items-center gap-3 rounded-lg px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"><Settings size={16} />Settings</Link>
            <div className="my-1 border-t border-slate-100" />
            <Link role="menuitem" href="/refer" onClick={() => setAccountOpen(false)} className="flex h-9 items-center gap-3 rounded-lg bg-gradient-to-r from-violet-50 to-fuchsia-50 px-2.5 text-xs font-semibold text-violet-700 hover:from-violet-100 hover:to-fuchsia-100"><Gift size={16} />Refer & Earn<ChevronRight size={15} className="ml-auto" /></Link>
            <form action={logoutUser}><button role="menuitem" type="submit" className="flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-xs font-medium text-slate-700 hover:bg-red-50 hover:text-red-700"><LogOut size={16} />Log out</button></form>
          </div>}
          <button aria-expanded={accountOpen} aria-haspopup="menu" onClick={() => setAccountOpen((value) => !value)} className={`flex w-full items-center rounded-xl border border-violet-100 bg-violet-50/60 p-2.5 text-left transition-all duration-300 hover:border-violet-200 hover:bg-violet-50 ${collapsed ? "md:justify-center md:border-transparent md:bg-transparent md:p-1" : ""}`}><div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-amber-200 to-rose-200 text-xs font-semibold text-violet-950">{isPrimaryAccount && avatarUrl ? <img src={avatarUrl} alt={displayName} className="size-full object-cover" /> : initials}</div><div className={`min-w-0 flex-1 overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? "md:w-0 md:flex-none md:px-0 md:opacity-0" : "md:w-[150px] md:px-2.5 md:opacity-100"}`}><p className="truncate text-[11px] font-semibold text-slate-800">{displayName}</p><p className="truncate text-[9px] text-slate-500">{displayPlan}</p></div><MoreVertical size={15} className={`shrink-0 text-slate-400 transition-all duration-200 ${collapsed ? "md:w-0 md:opacity-0" : "md:opacity-100"}`} /></button>
        </div>
      </div>
    </aside>
    <audio ref={audioRef} src="/sounds/notification.mp3" preload="auto" className="hidden" />
    {addingAccount &&<div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setAddingAccount(false); }}><div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/60 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.3)]"><div className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-600 px-6 pb-8 pt-6 text-white"><div className="pointer-events-none absolute -right-12 -top-16 size-44 rounded-full bg-white/10 blur-2xl" /><button aria-label="Close account login" onClick={() => setAddingAccount(false)} className="absolute right-4 top-4 grid size-8 place-items-center rounded-lg bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"><X size={15} /></button><span className="relative grid size-11 place-items-center rounded-xl bg-white/15 shadow-inner backdrop-blur"><WalletCards size={20} /></span><h2 className="relative mt-4 text-xl font-semibold">Add another account</h2><p className="relative mt-1 text-[11px] leading-5 text-violet-100">Sign in to another AKCounting account. You can switch between accounts anytime.</p></div><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const email = String(data.get("accountEmail") ?? "").trim(); if (!email) return; const rawName = email.split("@")[0].replace(/[._-]+/g, " "); const name = rawName.replace(/\b\w/g, (letter) => letter.toUpperCase()); const account = { id: `account-${Date.now()}`, name, email, plan: "Free" }; setAccounts((items) => [...items, account]); setActiveAccountId(account.id); setAddingAccount(false); setShowAccountPassword(false); }} className="p-6"><div className="space-y-4"><label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-700">Email address</span><span className="flex h-11 items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 transition focus-within:border-violet-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-violet-100"><Mail size={15} className="text-slate-400" /><input required name="accountEmail" type="email" autoComplete="username" placeholder="you@example.com" className="w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400" /></span></label><label className="block"><span className="mb-1.5 flex items-center justify-between text-[10px] font-semibold text-slate-700">Password <Link href="/forgot-password" onClick={() => setAddingAccount(false)} className="font-medium text-violet-600 hover:text-violet-800">Forgot password?</Link></span><span className="flex h-11 items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 transition focus-within:border-violet-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-violet-100"><LockKeyhole size={15} className="text-slate-400" /><input required name="accountPassword" type={showAccountPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" className="w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400" /><button type="button" aria-label={showAccountPassword ? "Hide password" : "Show password"} onClick={() => setShowAccountPassword((value) => !value)} className="text-slate-400 hover:text-slate-600">{showAccountPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></span></label></div><div className="mt-5 rounded-lg bg-violet-50 px-3 py-2.5"><p className="flex items-start gap-2 text-[9px] leading-4 text-violet-700"><ShieldCheck size={13} className="mt-0.5 shrink-0" />Your current account stays signed in. Adding this account will not log you out.</p></div><button type="submit" className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-violet-600 text-xs font-semibold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700">Continue <ChevronRight size={15} /></button><button type="button" onClick={() => setAddingAccount(false)} className="mt-2 h-10 w-full rounded-lg text-[10px] font-semibold text-slate-500 transition hover:bg-slate-50">Cancel</button></form></div></div>}
  </>;
}
