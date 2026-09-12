import { Sparkles } from "lucide-react";
import Link from "next/link";

export function TrialBanner({ daysLeft }: { daysLeft: number }) {
  return <div className="mb-5 flex flex-col gap-2 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-blue-50 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet-600 text-white shadow-sm shadow-violet-200"><Sparkles size={14} /></span>
      <p className="text-[11px] font-medium text-slate-700">You&apos;re on a free trial — <span className="font-semibold text-violet-700">{daysLeft} day{daysLeft === 1 ? "" : "s"} left</span>. Choose a plan to keep uninterrupted access.</p>
    </div>
    <Link href="/subscription" className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 px-3.5 text-[10px] font-semibold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700">Choose a plan</Link>
  </div>;
}
