import type { Metadata } from "next";
import { ThemeInitializer } from "@/components/theme-initializer";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AKCounting", template: "%s | AKCounting" },
  description: "Income, expenses, invoices, payroll, and reporting in one place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col"><ThemeInitializer />{children}</body>
    </html>
  );
}
