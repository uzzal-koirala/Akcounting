export function formatCurrency(amount: number) { return `Rs ${new Intl.NumberFormat("en-NP", { maximumFractionDigits: 2 }).format(amount)}`; }
