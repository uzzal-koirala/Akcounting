"use client";

import { startTransition, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, CalendarDays, CheckCircle2, Clock3, Headphones, ImagePlus, LifeBuoy, Mail, MessageSquareText, Paperclip, Phone, Send, ShieldCheck, X } from "lucide-react";

import { createSupportTicket, replyToMyTicket, type SupportTicketRecord } from "@/actions/support";
import { FilterSelect } from "@/components/filter-select";

const priorityStyle = { High: "bg-rose-50 text-rose-700", Medium: "bg-amber-50 text-amber-700", Low: "bg-slate-100 text-slate-600" };
const statusStyle = { Open: "bg-blue-50 text-blue-700", "In progress": "bg-violet-50 text-violet-700", Resolved: "bg-emerald-50 text-emerald-700" };
// Explicit locale so the server-rendered date text always matches the client, regardless of the
// browser's locale settings — using the bare toLocaleDateString()/toLocaleString() caused a
// hydration mismatch (e.g. "08/09/2026" on the server vs "9/8/2026" on the client).
const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const dateTimeFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

const faqs = [
  { question: "How do I create my first invoice?", answer: "Go to Invoices → Create invoice, pick a design, then fill in your client and line items." },
  { question: "Can I change my subscription plan?", answer: "Yes, visit the Subscription page from your account menu to upgrade, downgrade, or switch billing cycles." },
  { question: "How is my data backed up?", answer: "Your data is stored securely in our database and can be exported anytime from Reports or Documents." },
];

