"use client";

import { Archive, Check, ChevronDown, CloudUpload, Crown, Download, Eye, File, FileArchive, FileImage, FileSpreadsheet, FileText, Plus, Search, ShieldCheck, Star, Trash2, X } from "lucide-react";
import { ChangeEvent, FormEvent, startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { UpgradeModal } from "@/components/upgrade-gate";
import { canUploadDocuments, planLimits, type PlanName } from "@/lib/plan";
import { createDocumentCategory, deleteDocumentCategory, deleteDocument, toggleDocumentStar, uploadDocument, type DocumentCategoryRecord, type DocumentRecord } from "@/actions/documents";

const ALL_FILES = "All files";

const DOCUMENT_EXTENSIONS = ["PDF", "DOC", "DOCX", "XLS", "XLSX", "CSV", "TXT", "PPT", "PPTX"];
const IMAGE_EXTENSIONS = ["PNG", "JPG", "JPEG", "WEBP", "GIF", "SVG"];
const ALLOWED_EXTENSIONS = [...DOCUMENT_EXTENSIONS, ...IMAGE_EXTENSIONS];
const ACCEPT_ATTR = [...ALLOWED_EXTENSIONS.map((ext) => `.${ext.toLowerCase()}`), "image/*"].join(",");
const STORAGE_QUOTA_BYTES = 100 * 1024 * 1024;

function formatBytes(bytes: number) { if (bytes === 0) return "0 KB"; if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`; return `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
function docIcon(extension: string) { const type = extension.toUpperCase(); if (["XLS", "XLSX", "CSV"].includes(type)) return FileSpreadsheet; if (["PNG", "JPG", "JPEG", "WEBP"].includes(type)) return FileImage; if (["ZIP", "RAR", "7Z"].includes(type)) return FileArchive; if (["PDF", "DOC", "DOCX", "TXT"].includes(type)) return FileText; return File; }
const iconTone = (extension: string) => ["XLS", "XLSX", "CSV"].includes(extension) ? "bg-emerald-50 text-emerald-600" : ["PNG", "JPG", "JPEG", "WEBP"].includes(extension) ? "bg-fuchsia-50 text-fuchsia-600" : extension === "PDF" ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600";
function fileTone(extension: string) {
  if (["XLS", "XLSX", "CSV"].includes(extension)) return { band: "bg-gradient-to-br from-emerald-500 to-teal-500", icon: "text-emerald-600", chip: "bg-emerald-50 text-emerald-600" };
  if (["PNG", "JPG", "JPEG", "WEBP", "GIF", "SVG"].includes(extension)) return { band: "bg-gradient-to-br from-fuchsia-500 to-pink-500", icon: "text-fuchsia-600", chip: "bg-fuchsia-50 text-fuchsia-600" };
  if (extension === "PDF") return { band: "bg-gradient-to-br from-rose-500 to-orange-500", icon: "text-rose-600", chip: "bg-rose-50 text-rose-600" };
  if (["PPT", "PPTX"].includes(extension)) return { band: "bg-gradient-to-br from-amber-500 to-orange-500", icon: "text-amber-600", chip: "bg-amber-50 text-amber-600" };
  return { band: "bg-gradient-to-br from-blue-500 to-indigo-500", icon: "text-blue-600", chip: "bg-blue-50 text-blue-600" };
}

function CategoryFilterSelect({ categories, value, onChange, counts }: { categories: DocumentCategoryRecord[]; value: string; onChange: (name: string) => void; counts: Record<string, number> }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) { if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false); }
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("mousedown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, [open]);

  const selected = categories.find((item) => item.name === value);

  return <div ref={containerRef} className="relative">
    <button type="button" onClick={() => setOpen((current) => !current)} aria-haspopup="listbox" aria-expanded={open} className={`flex h-10 items-center gap-2 rounded-lg border bg-white px-3 text-[11px] font-semibold outline-none transition ${open ? "border-violet-400" : "border-slate-200 hover:border-slate-300"}`}>
      {selected ? <span className={`size-2 shrink-0 rounded-full ${selected.color}`} /> : <span className="size-2 shrink-0 rounded-full bg-violet-600" />}
      <span className="text-slate-700">{value}</span>
      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">{counts[value] ?? 0}</span>
      <ChevronDown size={13} className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div role="listbox" className="absolute right-0 z-30 mt-1.5 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
      <button type="button" role="option" aria-selected={value === ALL_FILES} onClick={() => { onChange(ALL_FILES); setOpen(false); }} className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[11px] font-semibold transition ${value === ALL_FILES ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-50"}`}>
        <span className="size-2 shrink-0 rounded-full bg-violet-600" />
        <span className="flex-1 truncate">{ALL_FILES}</span>
        <span className="rounded-full bg-white px-1.5 py-0.5 text-[9px] font-semibold text-slate-400">{counts[ALL_FILES] ?? 0}</span>
        {value === ALL_FILES && <Check size={13} className="shrink-0 text-violet-600" />}
      </button>
      <div className="my-1 border-t border-slate-100" />
      {categories.map((item) => { const active = value === item.name; return <button key={item.id} type="button" role="option" aria-selected={active} onClick={() => { onChange(item.name); setOpen(false); }} className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[11px] font-medium transition ${active ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-50"}`}>
        <span className={`size-2 shrink-0 rounded-full ${item.color}`} />
        <span className="flex-1 truncate">{item.name}</span>
        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">{counts[item.name] ?? 0}</span>
        {active && <Check size={13} className="shrink-0 text-violet-600" />}
      </button>; })}
    </div>}
  </div>;
}

function CategorySelect({ categories, value, onChange, onCreate, onDelete }: { categories: DocumentCategoryRecord[]; value: string; onChange: (name: string) => void; onCreate: (name: string) => void; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    function onPointerDown(event: MouseEvent) { if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false); }
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("mousedown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, [open]);

  const matches = categories.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase()));
  const exactMatch = categories.some((item) => item.name.toLowerCase() === search.trim().toLowerCase());
  const selected = categories.find((item) => item.name === value);

  function createFromSearch() {
    const name = search.trim();
    if (!name || exactMatch) return;
    onCreate(name);
    onChange(name);
    setSearch("");
    setOpen(false);
  }

  return <div ref={containerRef} className="relative">
    <button type="button" onClick={() => setOpen((current) => !current)} aria-haspopup="listbox" aria-expanded={open} className={`flex h-10 w-full items-center gap-2 rounded-lg border bg-white px-3 text-[10px] font-medium outline-none transition ${open ? "border-violet-400" : "border-slate-200 hover:border-slate-300"}`}>
      {selected ? <span className={`size-2 shrink-0 rounded-full ${selected.color}`} /> : <span className="size-2 shrink-0 rounded-full bg-slate-300" />}
      <span className={`flex-1 truncate text-left ${value ? "text-slate-700" : "text-slate-400"}`}>{value || "Select a category"}</span>
      <ChevronDown size={13} className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center gap-2 border-b border-slate-100 p-2"><Search size={13} className="shrink-0 text-slate-400" /><input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (matches.length === 1) { onChange(matches[0].name); setSearch(""); setOpen(false); } else if (!exactMatch && search.trim()) createFromSearch(); } }} placeholder="Search or create category..." className="w-full text-[10px] outline-none placeholder:text-slate-400" /></div>
      <div role="listbox" className="max-h-56 overflow-y-auto p-1.5">
        {matches.map((item) => { const active = value === item.name; return <div key={item.id} className={`group flex items-center gap-2 rounded-lg px-2.5 ${active ? "bg-violet-50" : "hover:bg-slate-50"}`}>
          <button type="button" role="option" aria-selected={active} onClick={() => { onChange(item.name); setOpen(false); setSearch(""); }} className="flex h-9 flex-1 items-center gap-2.5 text-left text-[10px] font-medium text-slate-700">
            <span className={`size-2 shrink-0 rounded-full ${item.color}`} />
            <span className="flex-1 truncate">{item.name}</span>
            {active && <Check size={13} className="shrink-0 text-violet-600" />}
          </button>
          <button type="button" onClick={() => onDelete(item.id)} disabled={categories.length <= 1} aria-label={`Delete ${item.name} category`} className="grid size-6 shrink-0 place-items-center rounded-full text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-0 group-hover:opacity-100"><Trash2 size={11} /></button>
        </div>; })}
        {matches.length === 0 && !search.trim() && <p className="px-2.5 py-4 text-center text-[9px] text-slate-400">No categories yet.</p>}
        {search.trim() && !exactMatch && <button type="button" onClick={createFromSearch} className="mt-0.5 flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[10px] font-semibold text-violet-700 hover:bg-violet-50"><Plus size={13} className="shrink-0" />Create &quot;{search.trim()}&quot;</button>}
      </div>
    </div>}
  </div>;
}

