export type TransactionKind = "income" | "expense";
export type Transaction = { id: string; kind: TransactionKind; amount: number; description: string; occurredOn: string; categoryId: string | null };
