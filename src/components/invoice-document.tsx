import { Globe, Mail, MapPin, Phone } from "lucide-react";
import type { CSSProperties } from "react";

export type DocumentItem = { description: string; quantity: number; rate: number; amount: number };
export type DocumentInvoice = {
  number: string;
  status: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  items: DocumentItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  amount: number;
  showPaymentInfo?: boolean;
  secondaryColor?: string;
  footerMessage?: string;
  iconColor?: string;
  descriptionFontSize?: number;
  docType?: "Invoice" | "Quotation";
};
export type DocumentBusiness = {
  legalName: string;
  tradingName: string;
  panVat: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
  swift: string;
  paymentNote: string;
  paymentMethod: string;
  logoUrl: string | null;
  qrUrl: string | null;
  signatureUrl: string | null;
};

export const INVOICE_TEMPLATES = [
  { id: "bold", name: "Bold Header" },
  { id: "diagonal", name: "Modern Ledger" },
  { id: "clean", name: "Teal Precision" },
  { id: "corporate", name: "Midnight Executive" },
  { id: "professional", name: "Orbit Commerce" },
  { id: "creative", name: "Split Monogram" },
] as const;
export type InvoiceTemplateId = (typeof INVOICE_TEMPLATES)[number]["id"];

export const ACCENT_COLORS = [
  "#dc2626", "#ea580c", "#d97706", "#65a30d", "#16a34a", "#059669",
  "#0891b2", "#2563eb", "#4f46e5", "#7c3aed", "#c026d3", "#db2777",
  "#e11d48", "#475569", "#1e293b", "#0f172a",
];

export const COLOR_COMBOS = [
  { name: "Crimson Navy", accent: "#dc2626", secondary: "#172554" },
  { name: "Ocean Slate", accent: "#2563eb", secondary: "#1f2937" },
  { name: "Emerald Ink", accent: "#16a34a", secondary: "#111827" },
  { name: "Amber Charcoal", accent: "#d97706", secondary: "#1e293b" },
  { name: "Violet Midnight", accent: "#7c3aed", secondary: "#312e81" },
  { name: "Teal Graphite", accent: "#0891b2", secondary: "#263247" },
  { name: "Rose Plum", accent: "#db2777", secondary: "#3f1d2e" },
  { name: "Indigo Steel", accent: "#4f46e5", secondary: "#202733" },
] as const;

/** A4 at 96dpi: 210mm x 297mm ≈ 794px x 1123px. Every template renders at this fixed portrait size. */
export const A4_WIDTH = 794;
export const A4_HEIGHT = 1123;
const A4_STYLE: CSSProperties = { width: A4_WIDTH, minHeight: A4_HEIGHT };
const invoiceStyle = (invoice: DocumentInvoice, accent: string): CSSProperties => ({ ...A4_STYLE, "--invoice-icon-color": invoice.iconColor || accent, "--invoice-description-size": `${invoice.descriptionFontSize || 11}px` } as CSSProperties);

const currency = (amount: number) => `Rs ${new Intl.NumberFormat("en-NP", { maximumFractionDigits: 2 }).format(amount)}`;

export function InvoiceDocument({ invoice, business, template, accent }: { invoice: DocumentInvoice; business: DocumentBusiness; template: string; accent: string }) {
  const visibleBusiness = invoice.showPaymentInfo === false ? { ...business, bankName: "", accountName: "", accountNumber: "", branch: "", swift: "", paymentNote: "", paymentMethod: "", qrUrl: null } : business;
  if (template === "diagonal") return <DiagonalTemplate invoice={invoice} business={visibleBusiness} accent={accent} />;
  if (template === "clean") return <CleanTemplate invoice={invoice} business={visibleBusiness} accent={accent} />;
  if (template === "corporate") return <CorporateTemplate invoice={invoice} business={visibleBusiness} accent={accent} />;
  if (template === "professional") return <ProfessionalTemplate invoice={invoice} business={visibleBusiness} accent={accent} />;
  if (template === "creative") return <CreativeTemplate invoice={invoice} business={visibleBusiness} accent={accent} />;
  return <BoldTemplate invoice={invoice} business={visibleBusiness} accent={accent} />;
}

function ItemsTable({ items, accent, headerFill }: { items: DocumentItem[]; accent: string; headerFill?: boolean }) {
  return (
    <table className="w-full text-left text-[11px]">
      <thead>
        <tr className={headerFill ? "text-white" : "border-b-2 text-slate-500"} style={headerFill ? { backgroundColor: accent } : { borderColor: accent }}>
          <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wider">No</th>
          <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wider">Description</th>
          <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wider">Qty</th>
          <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wider">Rate</th>
          <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wider">Amount</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <tr key={index} className="border-b border-slate-100">
            <td className="px-2 py-2.5 text-slate-400">{String(index + 1).padStart(2, "0")}</td>
            <td className="px-2 py-2.5 font-medium text-slate-700">{item.description}</td>
            <td className="px-2 py-2.5 text-right text-slate-500">{item.quantity}</td>
            <td className="px-2 py-2.5 text-right text-slate-500">{currency(item.rate)}</td>
            <td className="px-2 py-2.5 text-right font-semibold text-slate-800">{currency(item.amount)}</td>
          </tr>
        ))}
        {items.length === 0 && <tr><td colSpan={5} className="px-2 py-6 text-center text-slate-300">No line items yet</td></tr>}
      </tbody>
    </table>
  );
}

function Totals({ invoice, accent, filled }: { invoice: DocumentInvoice; accent: string; filled?: boolean }) {
  return (
    <div className="w-56 space-y-1.5 text-[10px]">
      <div className="flex justify-between px-1"><span className="text-slate-400">Sub Total</span><span className="font-semibold text-slate-700">{currency(invoice.subtotal)}</span></div>
      {invoice.discount > 0 && <div className="flex justify-between px-1"><span className="text-slate-400">Discount</span><span className="font-semibold text-rose-500">−{currency(invoice.discount)}</span></div>}
      {invoice.taxRate > 0 && <div className="flex justify-between px-1"><span className="text-slate-400">Tax ({invoice.taxRate}%)</span><span className="font-semibold text-slate-700">{currency(invoice.taxAmount)}</span></div>}
      <div className={`mt-1 flex items-center justify-between rounded-lg px-3 py-2.5 ${filled ? "text-white" : ""}`} style={filled ? { backgroundColor: accent } : { border: `1.5px solid ${accent}`, color: accent }}>
        <span className="text-[9px] font-bold uppercase tracking-wide">Total</span>
        <span className="text-[13px] font-bold">{currency(invoice.amount)}</span>
      </div>
    </div>
  );
}

