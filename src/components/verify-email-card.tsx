"use client";

import { AlertCircle, CheckCircle2, Landmark, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { logoutUser, resendVerificationEmail } from "@/actions/auth";

export function VerifyEmailCard({ email, error }: { email: string | null; error?: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ error?: string; sent?: boolean } | null>(null);

  function resend() {
    setResult(null);
    startTransition(async () => {
      const outcome = await resendVerificationEmail();
      setResult(outcome);
    });
  }

  return (
    <section className="mx-auto w-full max-w-[420px] overflow-hidden rounded-[28px] border border-violet-100 bg-white p-8 text-center shadow-[0_30px_90px_rgba(76,29,149,0.14)] sm:p-10">
      <div className="flex items-center justify-center gap-3"><span className="grid size-11 place-items-center rounded-lg bg-violet-700 text-white shadow-lg shadow-violet-200"><Landmark size={19} /></span><div className="text-left"><p className="font-semibold text-slate-900">AKCounting</p><p className="text-[8px] font-medium uppercase tracking-[0.2em] text-violet-500">by Nepsus</p></div></div>

      <span className="mx-auto mt-7 grid size-14 place-items-center rounded-2xl bg-violet-50 text-violet-600"><Mail size={24} /></span>
      <h1 className="mt-5 text-[22px] font-semibold tracking-tight text-slate-950">Verify your email</h1>

      {error ? (
        <p role="alert" className="mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-left text-[9px] font-medium text-rose-600"><AlertCircle size={13} className="shrink-0" />{error}</p>
      ) : (
        <p className="mt-3 text-[11px] leading-5 text-slate-500">We&apos;ve sent a verification link to {email ? <span className="font-semibold text-slate-700">{email}</span> : "your email address"}. Click it to activate your account and pick a plan.</p>
      )}

      {result?.sent && <p className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-left text-[9px] font-medium text-emerald-700"><CheckCircle2 size={13} className="shrink-0" />A new verification link is on its way — check your inbox.</p>}
      {result?.error && <p role="alert" className="mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-left text-[9px] font-medium text-rose-600"><AlertCircle size={13} className="shrink-0" />{result.error}</p>}

      <button onClick={resend} disabled={isPending} className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-violet-700 text-[10px] font-semibold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:bg-violet-800 hover:shadow-xl disabled:opacity-70">{isPending ? "Sending..." : "Resend verification email"}</button>

      <form action={logoutUser} className="mt-3"><button className="h-10 w-full rounded-lg border border-slate-200 text-[10px] font-semibold text-slate-600">Sign out</button></form>

      <p className="mt-6 text-[10px] text-slate-500">Wrong email? <Link href="/register" className="font-semibold text-violet-700 hover:text-violet-900">Create a new account</Link></p>
      <div className="mt-8 flex items-center justify-center gap-2 text-[8px] text-slate-400"><ShieldCheck size={11} className="text-violet-500" />Your information is protected with bank-level security.</div>
    </section>
  );
}
