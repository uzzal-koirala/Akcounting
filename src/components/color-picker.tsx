"use client";

import { Check, Palette, Pipette } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type HSV = { h: number; s: number; v: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num) || full.length !== 6) return { r: 0, g: 0, b: 0 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((c) => clamp(Math.round(c), 0, 255).toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsv(r: number, g: number, b: number): HSV {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / d) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / d + 2);
    else h = 60 * ((rn - gn) / d + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

function hsvToRgb({ h, s, v }: HSV) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

function hexToHsv(hex: string): HSV {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsv(r, g, b);
}

function hsvToHex(hsv: HSV) {
  const { r, g, b } = hsvToRgb(hsv);
  return rgbToHex(r, g, b);
}

function isValidHex(value: string) {
  return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(value);
}

export function ColorPicker({ value, onChange, presets, label = "Color" }: { value: string; onChange: (hex: string) => void; presets: string[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(value));
  const [hexInput, setHexInput] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<"sv" | "hue" | null>(null);

  if (value !== lastValue) {
    setLastValue(value);
    setHsv(hexToHsv(value));
    setHexInput(value);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function commit(next: HSV) {
    setHsv(next);
    const hex = hsvToHex(next);
    setHexInput(hex);
    onChange(hex);
  }

  function updateFromSvEvent(clientX: number, clientY: number) {
    const rect = svRef.current?.getBoundingClientRect();
    if (!rect) return;
    const s = clamp((clientX - rect.left) / rect.width, 0, 1);
    const v = clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
    commit({ ...hsv, s, v });
  }

  function updateFromHueEvent(clientX: number) {
    const rect = hueRef.current?.getBoundingClientRect();
    if (!rect) return;
    const h = clamp(((clientX - rect.left) / rect.width) * 360, 0, 360);
    commit({ ...hsv, h });
  }

  useEffect(() => {
    function onMove(event: PointerEvent) {
      if (draggingRef.current === "sv") updateFromSvEvent(event.clientX, event.clientY);
      else if (draggingRef.current === "hue") updateFromHueEvent(event.clientX);
    }
    function onUp() { draggingRef.current = null; }
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hsv]);

  function handleHexInput(raw: string) {
    const next = raw.startsWith("#") ? raw : `#${raw}`;
    setHexInput(next);
    if (isValidHex(next)) {
      setHsv(hexToHsv(next));
      onChange(next);
    }
  }

  const hueColor = hsvToHex({ h: hsv.h, s: 1, v: 1 });

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex h-10 w-full items-center gap-2 rounded-lg border px-3 text-[10px] font-semibold text-slate-600 transition ${open ? "border-slate-400 ring-2 ring-slate-100" : "border-slate-200 hover:border-slate-300"}`}
      >
        <span className="relative size-5 shrink-0 overflow-hidden rounded-full border border-slate-200 shadow-inner" style={{ backgroundColor: value }} />
        <span className="uppercase tracking-wide text-slate-500">{value}</span>
        <Palette size={13} className="ml-auto shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute inset-x-0 z-40 mt-2 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xl">
          <div
            ref={svRef}
            onPointerDown={(event) => { draggingRef.current = "sv"; updateFromSvEvent(event.clientX, event.clientY); }}
            className="relative h-40 w-full cursor-crosshair overflow-hidden rounded-xl"
            style={{ backgroundColor: hueColor, backgroundImage: "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)" }}
          >
            <span
              className="pointer-events-none absolute size-4 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
              style={{ left: `${hsv.s * 100}%`, bottom: `${hsv.v * 100}%`, backgroundColor: value }}
            />
          </div>

          <div
            ref={hueRef}
            onPointerDown={(event) => { draggingRef.current = "hue"; updateFromHueEvent(event.clientX); }}
            className="relative mt-3 h-3.5 w-full cursor-pointer rounded-full"
            style={{ background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" }}
          >
            <span
              className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
              style={{ left: `${(hsv.h / 360) * 100}%`, backgroundColor: hueColor }}
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-slate-200" style={{ backgroundColor: value }}><Pipette size={13} className={hsv.v > 0.6 && hsv.s < 0.4 ? "text-slate-500" : "text-white/90"} /></span>
            <label className="flex h-9 flex-1 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[10px] font-semibold text-slate-500 focus-within:border-slate-400">
              <span className="text-slate-300">#</span>
              <input value={hexInput.replace("#", "")} onChange={(event) => handleHexInput(event.target.value)} maxLength={6} spellCheck={false} className="w-full min-w-0 bg-transparent uppercase text-slate-700 outline-none" />
            </label>
          </div>

          <div className="mt-3.5 grid grid-cols-6 gap-2">
            {presets.map((color) => {
              const active = color.toLowerCase() === value.toLowerCase();
              return (
                <button key={color} type="button" aria-label={`Use color ${color}`} onClick={() => commit(hexToHsv(color))} className="relative grid size-6 place-items-center rounded-full border border-black/5 shadow-sm transition hover:scale-110" style={{ backgroundColor: color }}>
                  {active && <Check size={11} className={hexToHsv(color).v > 0.6 && hexToHsv(color).s < 0.4 ? "text-slate-700" : "text-white"} strokeWidth={3} />}
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-center text-[8px] font-medium text-slate-400">{label} · drag to fine-tune</p>
        </div>
      )}
    </div>
  );
}
