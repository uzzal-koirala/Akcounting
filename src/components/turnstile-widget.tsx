"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "error-callback"?: () => void; "expired-callback"?: () => void }) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

export function TurnstileWidget({ resetSignal }: { resetSignal?: unknown }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerId = useId().replace(/:/g, "");
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState("");

  function renderWidget() {
    const container = document.getElementById(containerId);
    if (!container || !window.turnstile || widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(container, {
      sitekey: siteKey!,
      callback: (widgetToken) => setToken(widgetToken),
      "error-callback": () => setToken(""),
      "expired-callback": () => setToken(""),
    });
  }

  // Turnstile tokens are single-use: once a form submission is verified (or fails for an
  // unrelated reason, like a wrong password), the old token is spent. Reset the widget after
  // every server response so the next submit attempt has a fresh, valid token.
  useEffect(() => {
    if (!widgetIdRef.current || !window.turnstile) return;
    setToken("");
    window.turnstile.reset(widgetIdRef.current);
  }, [resetSignal]);

  if (!siteKey) return null;

  return (
    <div>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" onReady={renderWidget} onLoad={renderWidget} />
      <input type="hidden" name="cf-turnstile-response" value={token} />
      <div id={containerId} />
    </div>
  );
}
