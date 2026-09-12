"use client";

import { Bot, Loader2, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { askAssistant, type ChatMessage } from "@/actions/ai-assistant";
import { AI_ASSISTANT_TOGGLE_EVENT, AI_ASSISTANT_STORAGE_KEY } from "@/lib/ai-assistant-preference";

const SUGGESTIONS = ["How much income did I receive this month?", "What are my biggest expenses?", "What's my outstanding invoice total?", "Summarize my loan balances."];

export function AiAssistant() {
  const [enabled, setEnabled] = useState(true);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function readPreference() { setEnabled(localStorage.getItem(AI_ASSISTANT_STORAGE_KEY) !== "off"); }
    readPreference();
    window.addEventListener(AI_ASSISTANT_TOGGLE_EVENT, readPreference);
    window.addEventListener("storage", readPreference);
    return () => {
      window.removeEventListener(AI_ASSISTANT_TOGGLE_EVENT, readPreference);
      window.removeEventListener("storage", readPreference);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  if (!enabled) return null;

  async function send(text: string) {
    const question = text.trim();
    if (!question || pending) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setPending(true);
    const result = await askAssistant(nextMessages);
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setMessages((current) => [...current, { role: "assistant", content: result.reply }]);
  }

  return <>
    <button onClick={() => setOpen((value) => !value)} aria-label={open ? "Close AI assistant" : "Open AI assistant"} className="fixed bottom-5 right-5 z-40 flex size-13 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-300/50 transition hover:scale-105 md:bottom-7 md:right-7">
      {open ? <X size={22} /> : <Bot size={22} />}
      {!open && <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-emerald-400 text-white ring-2 ring-white"><Sparkles size={9} /></span>}
    </button>

    {open && <div className="fixed bottom-22 right-5 z-40 flex h-[min(600px,75vh)] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/40 md:bottom-24 md:right-7">
      <header className="flex items-center gap-2.5 border-b border-slate-100 bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-3.5 text-white">
        <span className="grid size-8 place-items-center rounded-full bg-white/15"><Bot size={16} /></span>
        <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold">AKCounting AI</p><p className="text-[10px] text-white/75">Ask about your income, expenses & more</p></div>
        <button onClick={() => setOpen(false)} aria-label="Close" className="grid size-7 place-items-center rounded-lg text-white/80 hover:bg-white/15"><X size={15} /></button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 px-4 py-4">
        {messages.length === 0 && <div className="space-y-3">
          <p className="text-[11px] text-slate-500">Hi! I can answer questions about your real transactions, invoices, salaries and loans. Try asking:</p>
          <div className="flex flex-wrap gap-1.5">{SUGGESTIONS.map((suggestion) => <button key={suggestion} onClick={() => send(suggestion)} className="rounded-full border border-violet-200 bg-white px-2.5 py-1.5 text-left text-[10px] font-medium text-violet-700 hover:bg-violet-50">{suggestion}</button>)}</div>
        </div>}
        {messages.map((message, index) => <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed ${message.role === "user" ? "rounded-br-sm bg-blue-600 text-white" : "rounded-bl-sm border border-slate-200 bg-white text-slate-700"}`}>{message.content}</div></div>)}
        {pending && <div className="flex justify-start"><div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3.5 py-2.5 text-[11px] text-slate-400"><Loader2 size={13} className="animate-spin" />Thinking…</div></div>}
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-600">{error}</div>}
      </div>

      <form onSubmit={(event) => { event.preventDefault(); send(input); }} className="flex items-center gap-2 border-t border-slate-100 bg-white p-3">
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about your finances..." className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[12px] text-slate-700 outline-none focus:border-violet-300" />
        <button type="submit" disabled={pending || !input.trim()} aria-label="Send" className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white transition disabled:opacity-40"><Send size={15} /></button>
      </form>
    </div>}
  </>;
}
