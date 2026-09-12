"use client";

import { Building2, Camera, Check, Landmark, Mail, MapPin, PenTool, Phone, QrCode, ReceiptText, Save, Upload, X } from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { saveBusinessProfile, type BusinessProfileRecord } from "@/actions/business-profile";

type Details = BusinessProfileRecord;

export function BusinessInvoiceProfile({ initialProfile }: { initialProfile: Details }) {
  const router = useRouter();
  const [details, setDetails] = useState(initialProfile);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(initialProfile.logoUrl);
  const [paymentQr, setPaymentQr] = useState<string | null>(initialProfile.qrUrl);
  const [signature, setSignature] = useState<string | null>(initialProfile.signatureUrl);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removeQr, setRemoveQr] = useState(false);
  const [removeSignature, setRemoveSignature] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const qrRef = useRef<HTMLInputElement>(null);
  const signatureRef = useRef<HTMLInputElement>(null);

  function preview(file: File | undefined, setter: (value: string) => void, clearRemove: () => void) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please choose an image file."); return; }
    if (file.size > 2 * 1024 * 1024) { setError("Image must be smaller than 2 MB."); return; }
    setError(null);
    clearRemove();
    const reader = new FileReader();
    reader.onload = () => setter(String(reader.result));
    reader.readAsDataURL(file);
  }

  function clearLogo() { setLogo(null); setRemoveLogo(true); if (logoRef.current) logoRef.current.value = ""; }
  function clearQr() { setPaymentQr(null); setRemoveQr(true); if (qrRef.current) qrRef.current.value = ""; }
  function clearSignature() { setSignature(null); setRemoveSignature(true); if (signatureRef.current) signatureRef.current.value = ""; }

  function update(key: keyof Details, value: string) { setDetails((current) => ({ ...current, [key]: value })); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("removeLogo", removeLogo ? "true" : "false");
    form.set("removeQr", removeQr ? "true" : "false");
    form.set("removeSignature", removeSignature ? "true" : "false");
    setPending(true);
    setError(null);
    try {
      await saveBusinessProfile(form);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch {
      setError("Could not save business details. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const fields = "mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[9px] text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-50";
  return <form onSubmit={save} className="mt-4 space-y-4">
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[9px] font-medium text-rose-600">{error}</p>}
    <section className="grid gap-4 xl:grid-cols-[320px_1fr]">
      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <Title icon={Camera} title="Business logo" description="Shown on invoices and reports" />
        <div className="relative mt-5">
          <button type="button" onClick={() => logoRef.current?.click()} className="grid min-h-40 w-full place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-4">
            {logo ? <img src={logo} alt="Business logo preview" className="max-h-28 max-w-full object-contain" /> : <span className="text-center"><span className="mx-auto grid size-11 place-items-center rounded-xl bg-white text-violet-600 shadow-sm"><Upload size={17} /></span><span className="mt-3 block text-[9px] font-semibold text-slate-700">Upload company logo</span><span className="mt-1 block text-[7px] text-slate-400">PNG, JPG or SVG · up to 2 MB</span></span>}
          </button>
          {logo && <button type="button" onClick={clearLogo} aria-label="Remove logo" className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg bg-white text-slate-500 shadow-sm hover:bg-rose-50 hover:text-rose-600"><X size={13} /></button>}
        </div>
        <input ref={logoRef} name="logo" type="file" accept="image/*" className="hidden" onChange={(e) => preview(e.target.files?.[0], setLogo, () => setRemoveLogo(false))} />
        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-[8px] leading-4 text-slate-500">A clear logo helps customers recognize and trust your invoices.</p>
      </article>
      <article className="rounded-2xl border border-slate-200 bg-white p-5"><Title icon={Building2} title="Business identity" description="Legal details printed on official invoices" /><div className="mt-5 grid gap-3 sm:grid-cols-2"><Field label="Legal business name" name="legalName" details={details} update={update} style={fields} required /><Field label="Trading name" name="tradingName" details={details} update={update} style={fields} /><Field label="PAN / VAT number" name="panVat" details={details} update={update} style={fields} /><Field label="Registration number" name="registration" details={details} update={update} style={fields} /><Field label="Invoice prefix" name="invoicePrefix" details={details} update={update} style={fields} required /><Field label="Default payment terms" name="paymentTerms" details={details} update={update} style={fields} /></div></article>
    </section>
    <section className="grid gap-4 xl:grid-cols-2"><article className="rounded-2xl border border-slate-200 bg-white p-5"><Title icon={Phone} title="Contact details" description="How customers can contact your business" /><div className="mt-5 grid gap-3 sm:grid-cols-2"><Field label="Billing email" name="email" details={details} update={update} style={fields} type="email" /><Field label="Phone number" name="phone" details={details} update={update} style={fields} /><div className="sm:col-span-2"><Field label="Website" name="website" details={details} update={update} style={fields} /></div></div><div className="mt-4 flex flex-wrap gap-2 text-[8px] text-slate-500">{details.email && <span className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2"><Mail size={11} />{details.email}</span>}{details.phone && <span className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2"><Phone size={11} />{details.phone}</span>}</div></article><article className="rounded-2xl border border-slate-200 bg-white p-5"><Title icon={MapPin} title="Business location" description="Full registered or billing address" /><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Street address" name="address" details={details} update={update} style={fields} /></div><Field label="City / Municipality" name="city" details={details} update={update} style={fields} /><Field label="Province / State" name="province" details={details} update={update} style={fields} /><Field label="Postal code" name="postalCode" details={details} update={update} style={fields} /><Field label="Country" name="country" details={details} update={update} style={fields} /></div></article></section>
    <section className="grid gap-4 xl:grid-cols-[1fr_320px]"><article className="rounded-2xl border border-slate-200 bg-white p-5"><Title icon={Landmark} title="Bank & payment information" description="Details customers can use to pay invoices" /><div className="mt-5 grid gap-3 sm:grid-cols-2"><Field label="Bank name" name="bankName" details={details} update={update} style={fields} /><Field label="Branch" name="branch" details={details} update={update} style={fields} /><Field label="Account holder name" name="accountName" details={details} update={update} style={fields} /><Field label="Account number" name="accountNumber" details={details} update={update} style={fields} /><Field label="SWIFT / BIC code" name="swift" details={details} update={update} style={fields} /><label className="text-[8px] font-semibold text-slate-600">Preferred payment method<select name="paymentMethod" value={details.paymentMethod} onChange={(e) => update("paymentMethod", e.target.value)} className={fields}><option>Bank transfer</option><option>Payment QR</option><option>Cash</option><option>Cheque</option></select></label><label className="sm:col-span-2 text-[8px] font-semibold text-slate-600">Payment instructions<textarea name="paymentNote" value={details.paymentNote} onChange={(e) => update("paymentNote", e.target.value)} rows={3} className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 p-3 text-[9px] leading-4 outline-none focus:border-violet-400" /></label></div></article><article className="rounded-2xl border border-slate-200 bg-white p-5"><Title icon={QrCode} title="Payment QR" description="Let customers scan and pay quickly" /><div className="relative mt-5"><button type="button" onClick={() => qrRef.current?.click()} className="grid aspect-square w-full place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 hover:border-violet-300">{paymentQr ? <img src={paymentQr} alt="Payment QR preview" className="h-full w-full object-contain" /> : <span className="text-center"><QrCode size={40} className="mx-auto text-slate-300" /><span className="mt-3 block text-[9px] font-semibold text-slate-600">Upload payment QR</span><span className="mt-1 block text-[7px] text-slate-400">eSewa, Khalti, Fonepay or bank QR</span></span>}</button>{paymentQr && <button type="button" onClick={clearQr} aria-label="Remove QR" className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg bg-white text-slate-500 shadow-sm hover:bg-rose-50 hover:text-rose-600"><X size={13} /></button>}</div><input ref={qrRef} name="qr" type="file" accept="image/*" className="hidden" onChange={(e) => preview(e.target.files?.[0], setPaymentQr, () => setRemoveQr(false))} /></article></section>
    <section className="grid gap-4 xl:grid-cols-[1fr_320px]"><article className="rounded-2xl border border-slate-200 bg-white p-5"><Title icon={PenTool} title="Signature & stamp" description="Shown at the bottom of every invoice you send" /><p className="mt-3 rounded-xl bg-slate-50 p-3 text-[8px] leading-4 text-slate-500">Upload a photo of your signature or company stamp — a scan on white paper works best. It replaces the plain &quot;Signed&quot; placeholder on all invoice templates.</p></article><article className="rounded-2xl border border-slate-200 bg-white p-5"><Title icon={PenTool} title="Upload signature" description="PNG with transparent background works best" /><div className="relative mt-5"><button type="button" onClick={() => signatureRef.current?.click()} className="grid aspect-[2/1] w-full place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 hover:border-violet-300">{signature ? <img src={signature} alt="Signature preview" className="h-full w-full object-contain" /> : <span className="text-center"><PenTool size={32} className="mx-auto text-slate-300" /><span className="mt-3 block text-[9px] font-semibold text-slate-600">Upload signature or stamp</span><span className="mt-1 block text-[7px] text-slate-400">PNG or JPG · up to 2 MB</span></span>}</button>{signature && <button type="button" onClick={clearSignature} aria-label="Remove signature" className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg bg-white text-slate-500 shadow-sm hover:bg-rose-50 hover:text-rose-600"><X size={13} /></button>}</div><input ref={signatureRef} name="signature" type="file" accept="image/*" className="hidden" onChange={(e) => preview(e.target.files?.[0], setSignature, () => setRemoveSignature(false))} /></article></section>
    <div className="sticky bottom-4 flex items-center justify-between rounded-2xl border border-violet-100 bg-white/95 p-3 shadow-xl backdrop-blur"><div className="flex items-center gap-2 px-2"><ReceiptText size={15} className="text-violet-600" /><div><p className="text-[9px] font-semibold text-slate-700">Invoice-ready business profile</p><p className="text-[7px] text-slate-400">These details will be available to invoice templates.</p></div></div><button type="submit" disabled={pending} className="flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-5 text-[9px] font-semibold text-white disabled:opacity-60">{saved ? <Check size={13} /> : <Save size={13} />}{pending ? "Saving..." : saved ? "Details saved" : "Save details"}</button></div>
    {saved && <div className="fixed bottom-6 right-6 z-[90] flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-[9px] font-semibold text-white shadow-xl"><Check size={13} className="text-emerald-400" />Payment details saved successfully</div>}
  </form>;
}

function Title({ icon: Icon, title, description }: { icon: typeof Building2; title: string; description: string }) { return <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-600"><Icon size={15} /></span><div><h2 className="text-sm font-semibold text-slate-900">{title}</h2><p className="text-[8px] text-slate-400">{description}</p></div></div>; }
function Field({ label, name, details, update, style, required, type }: { label: string; name: keyof Details; details: Details; update: (key: keyof Details, value: string) => void; style: string; required?: boolean; type?: string }) { return <label className="text-[8px] font-semibold text-slate-600">{label}<input required={required} type={type ?? "text"} name={name} value={details[name] ?? ""} onChange={(e) => update(name, e.target.value)} className={style} /></label>; }
