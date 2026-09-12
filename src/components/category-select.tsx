"use client";

import { Check, ChevronDown, Plus, Tag, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

export type CategoryOption = { id: string; name: string };

const ACCENT = {
  violet: { ring: "border-violet-400", active: "bg-violet-50 text-violet-700", addBtn: "bg-violet-700 hover:bg-violet-800" },
  rose: { ring: "border-rose-400", active: "bg-rose-50 text-rose-700", addBtn: "bg-rose-600 hover:bg-rose-700" },
  teal: { ring: "border-teal-400", active: "bg-teal-50 text-teal-700", addBtn: "bg-teal-700 hover:bg-teal-800" },
} as const;

export function CategorySelect({
  name,
  categories,
  defaultValue,
  accent = "violet",
  onAdd,
  onDelete,
}: {
  name: string;
  categories: CategoryOption[];
  defaultValue?: string;
  accent?: keyof typeof ACCENT;
  onAdd: (name: string) => Promise<CategoryOption | void>;
  onDelete: (category: CategoryOption) => Promise<void>;
}) {
  const [value, setValue] = useState(defaultValue ?? categories[0]?.name ?? "");
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tones = ACCENT[accent];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) { setOpen(false); setAdding(false); }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); setAdding(false); }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function submitNewCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setFormError(null);
    try {
      const created = await onAdd(trimmed);
      setValue(created?.name ?? trimmed);
      setNewName("");
      setAdding(false);
      setOpen(false);
    } catch {
      setFormError("Could not add category.");
    }
  }

  async function handleDelete(category: CategoryOption) {
    setBusyId(category.id);
    try {
      await onDelete(category);
      if (value === category.name) {
        const remaining = categories.filter((item) => item.id !== category.id);
        setValue(remaining[0]?.name ?? "");
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-medium text-slate-800 outline-none transition ${open ? tones.ring : "hover:border-slate-300"}`}
      >
        <Tag size={13} className="shrink-0 text-slate-400" />
        <span className={`flex-1 truncate text-left ${value ? "" : "text-slate-400"}`}>{value || "Select a category"}</span>
        <ChevronDown size={13} className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          <div role="listbox" className="max-h-48 space-y-0.5 overflow-y-auto">
            {categories.length === 0 && <p className="px-2.5 py-2 text-[9px] text-slate-400">No categories yet.</p>}
            {categories.map((category) => {
              const active = value === category.name;
              return (
                <div key={category.id} className={`group flex items-center rounded-lg ${active ? tones.active : "hover:bg-slate-50"}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => { setValue(category.name); setOpen(false); }}
                    className="flex h-9 flex-1 items-center gap-2.5 px-2.5 text-left text-[10px] font-medium text-slate-600"
                  >
                    <span className="flex-1 truncate">{category.name}</span>
                    {active && <Check size={13} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(category)}
                    disabled={busyId === category.id}
                    aria-label={`Delete ${category.name}`}
                    className="mr-1.5 grid size-6 shrink-0 place-items-center rounded-md text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 group-hover:opacity-100"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-1 border-t border-slate-100 pt-1.5">
            {adding ? (
              <form onSubmit={submitNewCategory} className="flex items-center gap-1.5 px-1">
                <input
                  autoFocus
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="New category name"
                  maxLength={40}
                  className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 px-2 text-[9px] outline-none focus:border-slate-400"
                />
                <button type="submit" className={`grid size-8 shrink-0 place-items-center rounded-lg text-white ${tones.addBtn}`}><Check size={13} /></button>
                <button type="button" onClick={() => { setAdding(false); setNewName(""); setFormError(null); }} className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={13} /></button>
              </form>
            ) : (
              <button type="button" onClick={() => setAdding(true)} className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">
                <Plus size={13} />Add category
              </button>
            )}
            {formError && <p className="mt-1 px-2 text-[8px] font-medium text-rose-600">{formError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