function ContactLine({ business }: { business: DocumentBusiness }) {
  return <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[8px] text-slate-400">
    {business.phone && <span className="flex items-center gap-1"><Phone size={9} />{business.phone}</span>}
    {business.email && <span className="flex items-center gap-1"><Mail size={9} />{business.email}</span>}
    {business.address && <span className="flex items-center gap-1"><MapPin size={9} />{business.address}</span>}
    {business.website && <span className="flex items-center gap-1"><Globe size={9} />{business.website}</span>}
  </div>;
}

function PaymentDetails({ business, accent, title = "Payment Details" }: { business: DocumentBusiness; accent: string; title?: string }) {
  return <div><p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: accent }}>{title}</p><div className="mt-2 flex items-start gap-3">{business.qrUrl && <div className="shrink-0 border border-slate-200 bg-white p-1"><img src={business.qrUrl} alt="Payment QR code" className="size-16 object-contain" /><p className="mt-0.5 text-center text-[6px] font-semibold uppercase text-slate-400">Scan to pay</p></div>}<div className="grid min-w-0 grid-cols-[72px_1fr] gap-x-2 gap-y-1 text-[8px] text-slate-500"><span>Method</span><b className="truncate text-slate-700">{business.paymentMethod || "Bank transfer"}</b><span>Bank</span><b className="truncate text-slate-700">{business.bankName || "—"}</b><span>Account</span><b className="truncate text-slate-700">{business.accountNumber || "—"}</b><span>A/C Name</span><b className="truncate text-slate-700">{business.accountName || business.legalName || "—"}</b><span>Branch</span><b className="truncate text-slate-700">{business.branch || "—"}</b></div></div></div>;
}

/** Bold angular business invoice with live company, client, line-item, bank, and total data. */
function BoldTemplate({ invoice, business, accent }: { invoice: DocumentInvoice; business: DocumentBusiness; accent: string }) {
  const darkColor = invoice.secondaryColor || "#202733";
  const docLabel = invoice.docType === "Quotation" ? "Quotation" : "Invoice";
  return (
    <div className="invoice-document mx-auto flex flex-col overflow-hidden bg-white shadow-xl print:shadow-none" style={invoiceStyle(invoice, accent)}>
      <header className="relative h-[190px] shrink-0 overflow-hidden text-white" style={{ backgroundColor: darkColor }}>
        <div className="absolute right-0 top-0 h-10 w-[57%]" style={{ backgroundColor: accent, clipPath: "polygon(8% 0, 100% 0, 100% 100%, 0 100%)" }} />
        <div className="absolute bottom-0 left-0 h-10 w-[55%]" style={{ backgroundColor: accent, clipPath: "polygon(0 0, 92% 0, 100% 100%, 0 100%)" }} />
        <div className="relative flex h-full items-center justify-between px-11 pb-4 pt-8">
          <div className="flex items-center gap-3">
            {business.logoUrl ? <img src={business.logoUrl} alt="Logo" className="h-12 w-12 object-contain" /> : <span className="grid size-11 place-items-center text-xl font-black text-white" style={{ color: accent }}>{(business.legalName || "C")[0]}</span>}
            <div><p className="text-[18px] font-black uppercase tracking-tight">{business.legalName || "Company"}</p><p className="text-[8px] font-medium uppercase tracking-[0.2em] text-slate-300">{business.tradingName || "Company tagline here"}</p></div>
          </div>
          <div className="pt-6"><p className="text-[31px] font-black uppercase leading-none text-white">{docLabel}</p><div className="mt-3 grid grid-cols-[90px_1fr] gap-y-1 text-[8px]"><span className="text-slate-300">{docLabel} Number:</span><b>#{invoice.number}</b><span className="text-slate-300">PAN / VAT:</span><b>{business.panVat || "—"}</b><span className="text-slate-300">{docLabel} Date:</span><b>{invoice.issueDate}</b>{invoice.docType !== "Quotation" && <><span className="text-slate-300">Due Date:</span><b>{invoice.dueDate}</b></>}</div></div>
        </div>
      </header>

      <main className="flex-1 px-11 py-8">
        <section>
          <div><p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: accent }}>{docLabel} To:</p><p className="mt-2 text-[17px] font-bold text-slate-900">{invoice.clientName || "Client name"}</p>{invoice.clientAddress && <p className="mt-2 text-[9px] leading-4 text-slate-600">{invoice.clientAddress}</p>}{invoice.clientEmail && <p className="text-[9px] leading-4 text-slate-600">Email: {invoice.clientEmail}</p>}</div>
        </section>

        <section className="mt-8 overflow-hidden">
          <table className="w-full border-separate border-spacing-y-1 text-left text-[11px]">
            <thead><tr className="text-white" style={{ backgroundColor: accent }}><th className="px-3 py-3 text-[10px] font-bold uppercase">Date</th><th className="px-3 py-3 text-[10px] font-bold uppercase">Item description</th><th className="px-3 py-3 text-right text-[10px] font-bold uppercase">Price</th><th className="px-3 py-3 text-right text-[10px] font-bold uppercase">Qty.</th><th className="px-3 py-3 text-right text-[10px] font-bold uppercase">Total</th></tr></thead>
            <tbody>{invoice.items.map((item, index) => <tr key={index} className={index % 2 ? "bg-slate-50" : "bg-white"}><td className="px-3 py-3 text-slate-500">{invoice.issueDate}</td><td className="px-3 py-3 font-medium text-slate-700">{item.description}</td><td className="px-3 py-3 text-right text-slate-500">{currency(item.rate)}</td><td className="px-3 py-3 text-right text-slate-500">{item.quantity}</td><td className="px-3 py-3 text-right font-semibold text-slate-800">{currency(item.amount)}</td></tr>)}{invoice.items.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-300">Add line items to preview the {docLabel.toLowerCase()}</td></tr>}</tbody>
          </table>
        </section>

        <section className="mt-7 grid grid-cols-[1fr_250px] items-start gap-12">
          <div>{invoice.showPaymentInfo !== false && <div><p className="text-[11px] font-bold" style={{ color: accent }}>Payment Information</p><div className="mt-3 flex items-start gap-4">{business.qrUrl && <div className="shrink-0 border border-slate-200 bg-white p-1.5"><img src={business.qrUrl} alt="Payment QR" className="size-24 object-contain" /><p className="mt-1 text-center text-[6px] font-semibold uppercase tracking-wide text-slate-400">Scan to pay</p></div>}<div className="grid grid-cols-[82px_1fr] gap-y-1.5 text-[8px] text-slate-500"><span>Method:</span><b className="text-slate-700">{business.paymentMethod || "Bank transfer"}</b><span>Bank:</span><b className="text-slate-700">{business.bankName || "—"}</b><span>Account:</span><b className="text-slate-700">{business.accountNumber || "—"}</b><span>Account Name:</span><b className="text-slate-700">{business.accountName || business.legalName || "—"}</b><span>Branch:</span><b className="text-slate-700">{business.branch || "—"}</b>{business.swift && <><span>SWIFT:</span><b className="text-slate-700">{business.swift}</b></>}</div></div>{business.paymentNote && <p className="mt-2 max-w-[420px] text-[7px] leading-3 text-slate-400">{business.paymentNote}</p>}</div>}<p className="mt-5 text-[12px] font-black text-slate-900">Thank You For Your Business</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[8px] text-slate-600">{business.phone && <p className="flex items-center gap-1.5"><Phone size={9} style={{ color: accent }} />{business.phone}</p>}{business.email && <p className="flex items-center gap-1.5"><Mail size={9} style={{ color: accent }} />{business.email}</p>}{business.address && <p className="flex items-center gap-1.5"><MapPin size={9} style={{ color: accent }} />{business.address}</p>}</div></div>
          <div className="text-[9px]"><div className="space-y-2 px-3 text-slate-600"><p className="flex justify-between"><span>Subtotal:</span><b className="text-slate-800">{currency(invoice.subtotal)}</b></p><p className="flex justify-between"><span>Discount:</span><b className="text-slate-800">{currency(invoice.discount)}</b></p><p className="flex justify-between"><span>Tax ({invoice.taxRate}%):</span><b className="text-slate-800">{currency(invoice.taxAmount)}</b></p></div><div className="mt-3 flex items-center justify-between px-4 py-3 text-white" style={{ backgroundColor: accent }}><span className="text-[11px] font-bold">Total:</span><span className="text-[14px] font-black">{currency(invoice.amount)}</span></div></div>
        </section>

        <section className="mt-8 grid grid-cols-[1fr_230px] items-end gap-12"><div><p className="text-[11px] font-bold text-slate-900">Terms & Conditions:</p><p className="mt-2 max-w-[470px] text-[8px] leading-4 text-slate-500">{invoice.notes || business.paymentNote || `Payment is due within the agreed terms. Please include the ${docLabel.toLowerCase()} number with your payment.`}</p></div><div className="text-center">{business.signatureUrl ? <img src={business.signatureUrl} alt="Signature" className="mx-auto h-14 max-w-[150px] object-contain" /> : <p className="font-serif text-xl italic text-slate-400">Signed</p>}<div className="mt-1 border-t border-slate-300 pt-2"><p className="text-[9px] font-semibold text-slate-800">{business.accountName || business.legalName || "Authorised Signatory"}</p><p className="mt-0.5 text-[7px] text-slate-400">Authorised Signature</p></div></div></section>
      </main>

      <footer className="flex h-12 shrink-0 items-center justify-center px-10 text-center text-[9px] font-semibold tracking-wide text-white" style={{ backgroundColor: accent }}>
        {invoice.footerMessage || "Thank you for your business! We truly appreciate your trust and support."}
      </footer>
    </div>
  );
}

