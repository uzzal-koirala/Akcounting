export const PAYMENT_METHODS = ["eSewa", "Khalti", "Bank transfer", "Cash", "Cheque", "Other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
