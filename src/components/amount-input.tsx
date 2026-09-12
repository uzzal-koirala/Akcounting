"use client";

import { useState } from "react";

function formatAmount(raw: string) {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  const safe = firstDot === -1 ? cleaned : `${cleaned.slice(0, firstDot + 1)}${cleaned.slice(firstDot + 1).replace(/\./g, "")}`;
  const [intPart, decPart] = safe.split(".");
  const withCommas = intPart ? Number(intPart).toLocaleString("en-US") : "";
  return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
}

function toRawNumber(formatted: string) {
  return formatted.replace(/,/g, "");
}

export function AmountInput({
  name,
  required,
  placeholder,
  defaultValue,
  value,
  onValueChange,
  className,
}: {
  name: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: number | string;
  /** Optional raw numeric string (no commas) to drive this field externally, e.g. an auto-calculated EMI. */
  value?: string;
  /** Fires with the raw numeric string (no commas) whenever the user edits the field. */
  onValueChange?: (raw: string) => void;
  className?: string;
}) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue !== undefined && defaultValue !== "" ? formatAmount(String(defaultValue)) : "");
  const display = isControlled ? formatAmount(value) : internal;

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatAmount(event.target.value);
    if (!isControlled) setInternal(formatted);
    onValueChange?.(toRawNumber(formatted));
  }

  return (
    <>
      <input
        type="text"
        inputMode="decimal"
        required={required}
        placeholder={placeholder}
        value={display}
        onChange={handleChange}
        className={className}
      />
      <input type="hidden" name={name} value={toRawNumber(display)} />
    </>
  );
}