/** Reference: diagonal dark/accent split header block, INVOICE tag top right, filled table header. */
function DiagonalTemplate({ invoice, business, accent }: { invoice: DocumentInvoice; business: DocumentBusiness; accent: string }) {
  const darkColor = invoice.secondaryColor || "#29364b";
  const docLabel = invoice.docType === "Quotation" ? "Quotation" : "Invoice";
  return (
    <div className="invoice-document mx-auto flex flex-col overflow-hidden bg-white shadow-xl print:shadow-none" style={invoiceStyle(invoice, accent)}>
      <header className="relative h-[142px] shrink-0 overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-[46%]" style={{ backgroundColor: darkColor, clipPath: "polygon(0 0, 100% 0, 94% 100%, 0 100%)" }} />
        <div className="absolute left-[43%] top-0 h-full w-[8%]" style={{ backgroundColor: accent, clipPath: "polygon(37.5% 0, 100% 0, 52% 100%, 0 100%)" }} />
        <div className="absolute left-[48.5%] top-0 h-[82%] w-[5%] opacity-75" style={{ backgroundColor: accent, clipPath: "polygon(45% 0, 100% 0, 45% 100%, 0 100%)" }} />
        <div className="relative flex h-full items-center justify-between px-11">
          <div className="flex items-center gap-3 text-white">
            {business.logoUrl ? <img src={business.logoUrl} alt="Logo" className="h-11 w-11 object-contain" /> : <span className="grid size-10 place-items-center text-xl font-black" style={{ color: accent }}>{(business.legalName || "C")[0]}</span>}
            <div><p className="text-[18px] font-black uppercase tracking-tight">{business.legalName || "Company"}</p><p className="text-[7px] uppercase tracking-[0.22em] text-white/65">{business.tradingName || "Company tagline here"}</p></div>
          </div>
          <div className="text-right"><p className="text-[31px] font-black uppercase leading-none" style={{ color: accent }}>{docLabel}</p><div className="mt-3 grid grid-cols-[82px_1fr] gap-y-1 text-[8px] text-slate-500"><span>{docLabel} Number:</span><b className="text-slate-700">#{invoice.number}</b><span>{docLabel} Date:</span><b className="text-slate-700">{invoice.issueDate}</b>{invoice.docType !== "Quotation" && <><span>Due Date:</span><b className="text-slate-700">{invoice.dueDate}</b></>}</div></div>
        </div>
      </header>

      <main className="flex-1 px-11 pb-8 pt-7">
        <section className="grid grid-cols-2 gap-20 text-[9px]">
          <div><p className="text-[10px] font-semibold" style={{ color: accent }}>{docLabel} To:</p><p className="mt-1.5 text-[18px] font-semibold text-slate-900">{invoice.clientName || "Client name"}</p>{invoice.clientAddress && <p className="mt-1 leading-4 text-slate-600">{invoice.clientAddress}</p>}{invoice.clientEmail && <p className="leading-4 text-slate-600">Email: {invoice.clientEmail}</p>}</div>
          <div><p className="text-[10px] font-semibold" style={{ color: accent }}>{docLabel} From:</p><p className="mt-1.5 text-[18px] font-semibold text-slate-900">{business.legalName || "Company name"}</p>{business.address && <p className="mt-1 leading-4 text-slate-600">{business.address}</p>}{business.phone && <p className="leading-4 text-slate-600">Phone: {business.phone}</p>}{business.email && <p className="leading-4 text-slate-600">Email: {business.email}</p>}</div>
        </section>

        <section className="mt-7">
          <table className="w-full border-separate border-spacing-y-1 text-left text-[11px]">
            <thead><tr className="text-white"><th className="w-14 px-3 py-3 text-center text-[10px] font-semibold" style={{ backgroundColor: accent }}>NO.</th><th className="px-3 py-3 text-[10px] font-semibold" style={{ backgroundColor: accent }}>PRODUCT DESCRIPTION</th><th className="w-24 px-3 py-3 text-center text-[10px] font-semibold" style={{ backgroundColor: darkColor }}>PRICE</th><th className="w-20 px-3 py-3 text-center text-[10px] font-semibold" style={{ backgroundColor: darkColor }}>QTY.</th><th className="w-24 px-3 py-3 text-center text-[10px] font-semibold" style={{ backgroundColor: darkColor }}>TOTAL</th></tr></thead>
            <tbody>{invoice.items.map((item, index) => <tr key={index} className={index % 2 ? "bg-white" : "bg-slate-50"}><td className="px-3 py-3 text-center font-semibold text-slate-600">{String(index + 1).padStart(2, "0")}</td><td className="px-3 py-3"><p className="font-semibold text-slate-800">{item.description}</p></td><td className="px-3 py-3 text-center text-slate-600">{currency(item.rate)}</td><td className="px-3 py-3 text-center text-slate-600">{item.quantity}</td><td className="px-3 py-3 text-center font-semibold text-slate-800">{currency(item.amount)}</td></tr>)}{invoice.items.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-slate-300">Add line items to preview the {docLabel.toLowerCase()}</td></tr>}</tbody>
          </table>
        </section>

        <section className="mt-7 grid grid-cols-[1fr_170px_220px] items-end gap-8">
          <div className="text-[9px]">{invoice.showPaymentInfo !== false && <PaymentDetails business={business} accent={accent} />}</div>
          <div className="text-center">{business.signatureUrl ? <img src={business.signatureUrl} alt="Signature" className="mx-auto h-12 max-w-[140px] object-contain" /> : <p className="font-serif text-xl italic text-slate-500">Signed</p>}<div className="mt-1 border-t border-slate-300 pt-2 text-[9px] font-semibold text-slate-700">Authorised sign</div></div>
          <div className="text-[9px]"><div className="space-y-1.5 px-2 text-slate-600"><p className="flex justify-between"><span>Subtotal:</span><b className="text-slate-800">{currency(invoice.subtotal)}</b></p><p className="flex justify-between"><span>Discount:</span><b className="text-slate-800">{currency(invoice.discount)}</b></p><p className="flex justify-between"><span>Tax ({invoice.taxRate}%):</span><b className="text-slate-800">{currency(invoice.taxAmount)}</b></p></div><div className="mt-3 flex items-center justify-between px-4 py-3 text-white" style={{ backgroundColor: accent }}><span className="font-semibold">Total:</span><b className="text-[13px]">{currency(invoice.amount)}</b></div></div>
        </section>

        <section className="mt-8"><p className="text-[10px] font-semibold" style={{ color: accent }}>Terms & Conditions:</p><p className="mt-2 max-w-[650px] text-[8px] leading-4 text-slate-500">{invoice.notes || business.paymentNote || `Payment is due within the agreed terms. Please include the ${docLabel.toLowerCase()} number with your payment.`}</p></section>
      </main>

      <footer className="flex h-[72px] shrink-0 items-center justify-between px-11 text-white" style={{ backgroundColor: darkColor }}>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[8px] text-white/80">{business.phone && <span className="flex items-center gap-1.5"><Phone size={10} style={{ color: accent }} />{business.phone}</span>}{business.email && <span className="flex items-center gap-1.5"><Mail size={10} style={{ color: accent }} />{business.email}</span>}{business.address && <span className="flex items-center gap-1.5"><MapPin size={10} style={{ color: accent }} />{business.address}</span>}</div>
        <p className="max-w-[270px] text-right text-[10px] font-semibold">{invoice.footerMessage || "Thank You For Your Business"}</p>
      </footer>
    </div>
  );
}

/** Reference: flat clean layout, colored underline headings, signature line, no diagonal shapes. */
function CleanTemplate({ invoice, business, accent }: { invoice: DocumentInvoice; business: DocumentBusiness; accent: string }) {
  const darkColor = invoice.secondaryColor || "#303030";
  const docLabel = invoice.docType === "Quotation" ? "Quotation" : "Invoice";
  return (
    <div className="invoice-document mx-auto bg-slate-100 p-3 shadow-xl print:p-0 print:shadow-none" style={invoiceStyle(invoice, accent)}>
      <div className="flex h-full min-h-[1099px] flex-col border border-slate-400 bg-white px-10 py-12 shadow-[inset_0_0_0_4px_#f1f5f9]">
        <header className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            {business.logoUrl ? <img src={business.logoUrl} alt="Logo" className="h-11 w-11 object-contain" /> : <span className="grid size-10 place-items-center text-[25px] font-black text-white" style={{ backgroundColor: accent }}>{(business.legalName || "C")[0]}</span>}
            <div><p className="text-[18px] font-black uppercase leading-none tracking-wide" style={{ color: accent }}>{business.legalName || "Company Name"}</p><p className="mt-1 w-fit px-2 text-[7px] uppercase tracking-[0.28em] text-white" style={{ backgroundColor: darkColor }}>{business.tradingName || "Tagline here"}</p></div>
          </div>
          <div className="w-[220px] text-[8px]"><p className="text-[11px] font-bold" style={{ color: accent }}>Contact Details:</p><div className="mt-1.5 grid grid-cols-[16px_1fr] items-center gap-x-2 gap-y-1.5 text-slate-600"><span className="grid size-4 place-items-center" style={{ backgroundColor: darkColor }}><Phone size={9} strokeWidth={2.5} /></span><span>{business.phone || "Phone number here"}</span><span className="grid size-4 place-items-center" style={{ backgroundColor: darkColor }}><Mail size={9} strokeWidth={2.5} /></span><span>{business.email || "Email address here"}</span><span className="grid size-4 place-items-center" style={{ backgroundColor: darkColor }}><MapPin size={9} strokeWidth={2.5} /></span><span>{business.address || "Your location here"}</span></div></div>
        </header>

        <section className="mt-16 grid grid-cols-[1fr_250px] items-end gap-12">
          <div><p className="text-[14px] font-semibold" style={{ color: accent }}>{docLabel} to:</p><p className="mt-1 text-[17px] font-bold text-slate-900">{invoice.clientName || "Name Here"}</p><div className="mt-1.5 grid grid-cols-[16px_1fr] items-center gap-x-2 gap-y-1.5 text-[8px] text-slate-600"><span className="grid size-4 place-items-center" style={{ backgroundColor: darkColor }}><MapPin size={9} strokeWidth={2.5} /></span><span>{invoice.clientAddress || "Client address"}</span><span className="grid size-4 place-items-center" style={{ backgroundColor: darkColor }}><Mail size={9} strokeWidth={2.5} /></span><span>{invoice.clientEmail || "Client email address"}</span></div></div>
          <div><p className="text-[30px] font-black uppercase leading-none tracking-wide" style={{ color: accent }}>{docLabel}</p><div className="mt-1 grid grid-cols-[105px_1fr] gap-y-1 px-3 py-2 text-[9px] text-white" style={{ backgroundColor: darkColor }}><span>{docLabel} No</span><b>: &nbsp; {invoice.number}</b><span>{docLabel} Date</span><b>: &nbsp; {invoice.issueDate}</b></div></div>
        </section>

        <section className="mt-4">
          <table className="w-full table-fixed border-collapse text-left text-[11px]">
            <thead><tr className="text-white"><th className="w-11 border-r-2 border-white px-2 py-2.5 text-center text-[12px]" style={{ backgroundColor: accent }}>SL</th><th className="border-r-2 border-white px-4 py-2.5 text-[12px]" style={{ backgroundColor: darkColor }}>Item Description</th><th className="w-24 border-r-2 border-white px-3 py-2.5 text-center text-[12px]" style={{ backgroundColor: accent }}>Price</th><th className="w-20 border-r-2 border-white px-3 py-2.5 text-center text-[12px]" style={{ backgroundColor: accent }}>Qty</th><th className="w-24 px-3 py-2.5 text-center text-[12px]" style={{ backgroundColor: accent }}>Total</th></tr></thead>
            <tbody>{invoice.items.map((item, index) => <tr key={index} className="border-b border-slate-300"><td className="px-2 py-4 text-center font-semibold text-slate-700">{index + 1}</td><td className="px-4 py-4 font-semibold text-slate-700">{item.description}</td><td className="px-3 py-4 text-center text-slate-600">{currency(item.rate)}</td><td className="px-3 py-4 text-center text-slate-600">{item.quantity}</td><td className="px-3 py-4 text-center text-slate-600">{currency(item.amount)}</td></tr>)}{invoice.items.length === 0 && <tr className="border-b border-slate-300"><td colSpan={5} className="py-10 text-center text-slate-300">Add line items to preview the {docLabel.toLowerCase()}</td></tr>}</tbody>
          </table>
        </section>

        <section className="mt-4 grid grid-cols-[1fr_240px] items-start gap-12">
          <div className="text-[8px]"><p className="text-[10px] font-bold" style={{ color: accent }}>Terms & Conditions :</p><p className="mt-1 max-w-[390px] leading-4 text-slate-600">{invoice.notes || business.paymentNote || `Payment is due within the agreed terms. Please include the ${docLabel.toLowerCase()} number with your payment.`}</p>{invoice.showPaymentInfo !== false && <div className="mt-3"><PaymentDetails business={business} accent={accent} /></div>}</div>
          <div className="text-[10px]"><div className="space-y-1.5 px-4 text-slate-700"><p className="flex justify-between"><span>Sub Total :</span><b>{currency(invoice.subtotal)}</b></p><p className="flex justify-between"><span>Discount :</span><b>{currency(invoice.discount)}</b></p><p className="flex justify-between"><span>Tax ({invoice.taxRate}%) :</span><b>{currency(invoice.taxAmount)}</b></p></div><div className="mt-3 flex text-[13px] font-bold text-white"><span className="flex-1 px-4 py-2 text-center" style={{ backgroundColor: accent }}>Total</span><span className="w-28 border-l-2 border-white px-3 py-2 text-center" style={{ backgroundColor: accent }}>{currency(invoice.amount)}</span></div><div className="ml-auto mt-12 w-36 text-center">{business.signatureUrl ? <img src={business.signatureUrl} alt="Signature" className="mx-auto h-11 max-w-full object-contain" /> : <p className="font-serif text-lg italic text-slate-600">Signed</p>}<div className="border-t border-slate-500 pt-1 text-[9px] font-semibold text-slate-700">Authorised Sign</div></div></div>
        </section>

        <p className="mt-auto text-[10px] font-bold uppercase tracking-wide" style={{ color: darkColor }}>{invoice.footerMessage || "Thank you for your business"}</p>
      </div>
    </div>
  );
}

/** Reference: green "Company" wordmark, top contact-icon row, filled header table, signature line. */
function CorporateTemplate({ invoice, business, accent }: { invoice: DocumentInvoice; business: DocumentBusiness; accent: string }) {
  const darkColor = invoice.secondaryColor || "#243240";
  const docLabel = invoice.docType === "Quotation" ? "Quotation" : "Invoice";
  return (
    <div className="invoice-document mx-auto flex flex-col overflow-hidden bg-white shadow-xl print:shadow-none" style={invoiceStyle(invoice, accent)}>
      <header className="flex h-[228px] shrink-0 items-start justify-between px-12 py-10 text-white" style={{ backgroundColor: accent }}>
        <div className="flex items-center gap-4">
          {business.logoUrl ? <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-md bg-white p-1 shadow-sm"><img src={business.logoUrl} alt={`${business.legalName || "Company"} logo`} className="size-full scale-125 object-contain" /></span> : <span className="grid size-16 shrink-0 place-items-center rounded-md text-xl font-black text-white shadow-sm" style={{ backgroundColor: darkColor }}>{(business.legalName || "CO").slice(0, 2).toUpperCase()}</span>}
          <div><p className="text-[21px] font-black uppercase leading-none tracking-wide">{business.legalName || "Company"}</p><p className="mt-2 text-[8px] uppercase tracking-[0.18em] text-white/80">{business.tradingName || "Idea for invoice"}</p></div>
        </div>
        <div className="text-right"><p className="text-[31px] font-bold uppercase tracking-wide">{docLabel}</p><div className="mt-7 grid grid-cols-[85px_1fr] gap-y-1 text-[8px]"><span className="font-semibold uppercase">{docLabel} No :</span><b>#{invoice.number}</b><span className="font-semibold uppercase">Date</span><b>: {invoice.issueDate}</b></div></div>
      </header>

      <main className="flex flex-1 flex-col px-12 py-7">
        <section className="flex items-start justify-between text-[8px]">
          <div><p className="text-[11px] font-bold text-slate-900">{docLabel} To</p><p className="mt-1 font-semibold text-slate-800">{invoice.clientName || "Client name"}</p>{invoice.clientAddress && <p className="mt-1 max-w-[250px] leading-4 text-slate-600">{invoice.clientAddress}</p>}{invoice.clientEmail && <p className="leading-4 text-slate-600">{invoice.clientEmail}</p>}</div>
          <div className="text-right">{invoice.docType !== "Quotation" && <p><b className="uppercase text-slate-800">Due Date</b> &nbsp;: {invoice.dueDate}</p>}<p className="mt-1"><b className="uppercase text-slate-800">{invoice.docType === "Quotation" ? "Total" : "Total Due"}</b> &nbsp;: {currency(invoice.amount)}</p>{business.address && <p className="mt-1 max-w-[250px] leading-4 text-slate-600">{business.address}</p>}{business.phone && <p className="leading-4 text-slate-600">{business.phone}</p>}{business.email && <p className="leading-4 text-slate-600">{business.email}</p>}</div>
        </section>

        <section className="mt-7">
          <table className="w-full table-fixed border-collapse text-left text-[11px]">
            <thead><tr className="text-white" style={{ backgroundColor: darkColor }}><th className="px-3 py-3 text-[12px] font-semibold">Descriptions</th><th className="w-28 px-3 py-3 text-center text-[12px] font-semibold">Price</th><th className="w-28 px-3 py-3 text-center text-[12px] font-semibold">Quantity</th><th className="w-28 px-3 py-3 text-right text-[12px] font-semibold">Total</th></tr></thead>
            <tbody>{invoice.items.map((item, index) => <tr key={index} className={index % 2 ? "bg-white" : "bg-slate-100"}><td className="px-3 py-3.5 text-slate-700">{item.description}</td><td className="px-3 py-3.5 text-center text-slate-700">{currency(item.rate)}</td><td className="px-3 py-3.5 text-center text-slate-700">{String(item.quantity).padStart(2, "0")}</td><td className="px-3 py-3.5 text-right text-slate-700">{currency(item.amount)}</td></tr>)}{invoice.items.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-slate-300">Add line items to preview the {docLabel.toLowerCase()}</td></tr>}</tbody>
          </table>
        </section>

        <section className="mt-5 grid grid-cols-[1fr_245px] items-start gap-16">
          <div className="text-[9px]">{invoice.showPaymentInfo !== false && <PaymentDetails business={business} accent={accent} />}<div className="mt-6"><p className="text-[11px] font-bold text-slate-800">Terms</p><p className="mt-2 max-w-[390px] text-[8px] leading-4 text-slate-500">{invoice.notes || business.paymentNote || `Payment is due within the agreed terms. Please include the ${docLabel.toLowerCase()} number with your payment.`}</p></div></div>
          <div className="text-[9px]"><div className="border-b border-slate-300"><p className="flex justify-between px-3 py-2"><b>SUB TOTAL</b><span>{currency(invoice.subtotal)}</span></p><p className="flex justify-between bg-slate-100 px-3 py-3"><b>TAX {invoice.taxRate}%</b><span>{currency(invoice.taxAmount)}</span></p><p className="flex justify-between px-3 py-3"><b>GRAND TOTAL</b><span>{currency(invoice.amount)}</span></p></div><div className="ml-auto mt-9 w-36 text-center">{business.signatureUrl ? <img src={business.signatureUrl} alt="Signature" className="mx-auto h-11 max-w-full object-contain" /> : <p className="font-serif text-lg italic text-slate-600">Signed</p>}<div className="border-t border-slate-400 pt-1 text-[8px] text-slate-500">Authorized Signature</div></div></div>
        </section>

      </main>

      <footer className="relative flex h-[78px] shrink-0 items-center justify-between gap-8 px-12 text-white" style={{ backgroundColor: darkColor }}>
        <p className="max-w-[300px] text-[11px] font-bold uppercase tracking-wide">{invoice.footerMessage || "Thank you for your business"}</p>
        <div className="grid max-w-[410px] grid-cols-2 gap-x-6 gap-y-2.5 text-[10px] font-medium text-white/90">
          {business.website && <span className="flex items-center gap-2"><Globe size={14} strokeWidth={2.25} style={{ color: accent }} />{business.website}</span>}
          {business.phone && <span className="flex items-center gap-2"><Phone size={14} strokeWidth={2.25} style={{ color: accent }} />{business.phone}</span>}
          {business.email && <span className="flex items-center gap-2"><Mail size={14} strokeWidth={2.25} style={{ color: accent }} />{business.email}</span>}
          {business.address && <span className="flex items-center gap-2"><MapPin size={14} strokeWidth={2.25} style={{ color: accent }} />{business.address}</span>}
        </div>
      </footer>
    </div>
  );
}

/** Reference: hexagon studio logo, "Billing To", colored header table, dark diagonal footer bar. */
function ProfessionalTemplate({ invoice, business, accent }: { invoice: DocumentInvoice; business: DocumentBusiness; accent: string }) {
  const darkColor = invoice.secondaryColor || "#575757";
  const docLabel = invoice.docType === "Quotation" ? "Quotation" : "Invoice";
  return (
    <div className="invoice-document relative mx-auto flex flex-col overflow-hidden bg-gradient-to-b from-white via-white to-slate-50 shadow-xl print:shadow-none" style={invoiceStyle(invoice, accent)}>
      <div className="absolute inset-x-0 top-0 h-2" style={{ backgroundColor: accent }} />
      <div className="pointer-events-none absolute right-12 top-0 size-24 rounded-b-full opacity-95" style={{ backgroundColor: accent }} />
      <div className="pointer-events-none absolute right-[130px] top-8 size-10 rounded-full" style={{ backgroundColor: darkColor }} />
      <div className="pointer-events-none absolute right-[92px] top-[76px] size-4 rounded-full opacity-40" style={{ backgroundColor: accent }} />
      <div className="pointer-events-none absolute right-5 top-0 size-12 rounded-b-full bg-amber-400" />

      <main className="flex flex-1 flex-col px-11 pb-6 pt-10">
        <header className="flex items-start justify-between">
          <div className="flex items-center gap-3">{business.logoUrl ? <span className="grid size-12 place-items-center rounded-md border bg-white p-1.5 shadow-sm" style={{ borderColor: `${accent}55` }}><img src={business.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" /></span> : <span className="grid size-12 place-items-center rounded-md text-lg font-black text-white shadow-sm" style={{ backgroundColor: accent }}>{(business.legalName || "B")[0]}</span>}<div><p className="text-[17px] font-bold text-slate-900">{business.legalName || "Business"}</p><p className="mt-1 text-[8px] uppercase tracking-[0.16em] text-slate-400">{business.tradingName || "Professional services"}</p></div></div><div className="mr-36 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[8px] font-semibold text-slate-500 shadow-sm">#{invoice.number}</div>
        </header>

        <section className="mt-14 grid grid-cols-2 gap-4 text-[8px]">
          <div className="rounded-md border border-slate-100 bg-white p-4 shadow-sm"><p className="text-[8px] font-semibold uppercase tracking-[0.14em]" style={{ color: accent }}>Billed to</p><p className="mt-2 text-[14px] font-bold text-slate-800">{invoice.clientName || "Client name"}</p><p className="mt-1 leading-4 text-slate-500">{invoice.clientAddress || "Client address"}</p><p className="leading-4 text-slate-500">{invoice.clientEmail}</p></div>
          <div className="rounded-md border border-slate-100 bg-white p-4 shadow-sm"><p className="text-[8px] font-semibold uppercase tracking-[0.14em]" style={{ color: accent }}>{docLabel} details</p><div className="mt-2 grid grid-cols-[90px_1fr] gap-y-1.5 text-slate-500"><span>Issue date</span><b className="text-slate-700">{invoice.issueDate}</b>{invoice.docType !== "Quotation" && <><span>Due date</span><b className="text-slate-700">{invoice.dueDate}</b></>}<span>Status</span><b className="text-slate-700">{invoice.status}</b></div></div>
        </section>

        <div className="mt-5 flex items-end justify-between"><div><p className="text-[8px] font-semibold uppercase tracking-[0.16em]" style={{ color: accent }}>Statement of services</p><h1 className="mt-1 text-[25px] font-semibold uppercase tracking-[0.14em] text-slate-900">{docLabel}</h1></div><p className="text-[10px] font-semibold text-slate-500">{invoice.items.length} line item{invoice.items.length === 1 ? "" : "s"}</p></div>

        <section className="mt-3 overflow-hidden rounded-md border border-slate-200 shadow-sm">
          <table className="w-full table-fixed border-collapse bg-white text-[10px]">
            <thead><tr className="text-white" style={{ backgroundColor: darkColor }}><th className="border-r border-white/40 px-3 py-2 text-left text-[11px] font-semibold">Item Description</th><th className="w-28 border-r border-white/40 px-3 py-2 text-center text-[11px] font-semibold">Prices</th><th className="w-24 border-r border-white/40 px-3 py-2 text-center text-[11px] font-semibold">Count</th><th className="w-28 px-3 py-2 text-right text-[11px] font-semibold">Total</th></tr></thead>
            <tbody>{invoice.items.map((item, index) => <tr key={index} className={index % 2 ? "bg-white" : "bg-slate-50"}><td className="px-3 py-3 font-medium text-slate-700">{item.description}</td><td className="px-3 py-3 text-center font-semibold text-slate-700">{currency(item.rate)}</td><td className="px-3 py-3 text-center font-semibold text-slate-700">{String(item.quantity).padStart(2, "0")}</td><td className="px-3 py-3 text-right font-semibold" style={{ color: accent }}>{currency(item.amount)}</td></tr>)}{invoice.items.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-slate-300">Add line items to preview the {docLabel.toLowerCase()}</td></tr>}</tbody>
          </table>
        </section>

        <section className="mt-5 grid grid-cols-[1fr_270px] items-start gap-8">
          <div className="rounded-md border border-slate-100 bg-white p-4 text-[8px] shadow-sm">{invoice.showPaymentInfo !== false && <PaymentDetails business={business} accent={accent} />}</div>
          <div className="overflow-hidden rounded-md text-[9px] text-white shadow-lg"><div className="space-y-0.5 p-4" style={{ backgroundColor: darkColor }}><p className="flex justify-between"><span className="text-white/65">Sub total</span><b>{currency(invoice.subtotal)}</b></p><p className="flex justify-between"><span className="text-white/65">Discount</span><b>{currency(invoice.discount)}</b></p><p className="flex justify-between"><span className="text-white/65">Tax {invoice.taxRate}%</span><b>{currency(invoice.taxAmount)}</b></p></div><p className="flex justify-between px-4 py-3 text-[11px] font-bold" style={{ backgroundColor: accent }}><span>Grand total</span><b>{currency(invoice.amount)}</b></p></div>
        </section>

        <section className="mt-7 flex items-end justify-between"><div><p className="text-[8px] font-semibold uppercase tracking-[0.14em]" style={{ color: accent }}>With appreciation</p><p className="mt-1 max-w-[430px] text-[12px] font-bold text-slate-800">{invoice.footerMessage || "Thank You for Business With Us"}</p></div><div className="w-36 text-center">{business.signatureUrl ? <img src={business.signatureUrl} alt="Signature" className="mx-auto h-11 max-w-full object-contain" /> : <p className="font-serif text-lg italic text-slate-600">Signed</p>}<div className="border-t border-slate-400 pt-1 text-[8px] text-slate-500">Authorised signature</div></div></section>
      </main>

      <footer className="flex h-[72px] shrink-0 items-center justify-between px-11 text-[8px] text-white/80" style={{ backgroundColor: darkColor }}><span className="flex items-center gap-2"><Phone size={12} />{business.phone || "Phone number"}</span><span className="flex items-center gap-2"><Mail size={12} />{business.email || "Email address"}</span><span className="flex items-center gap-2"><MapPin size={12} />{business.address || "Business location"}</span></footer>
    </div>
  );
}

/** Reference: decorative accent quarter-circles, bold black "INVOICE" wordmark, black header row with colored total bar. */
function CreativeTemplate({ invoice, business, accent }: { invoice: DocumentInvoice; business: DocumentBusiness; accent: string }) {
  const darkColor = invoice.secondaryColor || "#282828";
  const docLabel = invoice.docType === "Quotation" ? "Quotation" : "Invoice";
  return (
    <div className="invoice-document relative mx-auto flex flex-col overflow-hidden bg-white shadow-xl print:shadow-none" style={invoiceStyle(invoice, accent)}>
      <section className="relative h-[570px] shrink-0">
        <div className="absolute inset-y-0 left-0 w-[48%]" style={{ backgroundColor: darkColor }} />
        <div className="absolute left-[47%] top-0 h-[145px] w-3" style={{ backgroundColor: accent }} />

        <div className="absolute left-11 top-10 flex items-center gap-3 text-white">
          {business.logoUrl ? <span className="grid size-14 place-items-center bg-white p-1"><img src={business.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" /></span> : <span className="grid size-14 place-items-center rounded-tl-2xl rounded-br-2xl text-2xl font-black text-white" style={{ backgroundColor: accent }}>{(business.legalName || "C")[0]}</span>}
          <div><p className="text-[16px] font-bold uppercase tracking-wide">{business.legalName || "Corporate Logo"}</p><p className="mt-1 text-[8px] uppercase tracking-[0.2em] text-white/60">{business.tradingName || "Company tagline"}</p></div>
        </div>

        <div className="absolute left-11 top-[190px] text-white"><p className="text-[13px] font-bold uppercase tracking-[0.15em]">To</p><p className="mt-2 text-[20px] font-semibold uppercase tracking-[0.12em]">{invoice.clientName || "Client name"}</p><p className="mt-1 text-[10px] text-white/70">{invoice.clientAddress || invoice.clientEmail || "Client details"}</p></div>

        <div className="absolute right-11 top-11 w-[290px] text-right"><p className="text-[31px] font-semibold uppercase tracking-wide" style={{ color: accent }}>{docLabel}</p><div className="mt-5 grid grid-cols-[100px_1fr] gap-y-2 text-[10px] text-slate-500"><span>{docLabel}</span><b className="text-slate-700">: {invoice.number}</b><span>Date</span><b className="text-slate-700">: {invoice.issueDate}</b></div><div className="mt-8 text-[9px] leading-5 text-slate-500"><p>{business.address || "Business address"}</p><p>{business.phone}</p><p>{business.email}</p></div></div>

        <div className="absolute inset-x-11 top-[320px] overflow-hidden shadow-sm">
          <table className="w-full table-fixed border-collapse text-[11px]">
            <thead><tr className="text-white" style={{ backgroundColor: accent }}><th className="w-12 px-2 py-2.5 text-center text-[10px]">NO</th><th className="px-3 py-2.5 text-left text-[10px]">Item Description</th><th className="w-24 px-3 py-2.5 text-center text-[10px]">Price</th><th className="w-20 px-3 py-2.5 text-center text-[10px]">Qty</th><th className="w-24 px-3 py-2.5 text-right text-[10px]">Total</th></tr></thead>
            <tbody>{invoice.items.map((item, index) => <tr key={index} className="border-b border-slate-300 bg-white/95"><td className="px-2 py-3 text-center text-slate-500">{String(index + 1).padStart(2, "0")}</td><td className="px-3 py-3 font-medium text-slate-700">{item.description}</td><td className="bg-slate-100 px-3 py-3 text-center text-slate-600">{currency(item.rate)}</td><td className="px-3 py-3 text-center text-slate-600">{item.quantity}</td><td className="px-3 py-3 text-right text-slate-700">{currency(item.amount)}</td></tr>)}{invoice.items.length === 0 && <tr className="bg-white"><td colSpan={5} className="py-10 text-center text-slate-300">Add line items to preview the {docLabel.toLowerCase()}</td></tr>}</tbody>
          </table>
        </div>
      </section>

      <section className="relative flex flex-1 flex-col px-11 pb-10 pt-7">
        <div className="grid grid-cols-[1fr_245px] items-start gap-16">
          <div className="text-[9px]">{invoice.showPaymentInfo !== false && <PaymentDetails business={business} accent={accent} />}<div className="mt-6"><p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: accent }}>Terms and Conditions</p><p className="mt-2 max-w-[380px] text-[9px] leading-5 text-slate-500">{invoice.notes || business.paymentNote || `Payment is due within the agreed terms. Please include the ${docLabel.toLowerCase()} number with your payment.`}</p></div></div>
          <div className="text-[10px]"><div className="space-y-2 text-slate-600"><p className="flex justify-between"><span>Sub Total</span><b>{currency(invoice.subtotal)}</b></p><p className="flex justify-between"><span>Tax {invoice.taxRate}%</span><b>{currency(invoice.taxAmount)}</b></p><p className="flex justify-between"><span>Discount</span><b>{currency(invoice.discount)}</b></p><p className="flex justify-between border-t pt-2 font-bold" style={{ borderColor: accent, color: accent }}><span>Grand Total</span><b>{currency(invoice.amount)}</b></p></div><div className="ml-auto mt-10 w-36 text-center">{business.signatureUrl ? <img src={business.signatureUrl} alt="Signature" className="mx-auto h-11 max-w-full object-contain" /> : <p className="font-serif text-lg italic text-slate-600">Signed</p>}<div className="border-t border-slate-400 pt-1"><p className="font-semibold uppercase tracking-wider" style={{ color: accent }}>{business.accountName || "Authorised Sign"}</p><p className="text-[8px] text-slate-400">Manager</p></div></div></div>
        </div>

        <p className="mt-auto text-[11px] text-slate-500">{invoice.footerMessage || "Thank you for your business"}</p>
        <div className="absolute bottom-0 right-11 h-24 w-44" style={{ backgroundColor: darkColor }}><div className="mx-auto h-2 w-24" style={{ backgroundColor: accent }} /></div>
      </section>
    </div>
  );
}
