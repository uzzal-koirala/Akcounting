"use client";

import { AlertTriangle, Archive, Boxes, Check, CheckCircle2, ChevronDown, Download, Eye, Filter, Layers3, MoreHorizontal, Package, Pencil, Plus, ReceiptText, Search, ShoppingCart, Trash2, TrendingUp, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { createProduct, deleteProduct, sellProduct, updateProduct, type ProductRecord } from "@/actions/products";
import { PaymentMethodSelect } from "@/components/payment-method-select";
import { StatusSelect } from "@/components/status-select";
import { FilterSelect } from "@/components/filter-select";

type ModalMode = "create" | "edit" | "view" | null;
const money = (value: number) => `Rs ${new Intl.NumberFormat("en-NP", { maximumFractionDigits: 0 }).format(value)}/-`;

export function ProductsPage({ initialProducts, customerNames }: { initialProducts: ProductRecord[]; customerNames: string[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [status, setStatus] = useState("All status");
  const [modal, setModal] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<ProductRecord | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [sellOpen, setSellOpen] = useState(false);
  const [sellPending, setSellPending] = useState(false);
  const [sellError, setSellError] = useState("");
  const [sellNotice, setSellNotice] = useState("");

  const categories = useMemo(() => [...new Set(products.map((product) => product.category))].sort(), [products]);
  const filtered = useMemo(() => products.filter((product) => (category === "All categories" || product.category === category) && (status === "All status" || (status === "Low stock" ? product.type === "Product" && product.stock <= product.reorderLevel : product.status === status)) && `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(query.toLowerCase())), [products, query, category, status]);
  const activeProducts = products.filter((product) => product.status === "Active").length;
  const lowStock = products.filter((product) => product.type === "Product" && product.stock <= product.reorderLevel).length;
  const inventoryValue = products.reduce((sum, product) => sum + product.costPrice * product.stock, 0);

  function openModal(mode: Exclude<ModalMode, null>, product: ProductRecord | null = null) {
    setSelected(product);
    setModal(mode);
    setMenuId(null);
    setError("");
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const data = new FormData(event.currentTarget);
      const saved = modal === "edit" && selected ? await updateProduct(selected.id, data) : await createProduct(data);
      setProducts((items) => modal === "edit" ? items.map((item) => item.id === saved.id ? saved : item) : [saved, ...items]);
      setModal(null);
      setSelected(null);
    } catch (caught) {
      setError(caught instanceof Error && caught.message.includes("Unique constraint") ? "That SKU is already being used." : "Could not save this product. Check the information and try again.");
    } finally {
      setPending(false);
    }
  }

  async function submitSell(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSellPending(true);
    setSellError("");
    try {
      const data = new FormData(event.currentTarget);
      const { product, amount } = await sellProduct(data);
      setProducts((items) => items.map((item) => item.id === product.id ? product : item));
      setSellOpen(false);
      setSellNotice(`Sale recorded — ${money(amount)} added to income.`);
      window.setTimeout(() => setSellNotice(""), 3500);
    } catch (caught) {
      setSellError(caught instanceof Error ? caught.message : "Could not record this sale. Please try again.");
    } finally {
      setSellPending(false);
    }
  }

  async function removeProduct(product: ProductRecord) {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    await deleteProduct(product.id);
    setProducts((items) => items.filter((item) => item.id !== product.id));
    setMenuId(null);
  }

  function exportProducts() {
    const rows = [["Name", "SKU", "Category", "Type", "Unit", "Selling price", "Cost price", "Stock", "Status"], ...filtered.map((product) => [product.name, product.sku, product.category, product.type, product.unit, product.sellingPrice, product.costPrice, product.stock, product.status])];
    const url = URL.createObjectURL(new Blob([rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "akcounting-products.csv"; anchor.click(); URL.revokeObjectURL(url);
  }

  return <div className="mx-auto max-w-[1500px] space-y-5">
    <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]"><div className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full bg-violet-100/70 blur-3xl" /><div className="relative flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-4"><span className="grid size-12 place-items-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-200"><Package size={21} /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-600">Catalogue & inventory</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Products & services</h1><p className="mt-1 text-xs text-slate-500">Manage everything you sell, pricing, stock levels, and service items.</p></div></div><div className="flex flex-wrap gap-2"><button onClick={exportProducts} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[11px] font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700"><Download size={14} />Export</button><button onClick={() => { setSellError(""); setSellOpen(true); }} className="flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-[11px] font-semibold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-700"><ShoppingCart size={15} />Sell</button><button onClick={() => openModal("create")} className="flex h-10 items-center gap-2 rounded-lg bg-violet-600 px-4 text-[11px] font-semibold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700"><Plus size={15} />Add product</button></div></div></header>

    {sellNotice && <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[11px] font-medium text-emerald-700"><CheckCircle2 size={14} className="shrink-0" />{sellNotice}</div>}

    <section className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">{[
      { label: "Total items", value: products.length.toString(), note: `${activeProducts} currently active`, icon: Boxes, tone: "bg-violet-50 text-violet-600" },
      { label: "Inventory value", value: money(inventoryValue), note: "Based on cost price", icon: TrendingUp, tone: "bg-emerald-50 text-emerald-600" },
      { label: "Low stock", value: lowStock.toString(), note: lowStock ? "Needs your attention" : "Stock levels look good", icon: AlertTriangle, tone: lowStock ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600" },
      { label: "Categories", value: categories.length.toString(), note: `${products.filter((item) => item.type === "Service").length} service items`, icon: Layers3, tone: "bg-blue-50 text-blue-600" },
    ].map((card) => { const Icon = card.icon; return <article key={card.label} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-violet-200 hover:shadow-sm sm:p-4"><div className="flex items-center gap-2"><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${card.tone}`}><Icon size={15} /></span><p className="truncate text-[9px] font-medium text-slate-400 sm:text-[10px]">{card.label}</p></div><p className="mt-3 truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{card.value}</p><p className="mt-1 truncate text-[8px] text-slate-400 sm:text-[9px]">{card.note}</p></article>; })}</section>

    {lowStock > 0 && <button onClick={() => setStatus("Low stock")} className="flex w-full items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/80 p-4 text-left"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-amber-600 shadow-sm"><AlertTriangle size={16} /></span><div className="min-w-0 flex-1"><p className="text-[11px] font-semibold text-amber-900">{lowStock} item{lowStock === 1 ? " is" : "s are"} running low</p><p className="mt-0.5 text-[9px] text-amber-700">Review inventory and restock before you run out.</p></div><span className="text-[10px] font-semibold text-amber-800">View items</span></button>}

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.035)]"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between"><div><h2 className="text-base font-semibold text-slate-900">Product catalogue</h2><p className="mt-0.5 text-[10px] text-slate-400">{filtered.length} of {products.length} items</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="flex h-10 min-w-64 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-400 focus-within:border-violet-300 focus-within:bg-white"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, SKU or category..." className="w-full bg-transparent text-[11px] text-slate-700 outline-none" /></label><FilterSelect className="w-40" value={category} onChange={setCategory} options={[{ value: "All categories", label: "All categories", count: products.length }, ...categories.map((item) => ({ value: item, label: item, count: products.filter((product) => product.category === item).length }))]} /><FilterSelect className="w-36" value={status} onChange={setStatus} options={[{ value: "All status", label: "All status", count: products.length, dot: "bg-violet-600" }, { value: "Active", label: "Active", count: products.filter((product) => product.status === "Active").length, dot: "bg-emerald-500" }, { value: "Inactive", label: "Inactive", count: products.filter((product) => product.status === "Inactive").length, dot: "bg-slate-400" }, { value: "Low stock", label: "Low stock", count: products.filter((product) => product.type === "Product" && product.stock <= product.reorderLevel).length, dot: "bg-amber-500" }]} /><button className="grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-500"><Filter size={14} /></button></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left"><thead><tr className="border-b border-slate-100 bg-slate-50/70 text-[9px] font-semibold uppercase tracking-wider text-slate-400"><th className="px-5 py-3">Item</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Selling price</th><th className="px-4 py-3">Cost</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Status</th><th className="w-16 px-4 py-3" /></tr></thead><tbody>{filtered.map((product) => { const isLow = product.type === "Product" && product.stock <= product.reorderLevel; return <tr key={product.id} className="border-b border-slate-50 last:border-0 hover:bg-violet-50/25"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${product.type === "Service" ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600"}`}>{product.type === "Service" ? <Archive size={17} /> : <Package size={17} />}</span><div><button onClick={() => openModal("view", product)} className="text-[12px] font-semibold text-slate-800 hover:text-violet-700">{product.name}</button><p className="mt-0.5 text-[9px] text-slate-400">{product.sku} · {product.type}</p></div></div></td><td className="px-4 py-3.5"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-medium text-slate-600">{product.category}</span></td><td className="px-4 py-3.5 text-[11px] font-semibold text-slate-800">{money(product.sellingPrice)}<p className="mt-0.5 text-[8px] font-normal text-slate-400">per {product.unit.toLowerCase()}</p></td><td className="px-4 py-3.5 text-[10px] text-slate-500">{money(product.costPrice)}</td><td className="px-4 py-3.5">{product.type === "Service" ? <span className="text-[10px] text-slate-400">Not tracked</span> : <div><p className={`text-[11px] font-semibold ${isLow ? "text-amber-600" : "text-slate-700"}`}>{product.stock} {product.unit}</p><p className="mt-0.5 text-[8px] text-slate-400">Reorder at {product.reorderLevel}</p></div>}</td><td className="px-4 py-3.5"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-semibold ${product.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}><i className={`size-1.5 rounded-full ${product.status === "Active" ? "bg-emerald-500" : "bg-slate-400"}`} />{product.status}</span></td><td className="relative px-4 py-3.5"><button onClick={() => setMenuId(menuId === product.id ? null : product.id)} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><MoreHorizontal size={16} /></button>{menuId === product.id && <div className="absolute right-10 top-10 z-20 w-36 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"><button onClick={() => openModal("view", product)} className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[9px] font-medium text-slate-600 hover:bg-slate-50"><Eye size={13} />View details</button><button onClick={() => openModal("edit", product)} className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[9px] font-medium text-slate-600 hover:bg-slate-50"><Pencil size={13} />Edit item</button><button onClick={() => removeProduct(product)} className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[9px] font-medium text-rose-600 hover:bg-rose-50"><Trash2 size={13} />Delete</button></div>}</td></tr>; })}</tbody></table>{filtered.length === 0 && <div className="grid min-h-72 place-items-center text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-full bg-slate-100 text-slate-400"><Package size={22} /></span><h3 className="mt-4 text-sm font-semibold text-slate-800">No products found</h3><p className="mt-1 text-[10px] text-slate-400">Add your first product or change the current filters.</p><button onClick={() => openModal("create")} className="mt-4 h-9 rounded-lg bg-violet-600 px-4 text-[10px] font-semibold text-white">Add product</button></div></div>}</div>
    </section>

    {(modal === "create" || modal === "edit") && <ProductForm product={selected} categories={categories} pending={pending} error={error} onClose={() => setModal(null)} onSubmit={submitProduct} />}
    {modal === "view" && selected && <ProductView product={selected} onClose={() => setModal(null)} onEdit={() => setModal("edit")} />}
    {sellOpen && <SellModal products={products} customerNames={customerNames} pending={sellPending} error={sellError} onClose={() => setSellOpen(false)} onSubmit={submitSell} />}
  </div>;
}

const UNIT_OPTIONS = ["Piece", "Box", "Kg", "Liter", "Hour", "Day", "Project", "Month"];

function ProductForm({ product, categories, pending, error, onClose, onSubmit }: { product: ProductRecord | null; categories: string[]; pending: boolean; error: string; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const [type, setType] = useState<ProductRecord["type"]>(product?.type ?? "Product");
  const [sellingPrice, setSellingPrice] = useState(product?.sellingPrice ?? 0);
  const [costPrice, setCostPrice] = useState(product?.costPrice ?? 0);
  const [generatedSku] = useState(() => `SVC-${Date.now()}`);
  const margin = sellingPrice > 0 ? ((sellingPrice - costPrice) / sellingPrice) * 100 : 0;
  const profit = sellingPrice - costPrice;

  return <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form onSubmit={onSubmit} className="my-6 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header className="flex items-start justify-between px-6 pb-1 pt-6">
        <div><h2 className="text-lg font-semibold text-slate-900">{product ? "Edit product" : "Add new product"}</h2><p className="mt-1 text-[11px] text-slate-400">{product ? "Update the details for this item." : "It'll show up in your catalogue instantly."}</p></div>
        <button type="button" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100"><X size={16} /></button>
      </header>

      <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
        <div className="flex rounded-lg bg-slate-100 p-1">{(["Product", "Service"] as const).map((item) => { const Icon = item === "Product" ? Package : Archive; return <label key={item} className={`flex h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md text-[11px] font-semibold transition ${type === item ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}><input className="sr-only" type="radio" name="type" value={item} checked={type === item} onChange={() => setType(item)} /><Icon size={14} />{item}</label>; })}</div>

        <div className="mt-5 space-y-4">
          {type === "Service" ? <div className="flex gap-3">
            <div className="flex-[1.6]"><Field label="Service name" name="name" defaultValue={product?.name} placeholder="Monthly bookkeeping" /></div>
            <div className="flex-1"><ComboField label="Category" name="category" defaultValue={product?.category} options={categories} placeholder="Bookkeeping" /></div>
            <input type="hidden" name="sku" value={product?.sku ?? generatedSku} />
          </div> : <>
            <Field label="Product name" name="name" defaultValue={product?.name} placeholder="Wireless keyboard" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="SKU / Item code" name="sku" defaultValue={product?.sku} placeholder="PRD-001" />
              <ComboField label="Category" name="category" defaultValue={product?.category} options={categories} placeholder="Accessories" />
            </div>
          </>}

          <div className={`grid gap-3 ${type === "Product" ? "grid-cols-2" : ""}`}>
            {type === "Product" && <DropdownField label="Unit" name="unit" defaultValue={product?.unit ?? "Piece"} options={UNIT_OPTIONS.map((item) => ({ value: item }))} />}
            <DropdownField label="Status" name="status" defaultValue={product?.status ?? "Active"} options={[{ value: "Active", tone: "bg-emerald-500" }, { value: "Inactive", tone: "bg-slate-400" }]} />
          </div>
          {type === "Service" && <input type="hidden" name="unit" value="Service" />}

          <div className="border-t border-slate-100 pt-4">
            {type === "Product" ? <div className="grid grid-cols-2 gap-3">
              <Field label="Selling price (Rs)" name="sellingPrice" type="number" value={sellingPrice} onChange={(value) => setSellingPrice(Number(value) || 0)} />
              <Field label="Cost price (Rs)" name="costPrice" type="number" value={costPrice} onChange={(value) => setCostPrice(Number(value) || 0)} />
            </div> : <Field label="Selling price (Rs)" name="sellingPrice" type="number" value={sellingPrice} onChange={(value) => setSellingPrice(Number(value) || 0)} />}
            {type === "Product" && <div className="mt-3 grid grid-cols-2 gap-3"><Field label="Opening stock" name="stock" type="number" defaultValue={product?.stock ?? 0} /><Field label="Low-stock alert" name="reorderLevel" type="number" defaultValue={product?.reorderLevel ?? 5} /></div>}
            {type === "Service" && <><input type="hidden" name="costPrice" value="0" /><input type="hidden" name="stock" value="0" /><input type="hidden" name="reorderLevel" value="0" /></>}
            {type === "Product" && sellingPrice > 0 && <div className="mt-3 flex items-center gap-4 rounded-lg bg-slate-50 px-4 py-2.5"><div className="flex-1"><p className="text-[9px] font-medium text-slate-500">Profit per unit</p><p className={`text-[13px] font-semibold ${profit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>Rs {profit.toLocaleString("en-NP")}</p></div><div className="h-7 w-px bg-slate-200" /><div className="flex-1"><p className="text-[9px] font-medium text-slate-500">Margin</p><p className={`text-[13px] font-semibold ${margin >= 0 ? "text-violet-700" : "text-rose-600"}`}>{margin.toFixed(1)}%</p></div></div>}
          </div>

          <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-slate-600">Description <span className="font-normal text-slate-400">(optional)</span></span><textarea name="description" defaultValue={product?.description} rows={2} placeholder="Short item description..." className="w-full resize-none rounded-lg border border-slate-200 p-3 text-[11px] leading-5 text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100" /></label>
          {error && <p className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[10px] font-medium text-rose-600"><AlertTriangle size={13} className="shrink-0" />{error}</p>}
        </div>
      </div>

      <footer className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4"><button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-200 bg-white px-5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">Cancel</button><button disabled={pending} className="flex h-10 items-center gap-2 rounded-lg bg-violet-600 px-5 text-[10px] font-semibold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700 disabled:opacity-60">{pending ? "Saving..." : <><CheckCircle2 size={14} />{product ? "Save changes" : "Add product"}</>}</button></footer>
    </form>
  </div>;
}

function useOutsideClick(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handle(event: MouseEvent) { if (ref.current && !ref.current.contains(event.target as Node)) onOutside(); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onOutside]);
  return ref;
}

function DropdownField({ label, name, defaultValue, options }: { label: string; name: string; defaultValue: string; options: { value: string; tone?: string }[] }) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const ref = useOutsideClick(() => setOpen(false));
  const current = options.find((option) => option.value === value);

  return <div ref={ref} className="relative">
    <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">{label}</span>
    <input type="hidden" name={name} value={value} />
    <button type="button" onClick={() => setOpen((v) => !v)} className="flex h-11 w-full items-center justify-between rounded-lg border border-slate-200 px-3 text-left text-[11px] text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100">
      <span className="flex items-center gap-2">{current?.tone && <i className={`size-1.5 rounded-full ${current.tone}`} />}{value}</span>
      <ChevronDown size={12} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
      {options.map((option) => <button type="button" key={option.value} onClick={() => { setValue(option.value); setOpen(false); }} className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[11px] font-medium transition ${value === option.value ? "bg-violet-50 text-violet-700" : "text-slate-700 hover:bg-slate-50"}`}>
        <span className="flex items-center gap-2">{option.tone && <i className={`size-1.5 rounded-full ${option.tone}`} />}{option.value}</span>
        {value === option.value && <Check size={12} className="text-violet-600" />}
      </button>)}
    </div>}
  </div>;
}

function ComboField({ label, name, defaultValue, options, placeholder }: { label: string; name: string; defaultValue?: string; options: string[]; placeholder?: string }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [items, setItems] = useState(() => Array.from(new Set(options.filter(Boolean))).sort());
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useOutsideClick(() => { setOpen(false); setQuery(""); });

  const filtered = items.filter((item) => item.toLowerCase().includes(query.toLowerCase()));
  const trimmedQuery = query.trim();
  const canCreate = trimmedQuery.length > 0 && !items.some((item) => item.toLowerCase() === trimmedQuery.toLowerCase());

  function select(item: string) { setValue(item); setQuery(""); setOpen(false); }
  function create(item: string) { setItems((current) => Array.from(new Set([...current, item])).sort()); select(item); }
  function remove(item: string, event: React.MouseEvent) { event.stopPropagation(); setItems((current) => current.filter((entry) => entry !== item)); if (value === item) setValue(""); }

  return <div ref={ref} className="relative">
    <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">{label}</span>
    <input required type="hidden" name={name} value={value} />
    <button type="button" onClick={() => setOpen((v) => !v)} className="flex h-11 w-full items-center justify-between rounded-lg border border-slate-200 px-3 text-left text-[11px] text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100">
      <span className={`truncate ${value ? "" : "text-slate-400"}`}>{value || placeholder}</span>
      <ChevronDown size={12} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-100 p-2"><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && canCreate) { event.preventDefault(); create(trimmedQuery); } }} placeholder="Search or create..." className="h-9 w-full rounded-lg bg-slate-50 px-2.5 text-[11px] text-slate-700 outline-none" /></div>
      <div className="max-h-40 overflow-y-auto p-1.5">
        {filtered.map((item) => <div key={item} onClick={() => select(item)} className={`group flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-[11px] transition ${value === item ? "bg-violet-50 font-semibold text-violet-700" : "text-slate-700 hover:bg-slate-50"}`}>
          <span className="truncate">{item}</span>
          <button type="button" onClick={(event) => remove(item, event)} className="grid size-5 shrink-0 place-items-center rounded text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"><X size={11} /></button>
        </div>)}
        {canCreate && <button type="button" onClick={() => create(trimmedQuery)} className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-medium text-violet-700 hover:bg-violet-50"><Plus size={12} />Create &quot;{trimmedQuery}&quot;</button>}
        {filtered.length === 0 && !canCreate && <p className="px-2.5 py-4 text-center text-[10px] text-slate-400">No categories yet — type to create one.</p>}
      </div>
    </div>}
  </div>;
}

function Field({ label, name, type = "text", defaultValue, value, onChange, placeholder }: { label: string; name: string; type?: string; defaultValue?: string | number; value?: number; onChange?: (value: string) => void; placeholder?: string }) {
  const controlledProps = onChange ? { value, onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value) } : { defaultValue };
  return <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-slate-600">{label}</span><input required name={name} type={type} min={type === "number" ? 0 : undefined} step={type === "number" ? "0.01" : undefined} {...controlledProps} placeholder={placeholder} className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 text-[11px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100" /></label>;
}

function SellModal({ products, customerNames, pending, error, onClose, onSubmit }: { products: ProductRecord[]; customerNames: string[]; pending: boolean; error: string; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const sellable = useMemo(() => products.filter((product) => product.status === "Active"), [products]);
  const [productId, setProductId] = useState(sellable[0]?.id ?? "");
  const [productOpen, setProductOpen] = useState(false);
  const productRef = useOutsideClick(() => setProductOpen(false));
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const product = sellable.find((item) => item.id === productId);
  const subtotal = (product?.sellingPrice ?? 0) * quantity;
  const total = Math.max(0, subtotal - discount);
  const outOfStock = Boolean(product && product.type === "Product" && product.stock <= 0);

  return <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form onSubmit={onSubmit} className="my-6 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header className="flex items-start justify-between px-6 pb-1 pt-6">
        <div><h2 className="text-lg font-semibold text-slate-900">Sell an item</h2><p className="mt-1 text-[11px] text-slate-400">Records a sale and adds it to your income.</p></div>
        <button type="button" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100"><X size={16} /></button>
      </header>

      <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
        {sellable.length === 0 ? <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-[11px] text-slate-400">No active products or services to sell yet.</p> : <div className="space-y-4">
          <div ref={productRef} className="relative">
            <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">Product / service</span>
            <input type="hidden" name="productId" value={productId} />
            <button type="button" onClick={() => setProductOpen((v) => !v)} className="flex h-11 w-full items-center justify-between rounded-lg border border-slate-200 px-3 text-left text-[11px] text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100">
              <span className="flex min-w-0 items-center gap-2"><span className={`grid size-6 shrink-0 place-items-center rounded-lg ${product?.type === "Service" ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600"}`}>{product?.type === "Service" ? <Archive size={12} /> : <Package size={12} />}</span><span className="truncate">{product?.name ?? "Select an item"}</span></span>
              <ChevronDown size={12} className={`shrink-0 text-slate-400 transition-transform ${productOpen ? "rotate-180" : ""}`} />
            </button>
            {productOpen && <div className="absolute z-30 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
              {sellable.map((item) => <button type="button" key={item.id} onClick={() => { setProductId(item.id); setProductOpen(false); }} className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[11px] transition ${productId === item.id ? "bg-violet-50 font-semibold text-violet-700" : "text-slate-700 hover:bg-slate-50"}`}>
                <span className="flex min-w-0 items-center gap-2"><span className={`grid size-6 shrink-0 place-items-center rounded-lg ${item.type === "Service" ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600"}`}>{item.type === "Service" ? <Archive size={12} /> : <Package size={12} />}</span><span className="truncate">{item.name}</span></span>
                <span className="shrink-0 text-[10px] text-slate-400">{money(item.sellingPrice)}{item.type === "Product" && ` · ${item.stock} in stock`}</span>
              </button>)}
            </div>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-slate-600">Quantity</span><input required name="quantity" type="number" min={1} step={1} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-[11px] text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100" /></label>
            <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-slate-600">Discount (Rs)</span><input name="discount" type="number" min={0} step="0.01" value={discount || ""} onChange={(event) => setDiscount(Math.max(0, Number(event.target.value) || 0))} placeholder="0" className="h-11 w-full rounded-lg border border-slate-200 px-3 text-[11px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-100" /></label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><span className="mb-1.5 block text-[11px] font-semibold text-slate-600">Payment method</span><PaymentMethodSelect name="paymentMethod" /></div>
            <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-slate-600">Status</span><StatusSelect name="status" options={["Received", "Pending"] as const} defaultValue="Received" /></label>
          </div>

          <ComboField label="Customer" name="customerName" options={customerNames} placeholder="Search or add a customer..." />

          {outOfStock && <p className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[10px] font-medium text-amber-700"><AlertTriangle size={13} className="shrink-0" />This product shows 0 in stock — selling will keep stock at 0.</p>}

          <div className="rounded-lg bg-emerald-50 px-4 py-3">
            <div className="flex items-center justify-between text-[9px] text-emerald-600"><span>Subtotal</span><span>{money(subtotal)}</span></div>
            {discount > 0 && <div className="mt-1 flex items-center justify-between text-[9px] text-emerald-600"><span>Discount</span><span>-{money(discount)}</span></div>}
            <div className="mt-1.5 flex items-center justify-between border-t border-emerald-100 pt-1.5"><div className="flex items-center gap-2 text-[10px] font-semibold text-emerald-700"><ReceiptText size={14} />Total to record as income</div><p className="text-[15px] font-bold text-emerald-700">{money(total)}</p></div>
          </div>

          {error && <p className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[10px] font-medium text-rose-600"><AlertTriangle size={13} className="shrink-0" />{error}</p>}
        </div>}
      </div>

      <footer className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4"><button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-200 bg-white px-5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">Cancel</button><button disabled={pending || sellable.length === 0} className="flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-[10px] font-semibold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-700 disabled:opacity-60">{pending ? "Recording..." : <><CheckCircle2 size={14} />Record sale</>}</button></footer>
    </form>
  </div>;
}

function ProductView({ product, onClose, onEdit }: { product: ProductRecord; onClose: () => void; onEdit: () => void }) {
  const margin = product.sellingPrice ? (product.sellingPrice - product.costPrice) / product.sellingPrice * 100 : 0;
  return <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="relative bg-gradient-to-br from-slate-900 to-violet-950 p-6 text-white"><button onClick={onClose} className="absolute right-4 top-4 grid size-8 place-items-center rounded-lg bg-white/10"><X size={14} /></button><span className="grid size-11 place-items-center rounded-xl bg-white/10"><Package size={19} /></span><p className="mt-4 text-[9px] uppercase tracking-[0.14em] text-violet-300">{product.sku}</p><h2 className="mt-1 text-xl font-semibold">{product.name}</h2><p className="mt-1 text-[10px] text-slate-300">{product.category} · {product.type}</p></div><div className="p-6"><div className="grid grid-cols-2 gap-3"><Info label="Selling price" value={money(product.sellingPrice)} /><Info label="Cost price" value={money(product.costPrice)} /><Info label="Gross margin" value={`${margin.toFixed(1)}%`} /><Info label="Stock available" value={product.type === "Service" ? "Not tracked" : `${product.stock} ${product.unit}`} /></div>{product.description && <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Description</p><p className="mt-2 text-[10px] leading-5 text-slate-600">{product.description}</p></div>}<div className="mt-5 flex gap-2"><button onClick={onClose} className="h-10 flex-1 rounded-lg border border-slate-200 text-[10px] font-semibold text-slate-600">Close</button><button onClick={onEdit} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 text-[10px] font-semibold text-white"><Pencil size={13} />Edit product</button></div></div></div></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-100 p-3"><p className="text-[9px] text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value}</p></div>;
}