export function DocumentsPage({ plan, initialDocuments, initialCategories }: { plan: PlanName; initialDocuments: DocumentRecord[]; initialCategories: DocumentCategoryRecord[] }) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [syncedDocuments, setSyncedDocuments] = useState(initialDocuments);
  if (initialDocuments !== syncedDocuments) { setSyncedDocuments(initialDocuments); setDocuments(initialDocuments); }

  const [categories, setCategories] = useState(initialCategories);
  const [syncedCategories, setSyncedCategories] = useState(initialCategories);
  if (initialCategories !== syncedCategories) { setSyncedCategories(initialCategories); setCategories(initialCategories); }

  const [category, setCategory] = useState<string>(ALL_FILES);
  const [query, setQuery] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const documentLimit = planLimits(plan).maxDocuments;
  const uploadsLocked = !canUploadDocuments(documents.length, plan);
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = documents.filter((doc) => (category === ALL_FILES || doc.category === category) && doc.name.toLowerCase().includes(query.toLowerCase()));
  const defaultCategory = categories[0]?.name ?? "Other";
  const uploadExtension = uploadFile ? (uploadFile.name.split(".").pop() ?? "").toUpperCase() : "";

  function openUploadModal(file?: File) {
    if (uploadsLocked) { setUpgradeOpen(true); return; }
    setUploadError(null);
    if (file) {
      const parts = file.name.split(".");
      const extension = parts.length > 1 ? parts.pop()!.toUpperCase() : "";
      setUploadFile(file);
      setUploadName(parts.join(".") || file.name);
      if (!ALLOWED_EXTENSIONS.includes(extension)) setUploadError("Only document and image files up to 4 MB can be uploaded.");
    } else {
      setUploadFile(null);
      setUploadName("");
    }
    setUploadCategory(defaultCategory);
    setUploadModalOpen(true);
  }
  function closeUploadModal() {
    if (uploading) return;
    setUploadModalOpen(false);
    setUploadFile(null);
    setUploadName("");
    setUploadError(null);
  }
  function pickUploadFile(file: File) {
    const parts = file.name.split(".");
    const extension = parts.length > 1 ? parts.pop()!.toUpperCase() : "";
    setUploadFile(file);
    if (!uploadName.trim()) setUploadName(parts.join(".") || file.name);
    setUploadError(ALLOWED_EXTENSIONS.includes(extension) ? null : "Only document and image files up to 4 MB can be uploaded.");
  }

  async function addCategory(rawName: string) {
    const name = rawName.trim();
    if (!name || categories.some((item) => item.name.toLowerCase() === name.toLowerCase())) return;
    try {
      const created = await createDocumentCategory(name);
      setCategories((items) => [...items, created]);
    } catch {
      startTransition(() => router.refresh());
    }
  }
  async function removeCategory(id: string) {
    const target = categories.find((item) => item.id === id);
    if (!target || categories.length <= 1) return;
    const fallback = categories.find((item) => item.id !== id)?.name ?? "Other";
    setCategories((items) => items.filter((item) => item.id !== id));
    setDocuments((items) => items.map((item) => item.category === target.name ? { ...item, category: fallback } : item));
    if (uploadCategory === target.name) setUploadCategory(fallback);
    if (category === target.name) setCategory(ALL_FILES);
    try {
      await deleteDocumentCategory(id);
      startTransition(() => router.refresh());
    } catch {
      startTransition(() => router.refresh());
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) { if (event.target.files?.[0]) pickUploadFile(event.target.files[0]); event.target.value = ""; }

  function confirmUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uploadFile) { setUploadError("Choose a file to upload."); return; }
    if (!ALLOWED_EXTENSIONS.includes(uploadExtension)) { setUploadError("Only document and image files up to 4 MB can be uploaded."); return; }
    setUploading(true);
    setUploadError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("file", uploadFile);
        formData.set("name", uploadName.trim() || uploadFile.name);
        formData.set("category", uploadCategory || defaultCategory);
        const created = await uploadDocument(formData);
        setDocuments((items) => [created, ...items]);
        closeUploadModal();
      } catch (caught) {
        setUploadError(caught instanceof Error ? caught.message : "Could not upload this file. Please try again.");
      } finally {
        setUploading(false);
      }
    });
  }

  function downloadDocument(doc: DocumentRecord) {
    const anchor = document.createElement("a");
    anchor.href = doc.url;
    anchor.download = `${doc.name}.${doc.extension.toLowerCase()}`;
    anchor.click();
  }

  function removeDocument(id: string) {
    setDocuments((items) => items.filter((item) => item.id !== id));
    startTransition(async () => {
      try {
        await deleteDocument(id);
      } finally {
        router.refresh();
      }
    });
  }

  function toggleStar(id: string) {
    setDocuments((items) => items.map((item) => item.id === id ? { ...item, starred: !item.starred } : item));
    startTransition(async () => {
      try {
        await toggleDocumentStar(id);
      } finally {
        router.refresh();
      }
    });
  }

  const totalBytes = documents.reduce((sum, doc) => sum + doc.bytes, 0);
  const storagePercent = Math.min(100, Math.round((totalBytes / STORAGE_QUOTA_BYTES) * 100));
  const lastUpload = documents[0]?.uploaded ?? "No uploads yet";
  const categoryCounts = documents.reduce<Record<string, number>>((acc, doc) => { acc[doc.category] = (acc[doc.category] ?? 0) + 1; return acc; }, { [ALL_FILES]: documents.length });

  return <div className="space-y-5">
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#312e81] via-violet-700 to-fuchsia-600 p-6 text-white shadow-xl shadow-violet-200"><div className="absolute -right-20 -top-24 size-72 rounded-full border-[40px] border-white/5" /><div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2"><span className="grid size-10 place-items-center rounded-xl bg-white/15 backdrop-blur"><Archive size={18} /></span><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-100">Secure file library</p></div><h1 className="mt-3 text-2xl font-semibold tracking-tight">Documents</h1><p className="mt-1 max-w-xl text-xs text-violet-100">Keep financial files, agreements, receipts, and reports organized and ready to download.</p></div><button onClick={() => openUploadModal()} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-[10px] font-semibold text-violet-700 shadow-xl">{uploadsLocked ? <Crown size={15} /> : <Plus size={15} />}Upload documents</button></div></header>

    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_2px_12px_rgba(15,23,42,0.025)] transition hover:border-violet-200 hover:shadow-sm sm:p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[11px] font-medium text-slate-400">Total documents</p><p className="mt-2 truncate text-base font-semibold tracking-tight text-slate-900 sm:text-xl">{documents.length}</p></div><div className="grid size-8 shrink-0 place-items-center rounded-full bg-violet-50 text-violet-600 sm:size-9"><Archive size={15} /></div></div><div className="mt-3 flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-violet-500" /><p className="text-[10px] text-slate-400">Across {categories.length} categor{categories.length === 1 ? "y" : "ies"}</p></div></article>
      <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_2px_12px_rgba(15,23,42,0.025)] transition hover:border-blue-200 hover:shadow-sm sm:p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[11px] font-medium text-slate-400">Storage used</p><p className="mt-2 truncate text-base font-semibold tracking-tight text-slate-900 sm:text-xl">{formatBytes(totalBytes)}</p></div><div className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600 sm:size-9"><CloudUpload size={15} /></div></div><div className="mt-3 flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-blue-500" /><p className="text-[10px] text-slate-400">{storagePercent}% of 100 MB quota</p></div></article>
      <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_2px_12px_rgba(15,23,42,0.025)] transition hover:border-amber-200 hover:shadow-sm sm:p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[11px] font-medium text-slate-400">Last upload</p><p className="mt-2 truncate text-base font-semibold tracking-tight text-slate-900 sm:text-xl">{lastUpload}</p></div><div className="grid size-8 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-600 sm:size-9"><FileText size={15} /></div></div><div className="mt-3 flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-amber-400" /><p className="text-[10px] text-slate-400">{documents.length} file{documents.length === 1 ? "" : "s"} in your library</p></div></article>
      <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_2px_12px_rgba(15,23,42,0.025)] transition hover:border-emerald-200 hover:shadow-sm sm:p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[11px] font-medium text-slate-400">Workspace security</p><p className="mt-2 truncate text-base font-semibold tracking-tight text-slate-900 sm:text-xl">Protected</p></div><div className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600 sm:size-9"><ShieldCheck size={15} /></div></div><div className="mt-3 flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-emerald-500" /><p className="text-[10px] text-slate-400">Files encrypted at rest</p></div></article>
    </section>

    <section className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.025)]">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
        <div><h2 className="text-sm font-semibold text-slate-900">Document library</h2><p className="mt-0.5 text-[9px] text-slate-400">Search, filter, and manage all uploaded files</p></div>
        <div className="flex flex-wrap gap-2">
          <label className="flex h-10 min-w-56 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-400 focus-within:bg-white"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search documents" placeholder="Search documents..." className="w-full bg-transparent text-[12px] outline-none" /></label>
          <CategoryFilterSelect categories={categories} value={category} onChange={setCategory} counts={categoryCounts} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left">
          <thead><tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-semibold uppercase tracking-wider text-slate-400"><th className="px-5 py-3">File</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Size</th><th className="px-4 py-3">Uploaded</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3" /></tr></thead>
          <tbody>{filtered.map((doc) => { const Icon = docIcon(doc.extension); const tone = fileTone(doc.extension); return <tr key={doc.id} className="border-b border-slate-50 transition last:border-0 hover:bg-violet-50/30"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className={`grid size-10 place-items-center rounded-xl ${tone.chip}`}><Icon size={17} /></div><div className="min-w-0"><p className="truncate text-[13px] font-semibold text-slate-800">{doc.name}</p><p className="mt-0.5 text-[11px] text-slate-400">{doc.extension} · {doc.size}</p></div></div></td><td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">{doc.category}</span></td><td className="px-4 py-4 text-[12px] text-slate-500">{doc.size}</td><td className="px-4 py-4 text-[12px] text-slate-500">{doc.uploaded}</td><td className="px-4 py-4 text-[12px] text-slate-500">{doc.owner}</td><td className="px-4 py-4"><div className="flex items-center justify-end gap-1.5"><button onClick={() => toggleStar(doc.id)} aria-label={doc.starred ? `Unstar ${doc.name}` : `Star ${doc.name}`} className={`grid size-9 place-items-center rounded-lg transition ${doc.starred ? "text-amber-400" : "text-slate-300 hover:bg-slate-50 hover:text-amber-400"}`}><Star size={16} fill={doc.starred ? "currentColor" : "none"} /></button><button onClick={() => setPreviewDoc(doc)} aria-label={`View ${doc.name}`} className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><Eye size={16} /></button><button onClick={() => downloadDocument(doc)} aria-label={`Download ${doc.name}`} className="grid size-9 place-items-center rounded-lg text-violet-600 hover:bg-violet-50"><Download size={16} /></button><button onClick={() => removeDocument(doc.id)} aria-label={`Delete ${doc.name}`} className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button></div></td></tr>; })}</tbody>
        </table>
        {filtered.length === 0 && <div className="p-10 text-center text-sm text-slate-400">No documents found. Upload a document or change your filters.</div>}
      </div>
      <footer className="flex items-center justify-between border-t border-slate-100 px-5 py-3"><p className="text-[9px] text-slate-400">Showing {filtered.length} of {documents.length} documents</p></footer>
    </section>
    {uploadModalOpen && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) closeUploadModal(); }}><form onSubmit={confirmUpload} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600">New file</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Upload document</h2><p className="mt-1 text-[10px] text-slate-400">Choose a file, give it a name, and pick a category before it&apos;s added to your library.</p></div><button type="button" onClick={closeUploadModal} disabled={uploading} className="grid size-8 place-items-center rounded-lg bg-slate-50 text-slate-500 disabled:opacity-50"><X size={15} /></button></div>
      {uploadError && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[9px] font-medium text-rose-600">{uploadError}</p>}

      <div className="mt-5 space-y-1.5">
        <label className="block text-[9px] font-semibold text-slate-600">File</label>
        {uploadFile ? (() => { const Icon = docIcon(uploadExtension); return <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${iconTone(uploadExtension)}`}><Icon size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold text-slate-700">{uploadFile.name}</p><p className="mt-0.5 text-[8px] text-slate-400">{uploadExtension} · {formatBytes(uploadFile.size)}</p></div><button type="button" onClick={() => inputRef.current?.click()} className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-semibold text-slate-600 hover:bg-slate-100">Change</button></div>; })()
          : <button type="button" onClick={() => inputRef.current?.click()} className="flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/40 text-center hover:border-violet-300 hover:bg-violet-50"><CloudUpload size={18} className="text-violet-500" /><span className="text-[9px] font-semibold text-slate-600">Click to choose a file</span><span className="text-[8px] text-slate-400">Documents and images only, up to 4 MB</span></button>}
        <input ref={inputRef} onChange={onFileChange} type="file" accept={ACCEPT_ATTR} className="hidden" />
      </div>

      <label className="mt-4 block space-y-1.5"><span className="block text-[9px] font-semibold text-slate-600">File name</span><input required value={uploadName} onChange={(event) => setUploadName(event.target.value)} placeholder="Document name" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[10px] outline-none focus:border-violet-400" /></label>

      <div className="mt-4 space-y-1.5"><span className="block text-[9px] font-semibold text-slate-600">Category</span><CategorySelect categories={categories} value={uploadCategory} onChange={setUploadCategory} onCreate={addCategory} onDelete={removeCategory} /></div>

      <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={closeUploadModal} disabled={uploading} className="h-10 rounded-xl border border-slate-200 px-4 text-[10px] font-semibold text-slate-600 disabled:opacity-50">Cancel</button><button type="submit" disabled={uploading || !uploadFile} className="h-10 rounded-xl bg-violet-700 px-5 text-[10px] font-semibold text-white disabled:opacity-60">{uploading ? "Uploading..." : "Save & upload"}</button></div></form></div>}
    {previewDoc && (() => { const isImage = IMAGE_EXTENSIONS.includes(previewDoc.extension); const isPdf = previewDoc.extension === "PDF"; const Icon = docIcon(previewDoc.extension); return <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewDoc(null); }}><div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5"><div className="flex min-w-0 items-center gap-3"><span className={`grid size-9 shrink-0 place-items-center rounded-xl ${iconTone(previewDoc.extension)}`}><Icon size={17} /></span><div className="min-w-0"><p className="truncate text-[11px] font-semibold text-slate-800">{previewDoc.name}</p><p className="text-[8px] text-slate-400">{previewDoc.extension} · {previewDoc.size}</p></div></div><div className="flex shrink-0 items-center gap-2"><button onClick={() => downloadDocument(previewDoc)} className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-[9px] font-semibold text-slate-600 hover:bg-slate-50"><Download size={13} />Download</button><button onClick={() => setPreviewDoc(null)} className="grid size-9 place-items-center rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100"><X size={15} /></button></div></div><div className="min-h-[50vh] flex-1 overflow-auto bg-slate-100">{isImage ? <img src={previewDoc.url} alt={previewDoc.name} className="mx-auto max-h-[75vh] w-full object-contain" /> : isPdf ? <iframe src={previewDoc.url} title={previewDoc.name} className="h-[75vh] w-full" /> : <div className="grid h-full min-h-[50vh] place-items-center p-8 text-center"><div><Icon size={32} className="mx-auto text-slate-300" /><p className="mt-3 text-[10px] font-semibold text-slate-600">Preview is only available for PDF and image files</p><p className="mt-1 text-[8px] text-slate-400">Download the file to view its contents.</p></div></div>}</div></div></div>; })()}
    <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} feature={documentLimit === 0 ? "document uploads" : "documents"} reason={documentLimit === 0 ? "locked" : "limit"} limit={documentLimit} plan={plan} />
  </div>;
}
