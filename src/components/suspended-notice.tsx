import { Ban, LifeBuoy, Mail, MessageCircle, ShieldAlert } from "lucide-react";
import Link from "next/link";

export function SuspendedNotice({ reason }: { reason?: string | null }) {
  return <div className="relative grid min-h-screen place-items-center overflow-hidden bg-[#050510] p-6">
    <div className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-rose-600/20 blur-3xl" />
    <div className="pointer-events-none absolute -right-24 top-1/3 size-80 rounded-full bg-violet-600/20 blur-3xl" />
    <div className="pointer-events-none absolute bottom-0 left-1/3 size-72 rounded-full bg-fuchsia-600/10 blur-3xl" />
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:22px_22px]" />

    <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-rose-500/15 to-transparent" />

      <div className="relative mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 shadow-lg shadow-rose-900/40 ring-1 ring-white/10">
        <span className="absolute inset-0 animate-ping rounded-2xl bg-rose-500/40" />
        <Ban size={28} className="relative text-white" strokeWidth={2.25} />
      </div>

      <span className="relative mx-auto mt-5 flex w-fit items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-rose-300"><ShieldAlert size={11} />Access restricted</span>

      <h1 className="relative mt-4 text-xl font-semibold tracking-tight text-white">Your account has been suspended</h1>
      <p className="relative mt-2.5 text-[12px] leading-6 text-slate-400">You no longer have access to your AKCounting workspace. Please reach out to our support team to resolve this.</p>

      {reason && <div className="relative mt-5 rounded-xl border border-rose-400/20 bg-rose-500/[0.07] p-4 text-left">
        <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-rose-300"><Ban size={11} />Reason provided by the platform team</p>
        <p className="mt-1.5 text-[11px] leading-5 text-slate-300">{reason}</p>
      </div>}

      <div className="relative mt-6 grid grid-cols-2 gap-2.5">
        <a href="mailto:support@akcounting.com" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-violet-700 text-[11px] font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:from-violet-400 hover:to-violet-600"><Mail size={14} />Email support</a>
        <a href="mailto:support@akcounting.com" className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10"><MessageCircle size={14} />Live chat</a>
      </div>

      <div className="relative mt-6 flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-3 text-left">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/5 text-violet-300"><LifeBuoy size={14} /></span>
        <p className="text-[10px] leading-4 text-slate-400">Our team typically responds within a few hours. Your data stays safe while your account is under review.</p>
      </div>

      <p className="relative mt-6 text-[10px] text-slate-500"><Link href="/login" className="font-semibold text-violet-400 hover:text-violet-300 hover:underline">Back to login</Link></p>
    </div>
  </div>;
}