export function SupportPage({ initialTickets }: { initialTickets: SupportTicketRecord[] }) {
  const router = useRouter();
  const [tickets, setTickets] = useState(initialTickets);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("General");
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const [replyImagePreview, setReplyImagePreview] = useState<string | null>(null);
  const replyImageInputRef = useRef<HTMLInputElement>(null);
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState("");
  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null;

  function pickImage(event: ChangeEvent<HTMLInputElement>, setFile: (file: File | null) => void, setPreview: (url: string | null) => void) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    setFile(file);
    setPreview(URL.createObjectURL(file));
  }

  const counts = { open: tickets.filter((t) => t.status === "Open").length, progress: tickets.filter((t) => t.status === "In progress").length, resolved: tickets.filter((t) => t.status === "Resolved").length };
  const stats = [
    { label: "Total", value: tickets.length, icon: LifeBuoy, tone: "bg-slate-100 text-slate-600" },
    { label: "Open", value: counts.open, icon: AlertCircle, tone: "bg-blue-50 text-blue-600" },
    { label: "In progress", value: counts.progress, icon: Clock3, tone: "bg-violet-50 text-violet-600" },
    { label: "Resolved", value: counts.resolved, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600" },
  ];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(false);
    const form = new FormData();
    form.set("subject", subject);
    form.set("category", category);
    form.set("priority", priority);
    form.set("message", message);
    if (image) form.set("image", image);
    try {
      const created = await createSupportTicket(form);
      setTickets((current) => [created, ...current]);
      setSubject("");
      setMessage("");
      setPriority("Medium");
      setCategory("General");
      setImage(null);
      setImagePreview(null);
      setSuccess(true);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not submit your ticket. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function openTicket(ticketId: string) { setReply(""); setReplyImage(null); setReplyImagePreview(null); setReplyError(""); setSelectedId(ticketId); }

  function sendReply() {
    if (!selected) return;
    const message = reply.trim();
    if (!message && !replyImage) return;
    setReplySending(true);
    setReplyError("");
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("message", message);
        if (replyImage) formData.set("image", replyImage);
        await replyToMyTicket(selected.id, formData);
        const nowIso = new Date().toISOString();
        const imageUrl = replyImagePreview;
        setTickets((current) => current.map((item) => item.id === selected.id ? { ...item, status: item.status === "Resolved" ? "Open" : item.status, replies: [...item.replies, { id: `local-${Date.now()}`, authorName: "You", isAdmin: false, message, imageUrl, createdAt: nowIso }] } : item));
        setReply("");
        setReplyImage(null);
        setReplyImagePreview(null);
      } catch (caught) {
        setReplyError(caught instanceof Error ? caught.message : "Could not send your reply. Please try again.");
      } finally {
        setReplySending(false);
      }
    });
  }

  return <div className="mx-auto flex max-w-[1450px] flex-col gap-5">
    <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]"><div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-violet-100/70 blur-3xl" /><div className="relative flex flex-col gap-4 px-4 py-5 sm:gap-5 sm:px-6 sm:py-6 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-3 sm:gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-200 sm:size-12"><Headphones size={19} className="sm:size-[21px]" /></span><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-600">AKCounting support</p><h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Support & tickets</h1><p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">Tell us what you need help with and track every request in one place.</p></div></div><div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3"><span className="relative flex size-2 shrink-0"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-50" /><span className="relative inline-flex size-2 rounded-full bg-emerald-500" /></span><div><p className="text-[10px] font-semibold text-emerald-800">Support team online</p><p className="mt-0.5 text-[9px] text-emerald-600">Typical reply in under 2 hours</p></div></div></div></header>

    <section className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">{stats.map((stat) => { const Icon = stat.icon; return <article key={stat.label} className="group min-w-0 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-violet-200 hover:shadow-sm sm:p-4"><div className="flex items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-[9px] font-medium text-slate-400 sm:text-[10px]">{stat.label} tickets</p><p className="mt-1.5 truncate text-lg font-semibold text-slate-900 sm:text-xl">{stat.value}</p></div><span className={`grid size-9 shrink-0 place-items-center rounded-xl sm:size-10 ${stat.tone}`}><Icon size={16} /></span></div></article>; })}</section>

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_410px]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.035)]"><div className="border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-violet-50 text-violet-600"><MessageSquareText size={16} /></span><div><h2 className="text-sm font-semibold text-slate-900">Create a support ticket</h2><p className="mt-0.5 text-[10px] text-slate-400">Share a few details so we can route your request to the right specialist.</p></div></div></div><div className="p-5">{error && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[10px] font-medium text-rose-600">{error}</p>}{success && <p className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[10px] font-medium text-emerald-700"><CheckCircle2 size={14} />Your ticket has been submitted. We&apos;ll get back to you soon.</p>}<form onSubmit={handleSubmit} className="space-y-5"><label className="block"><span className="text-[11px] font-semibold text-slate-700">What do you need help with?</span><input required value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Example: I cannot download my invoice" className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100" /></label><div className="grid gap-5 lg:grid-cols-[1fr_220px]"><fieldset><legend className="text-[11px] font-semibold text-slate-700">Choose a category</legend><div className="mt-2"><FilterSelect className="h-11" value={category} onChange={setCategory} options={["General", "Billing", "Invoices", "Transactions", "Reports", "Technical"].map((item) => ({ value: item, label: item }))} /></div></fieldset><fieldset><legend className="text-[11px] font-semibold text-slate-700">How urgent is it?</legend><div className="mt-2"><FilterSelect className="h-11" value={priority} onChange={(value) => setPriority(value as typeof priority)} options={[{ value: "Low", label: "Low priority", dot: "bg-slate-400" }, { value: "Medium", label: "Medium priority", dot: "bg-amber-500" }, { value: "High", label: "High priority", dot: "bg-rose-500" }]} /></div></fieldset></div><label className="block"><span className="flex items-center justify-between text-[11px] font-semibold text-slate-700">Describe the issue <span className="text-[9px] font-normal text-slate-400">{message.length}/1000</span></span><textarea required maxLength={1000} value={message} onChange={(event) => setMessage(event.target.value)} rows={7} placeholder="What happened, what did you expect, and have you already tried anything?" className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100" /></label><div><span className="text-[11px] font-semibold text-slate-700">Attach a screenshot <span className="font-normal text-slate-400">(optional)</span></span><input ref={imageInputRef} onChange={(event) => pickImage(event, setImage, setImagePreview)} type="file" accept="image/*" className="hidden" />
      {imagePreview ? <div className="group relative mt-2 flex items-center gap-3.5 overflow-hidden rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-white p-3">
          <div className="relative shrink-0"><img src={imagePreview} alt="Attachment preview" className="size-16 rounded-lg border border-white object-cover shadow-sm ring-1 ring-slate-200/70" /><span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-emerald-500 text-white shadow-sm"><CheckCircle2 size={11} /></span></div>
          <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold text-slate-700">{image?.name}</p><p className="mt-0.5 text-[9px] text-slate-400">{image ? `${(image.size / 1024).toFixed(0)} KB · ready to send` : ""}</p></div>
          <button type="button" onClick={() => { setImage(null); setImagePreview(null); }} className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><X size={14} /></button>
        </div>
       : <button type="button" onClick={() => imageInputRef.current?.click()} className="group mt-2 flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 text-slate-400 transition hover:border-violet-300 hover:bg-violet-50/50 hover:text-violet-600">
          <span className="grid size-9 place-items-center rounded-full bg-white text-violet-500 shadow-sm ring-1 ring-slate-100 transition group-hover:ring-violet-100"><ImagePlus size={16} /></span>
          <span className="text-[10px] font-semibold">Click to add an image</span>
          <span className="text-[9px] text-slate-400">PNG or JPG, up to 3 MB</span>
        </button>}
      </div><div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-1.5 text-[9px] text-slate-400"><ShieldCheck size={12} className="text-emerald-500" />Your account details are shared securely with support.</p><button type="submit" disabled={pending} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 text-[10px] font-semibold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700 disabled:opacity-60">{pending ? "Submitting..." : <><Send size={13} />Submit ticket</>}</button></div></form></div></section>

      <aside className="space-y-4 xl:sticky xl:top-6"><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.03)]"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-semibold text-slate-900">Your tickets</h2><p className="mt-0.5 text-[9px] text-slate-400">{tickets.length} total request{tickets.length === 1 ? "" : "s"}</p></div><span className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500"><Clock3 size={14} /></span></div><div className="max-h-[430px] overflow-y-auto p-3">{tickets.length === 0 ? <div className="grid min-h-48 place-items-center text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400"><LifeBuoy size={18} /></span><p className="mt-3 text-[11px] font-semibold text-slate-700">No tickets yet</p><p className="mt-1 text-[9px] text-slate-400">Your submitted requests will appear here.</p></div></div> : <ul className="space-y-2">{tickets.map((ticket) => <li key={ticket.id}><button onClick={() => openTicket(ticket.id)} className="group w-full rounded-xl border border-slate-100 p-3.5 text-left transition hover:border-violet-100 hover:bg-violet-50/30"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-[11px] font-semibold text-slate-800">{ticket.subject}</p><p className="mt-1 line-clamp-2 text-[9px] leading-4 text-slate-400">{ticket.message}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-semibold ${statusStyle[ticket.status]}`}>{ticket.status}</span></div><div className="mt-3 flex flex-wrap items-center gap-1.5 text-[8px] text-slate-400"><span className={`rounded-full px-2 py-0.5 font-semibold ${priorityStyle[ticket.priority]}`}>{ticket.priority}</span><span className="truncate">{ticket.category}</span><span className="whitespace-nowrap">· {dateFormatter.format(new Date(ticket.createdAt))}</span>{ticket.imageUrl && <span className="flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-500"><Paperclip size={8} />1</span>}{ticket.replies.length > 0 && <span className="rounded-full bg-violet-50 px-1.5 py-0.5 font-semibold text-violet-600">{ticket.replies.length} repl{ticket.replies.length === 1 ? "y" : "ies"}</span>}<ArrowRight size={11} className="ml-auto shrink-0 text-slate-300 transition group-hover:text-violet-500" /></div></button></li>)}</ul>}</div></section><section className="rounded-2xl bg-gradient-to-br from-slate-900 to-violet-950 p-5 text-white shadow-lg"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-300">Direct support</p><h2 className="mt-2 text-sm font-semibold">Need another way to reach us?</h2><p className="mt-1 text-[9px] leading-4 text-slate-300">Available Sunday–Friday, 9:00 AM–6:00 PM NPT.</p><div className="mt-4 space-y-2"><a href="mailto:support@akcounting.app" className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2.5 text-[10px] text-white transition hover:bg-white/15"><Mail size={13} className="text-violet-300" />support@akcounting.app</a><a href="tel:+97714000000" className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2.5 text-[10px] text-white transition hover:bg-white/15"><Phone size={13} className="text-violet-300" />+977 1-4000000</a></div></section></aside>
    </div>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.03)]"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-violet-50 text-violet-600"><LifeBuoy size={15} /></span><div><h2 className="text-sm font-semibold text-slate-900">Quick answers</h2><p className="mt-0.5 text-[9px] text-slate-400">Common questions you may be able to solve immediately.</p></div></div><div className="mt-4 grid gap-3 md:grid-cols-3">{faqs.map((faq) => <article key={faq.question} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"><p className="text-[11px] font-semibold text-slate-700">{faq.question}</p><p className="mt-2 text-[9px] leading-4 text-slate-500">{faq.answer}</p></article>)}</div></section>

    {selected && <div className="fixed inset-0 z-[85] grid place-items-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedId(null); }}>
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-violet-700 to-violet-950 px-4 py-4 text-white sm:px-6 sm:py-5">
          <span className="pointer-events-none absolute -right-10 -top-14 size-40 rounded-full bg-white/10 blur-3xl" />
          <button onClick={() => setSelectedId(null)} className="absolute right-3 top-3 grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 hover:bg-white/20 sm:right-4 sm:top-4"><X size={15} /></button>
          <span className={`relative inline-block rounded-full px-2.5 py-1 text-[9px] font-semibold ${statusStyle[selected.status]} bg-white/15 text-white`}>{selected.status}</span>
          <h2 className="relative mt-3 max-w-[85%] truncate text-base font-semibold leading-snug">{selected.subject}</h2>
          <p className="relative mt-1 text-[10px] text-violet-100">{selected.category} · {selected.priority} priority</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-3">
            <div className="rounded-2xl rounded-tl-sm border border-slate-100 bg-slate-50 p-3.5 sm:p-4"><p className="text-[9px] font-semibold text-slate-600">You</p>{selected.message && <p className="mt-1.5 text-[11px] leading-5 text-slate-600">{selected.message}</p>}{selected.imageUrl && <a href={selected.imageUrl} target="_blank" rel="noreferrer" className="mt-2 block"><img src={selected.imageUrl} alt="Attachment" className="max-h-48 w-full max-w-full rounded-lg border border-slate-200 object-cover" /></a>}<p className="mt-3 flex items-center gap-1 text-[9px] text-slate-400"><CalendarDays size={11} />{dateTimeFormatter.format(new Date(selected.createdAt))}</p></div>
            {selected.replies.map((item) => <div key={item.id} className={`rounded-2xl p-3.5 sm:p-4 ${item.isAdmin ? "rounded-tl-sm border border-violet-100 bg-violet-50/70" : "rounded-tr-sm border border-slate-100 bg-slate-50"}`}><p className={`text-[9px] font-semibold ${item.isAdmin ? "text-violet-700" : "text-slate-600"}`}>{item.isAdmin ? "AKCounting Support" : "You"}</p>{item.message && <p className="mt-1.5 text-[11px] leading-5 text-slate-600">{item.message}</p>}{item.imageUrl && <a href={item.imageUrl} target="_blank" rel="noreferrer" className="mt-2 block"><img src={item.imageUrl} alt="Attachment" className="max-h-48 w-full max-w-full rounded-lg border border-slate-200 object-cover" /></a>}<p className="mt-3 flex items-center gap-1 text-[9px] text-slate-400"><CalendarDays size={11} />{dateTimeFormatter.format(new Date(item.createdAt))}</p></div>)}
          </div>
          <div className="mt-5"><p className="text-[10px] font-semibold text-slate-700">Add a reply</p><textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Share more details or follow up..." rows={4} className="mt-2 w-full resize-none rounded-xl border border-slate-200 p-3 text-[11px] leading-5 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
            <input ref={replyImageInputRef} onChange={(event) => pickImage(event, setReplyImage, setReplyImagePreview)} type="file" accept="image/*" className="hidden" />
            {replyImagePreview ? <div className="mt-2 flex items-center gap-3 rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/70 to-white p-2.5"><div className="relative shrink-0"><img src={replyImagePreview} alt="Attachment preview" className="size-12 rounded-lg border border-white object-cover shadow-sm ring-1 ring-slate-200/70" /><span className="absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full bg-emerald-500 text-white shadow-sm"><CheckCircle2 size={9} /></span></div><p className="min-w-0 flex-1 truncate text-[9px] font-medium text-slate-600">{replyImage?.name}</p><button type="button" onClick={() => { setReplyImage(null); setReplyImagePreview(null); }} className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X size={12} /></button></div> : <button type="button" onClick={() => replyImageInputRef.current?.click()} className="mt-2 flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-slate-200 px-3 text-[9px] font-semibold text-slate-500 transition hover:border-violet-300 hover:bg-violet-50/50 hover:text-violet-600"><ImagePlus size={13} />Attach an image</button>}
            {replyError && <p role="alert" className="mt-2 text-[9px] font-medium text-rose-600">{replyError}</p>}
            <div className="mt-3 flex justify-end"><button onClick={sendReply} disabled={(!reply.trim() && !replyImage) || replySending} className="flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-5 text-[10px] font-semibold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"><Send size={13} />{replySending ? "Sending..." : "Send"}</button></div>
          </div>
        </div>
      </div>
    </div>}
  </div>;
}
