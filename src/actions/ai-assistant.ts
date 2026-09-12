"use server";

import { requireUserId } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { listIncome } from "@/actions/income";
import { listExpenses } from "@/actions/expenses";
import { listSalaries } from "@/actions/salaries";
import { listInvoices } from "@/actions/invoices";
import { listLoans } from "@/actions/loans";

export type ChatMessage = { role: "user" | "assistant"; content: string };

function buildFinancialContext(data: {
  income: Awaited<ReturnType<typeof listIncome>>;
  expenses: Awaited<ReturnType<typeof listExpenses>>;
  salaries: Awaited<ReturnType<typeof listSalaries>>;
  invoices: Awaited<ReturnType<typeof listInvoices>>;
  loans: Awaited<ReturnType<typeof listLoans>>;
}) {
  const totalIncome = data.income.filter((item) => item.status === "Received").reduce((sum, item) => sum + item.amount, 0);
  const pendingIncome = data.income.filter((item) => item.status === "Pending").reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = data.expenses.filter((item) => item.status === "Paid").reduce((sum, item) => sum + item.amount, 0);
  const totalSalaries = data.salaries.filter((item) => item.status === "Paid").reduce((sum, item) => sum + (item.gross - item.deductions + item.bonus), 0);
  const outstandingInvoices = data.invoices.filter((item) => item.status !== "Paid").reduce((sum, item) => sum + item.amount, 0);
  const loanBalance = data.loans.reduce((sum, item) => sum + item.balance, 0);

  const recentIncome = data.income.slice(0, 15).map((item) => `- ${item.date} | ${item.client} | ${item.source} | Rs ${item.amount} | ${item.status}`).join("\n") || "None";
  const recentExpenses = data.expenses.slice(0, 15).map((item) => `- ${item.date} | ${item.vendor} | ${item.category} | Rs ${item.amount} | ${item.status}`).join("\n") || "None";
  const recentSalaries = data.salaries.slice(0, 15).map((item) => `- ${item.month} | ${item.employee} (${item.role}) | Gross Rs ${item.gross} | ${item.status}`).join("\n") || "None";
  const recentInvoices = data.invoices.slice(0, 15).map((item) => `- ${item.number} | ${item.clientName} | Rs ${item.amount} | ${item.status} | due ${item.dueDate}`).join("\n") || "None";
  const loanLines = data.loans.map((item) => `- ${item.name} (${item.lender}) | balance Rs ${item.balance} of Rs ${item.principal} | EMI Rs ${item.emi} | ${item.status}`).join("\n") || "None";

  return `You are the built-in AI assistant for "AKCounting", an accounting app. Answer the user's question using ONLY the real financial data below. Be concise, use Rs for currency, and use plain-text bullet points (start lines with "- ") when listing multiple items. Do NOT use markdown formatting like **bold**, headings, or tables — the chat UI renders plain text only. If the data doesn't contain the answer, say so clearly instead of guessing.

SUMMARY
- Total income received: Rs ${totalIncome}
- Pending income: Rs ${pendingIncome}
- Total expenses paid: Rs ${totalExpenses}
- Total salaries paid: Rs ${totalSalaries}
- Outstanding invoices: Rs ${outstandingInvoices}
- Total loan balance: Rs ${loanBalance}

RECENT INCOME
${recentIncome}

RECENT EXPENSES
${recentExpenses}

RECENT SALARIES
${recentSalaries}

RECENT INVOICES
${recentInvoices}

LOANS
${loanLines}`;
}

export async function askAssistant(history: ChatMessage[]): Promise<{ reply: string } | { error: string }> {
  const userId = await requireUserId();

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { error: "AI assistant is not configured. Missing OPENROUTER_API_KEY." };

  const trimmedHistory = history.slice(-12).filter((message) => message.content.trim().length > 0);
  if (trimmedHistory.length === 0) return { error: "Ask something first." };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { aiTokenBalance: true } });
  if (!user || user.aiTokenBalance <= 0) return { error: "You're out of AI tokens. Add more tokens from Settings → AI usage to keep chatting." };

  const [income, expenses, salaries, invoices, loans] = await Promise.all([listIncome(), listExpenses(), listSalaries(), listInvoices(), listLoans()]);
  const systemPrompt = buildFinancialContext({ income, expenses, salaries, invoices, loans });

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": "AKCounting",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, ...trimmedHistory],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `AI request failed (${response.status}): ${errorText.slice(0, 200)}` };
    }

    const payload = await response.json();
    const reply = payload?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) return { error: "The AI didn't return a response. Try again." };

    // "Credits" are a simple per-question unit shown to the user (e.g. 20 free credits on the
    // Starter plan) — not the raw LLM token count, which can run into the hundreds per reply
    // and would otherwise drain a small credit balance after a single question.
    const CREDIT_COST_PER_MESSAGE = 1;
    await prisma.user.update({ where: { id: userId }, data: { aiTokenBalance: { decrement: Math.min(CREDIT_COST_PER_MESSAGE, user.aiTokenBalance) }, aiTokensUsed: { increment: CREDIT_COST_PER_MESSAGE } } });

    return { reply };
  } catch {
    return { error: "Could not reach the AI service. Check your connection and try again." };
  }
}
