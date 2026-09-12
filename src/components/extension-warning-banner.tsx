import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export function ExtensionWarningBanner({ daysLeft }: { daysLeft: number }) {
  return <div className="mb-5 flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
    <p className="flex items-center gap-2 text-[11px] font-semibold text-rose-600"><AlertTriangle size={14} className="shrink-0" />Your extended access will end in {daysLeft} day{daysLeft === 1 ? "" : "s"} — upgrade your subscription to avoid losing access.</p>
    <Link href="/subscription" className="flex h-8 shrink-0 items-center justify-center rounded-lg bg-rose-600 px-3.5 text-[10px] font-semibold text-white shadow-sm transition hover:bg-rose-700">Upgrade now</Link>
  </div>;
}
