"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { InvoiceRecord } from "@/actions/invoices";
import type { BusinessProfileRecord } from "@/actions/business-profile";
import { A4_HEIGHT, A4_WIDTH, InvoiceDocument } from "@/components/invoice-document";

export function InvoicePrintView({ invoice, business, autoDownload = false }: { invoice: InvoiceRecord; business: BusinessProfileRecord; autoDownload?: boolean }) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadPdf = useCallback(async () => {
    if (!invoiceRef.current || downloading) return;
    setDownloading(true);
    setError(null);
    try {
      await document.fonts.ready;
      await Promise.all(Array.from(invoiceRef.current.querySelectorAll("img")).map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      })));
      // html-to-image measures the node against the current scroll position; a nonzero
      // scroll offset at capture time shifts the render and crops the output image.
      window.scrollTo(0, 0);
      scrollRef.current?.scrollTo(0, 0);
      // The node is horizontally centered (mx-auto) for on-screen viewing, which on any
      // viewport wider than A4_WIDTH puts its left edge dozens/hundreds of px from x=0.
      // html-to-image captures a canvas of exactly A4_WIDTH anchored to the page origin,
      // not the node's own origin, so that centering offset shows up as blank space on
      // the left with the real content sheared off the right. Pin the node to the true
      // page origin for the capture, then restore its normal centered layout after.
      const node = invoiceRef.current;
      const previousCssText = node.style.cssText;
      node.style.position = "fixed";
      node.style.top = "0";
      node.style.left = "0";
      node.style.margin = "0";
      node.style.zIndex = "-1";
      await new Promise((resolve) => requestAnimationFrame(resolve));
      // The invoice template only sets a minimum height, so a design with many line
      // items can grow past one A4 page. Capture the node at its true rendered height
      // instead of clipping it to A4_HEIGHT, then scale the whole page down to fit a
      // single A4 sheet so nothing gets cropped or spills past the page edge.
      const contentHeight = Math.max(node.scrollHeight, A4_HEIGHT);
      let image: string;
      try {
        const { toJpeg } = await import("html-to-image");
        image = await toJpeg(node, { backgroundColor: "#ffffff", cacheBust: true, pixelRatio: 2, width: A4_WIDTH, height: contentHeight, quality: 0.98 });
      } finally {
        node.style.cssText = previousCssText;
      }
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const pageWidthMm = 210;
      const pageHeightMm = 297;
      const mmPerPx = pageWidthMm / A4_WIDTH;
      const contentHeightMm = contentHeight * mmPerPx;
      const fitScale = Math.min(1, pageHeightMm / contentHeightMm);
      const drawWidthMm = pageWidthMm * fitScale;
      const drawHeightMm = contentHeightMm * fitScale;
      const offsetXMm = (pageWidthMm - drawWidthMm) / 2;
      pdf.addImage(image, "JPEG", offsetXMm, 0, drawWidthMm, drawHeightMm, undefined, "FAST");
      pdf.save(`${invoice.number}.pdf`);
    } catch (cause) {
      console.error(cause);
      setError("The PDF could not be generated. Please try again.");
    } finally {
      setDownloading(false);
    }
  }, [downloading, invoice.number]);

  useEffect(() => {
    if (!autoDownload || startedRef.current) return;
    startedRef.current = true;
    const timer = window.setTimeout(() => void downloadPdf(), 500);
    return () => window.clearTimeout(timer);
  }, [autoDownload, downloadPdf]);

  return <div ref={scrollRef} className="min-h-screen overflow-x-auto bg-slate-100 py-8">
    <div className="mx-auto mb-4 flex items-center justify-end gap-3 px-1" style={{ width: A4_WIDTH }}>
      {error && <p className="mr-auto text-xs font-medium text-rose-600">{error}</p>}
      <button type="button" onClick={() => void downloadPdf()} disabled={downloading} className="flex h-10 items-center gap-2 rounded-lg px-5 text-[10px] font-semibold text-white shadow-lg disabled:cursor-wait disabled:opacity-70" style={{ backgroundColor: invoice.accentColor }}>
        {downloading ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />}
        {downloading ? "Creating PDF..." : "Download PDF"}
      </button>
    </div>
    <div ref={invoiceRef} className="mx-auto bg-white" style={{ width: A4_WIDTH, minHeight: A4_HEIGHT }}>
      <InvoiceDocument invoice={invoice} business={business} template={invoice.template} accent={invoice.accentColor} />
    </div>
  </div>;
}
