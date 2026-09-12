"use client";

import { AlertCircle, ArrowRight, Eye, EyeOff, Landmark, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { completePasswordSetup, type SetPasswordState } from "@/actions/auth";

export function SetPasswordCard({ token }: { token: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, pending] = useActionState<SetPasswordState, FormData>(completePasswordSetup, undefined);

  return (
    <section className="mx-auto w-full max-w-[420px] overflow-hidden rounded-[28px] border border-violet-100 bg-white p-8 shadow-[0_30px_90px_rgba(76,29,149,0.14)] sm:p-10">
      <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-lg bg-violet-700 text-white shadow-lg shadow-violet-200"><Landmark size={19} /></span><div><p className="font-semibold text-slate-900">AKCounting</p><p className="text-[8px] font-medium uppercase tracking-[0.2em] text-violet-500">by Nepsus</p></div></div>

      <div className="mt-7"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-600">Account access</p><h1 className="mt-2 text-[24px] font-semibold tracking-tight text-slate-950">Set your password</h1><p className="mt-2 text-[11px] leading-5 text-slate-500">Choose a password to activate your account or reset your existing one, then sign in.</p></div>

      {!token ? <p className="mt-6 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[9px] font-medium text-rose-600"><AlertCircle size={13} className="shrink-0" />This link is missing its token. Please use the link from your invite or reset email.</p> : <form action={formAction} className="mt-7 space-y-4">
        <input type="hidden" name="token" value={token} />
        {state?.error && <p role="alert" className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[9px] font-medium text-rose-600"><AlertCircle size={13} className="shrink-0" />{state.error}</p>}
        <label className="block"><span className="mb-1.5 block text-[9px] font-semibold text-slate-600">New password</span><span className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 transition focus-within:border-violet-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-violet-50"><LockKeyhole size={14} className="shrink-0 text-slate-400" /><input name="password" type={showPassword ? "text" : "password"} required minLength={8} pattern="(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}" title="At least 8 characters, including an uppercase letter, a number, and a symbol." placeholder="Uppercase, number & symbol · 8+ characters" className="min-w-0 w-full bg-transparent text-[9px] text-slate-800 outline-none placeholder:text-slate-400" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)} className="shrink-0 text-slate-400 hover:text-violet-600">{showPassword ? <EyeOff size={14} /> : <Eye size={14} />}</button></span></label>
        <label className="block"><span className="mb-1.5 block text-[9px] font-semibold text-slate-600">Confirm password</span><span className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 transition focus-within:border-violet-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-violet-50"><LockKeyhole size={14} className="shrink-0 text-slate-400" /><input name="confirmPassword" type={showPassword ? "text" : "password"} required minLength={8} placeholder="Enter password again" className="min-w-0 w-full bg-transparent text-[9px] text-slate-800 outline-none placeholder:text-slate-400" /></span></label>
        <button disabled={pending} className="group flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-violet-700 text-[10px] font-semibold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:bg-violet-800 hover:shadow-xl disabled:opacity-70">{pending ? "Setting password..." : "Set password & sign in"}{!pending && <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />}</button>
      </form>}

      <p className="mt-6 text-center text-[10px] text-slate-500">Already have a password? <Link href="/login" className="font-semibold text-violet-700 hover:text-violet-900">Sign in</Link></p>
      <div className="mt-8 flex items-center justify-center gap-2 text-[8px] text-slate-400"><ShieldCheck size={11} className="text-violet-500" />Your information is protected with bank-level security.</div>
    </section>
  );
}
