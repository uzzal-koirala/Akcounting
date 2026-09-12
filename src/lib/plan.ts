export type PlanName = "Starter Package" | "Growth Package" | "Premium Package";
export const PLAN_NAMES: PlanName[] = ["Starter Package", "Growth Package", "Premium Package"];

// Fallback used only where no real per-user plan is available (e.g. a default prop value).
export const CURRENT_PLAN: PlanName = "Starter Package";

export function isPlanName(value: string): value is PlanName {
  return (PLAN_NAMES as string[]).includes(value);
}

export function toPlanName(value: string | null | undefined): PlanName {
  return value && isPlanName(value) ? value : "Starter Package";
}

export const PLAN_PRICE: Record<PlanName, number> = {
  "Starter Package": 499,
  "Growth Package": 999,
  "Premium Package": 1999,
};

export type PlanLimits = { maxTeamMembers: number; maxDocuments: number; canUploadImages: boolean };

const LIMITS: Record<PlanName, PlanLimits> = {
  "Starter Package": { maxTeamMembers: 1, maxDocuments: 0, canUploadImages: false },
  "Growth Package": { maxTeamMembers: 3, maxDocuments: 10, canUploadImages: true },
  "Premium Package": { maxTeamMembers: 10, maxDocuments: 100, canUploadImages: true },
};

export function planLimits(plan: PlanName = CURRENT_PLAN): PlanLimits {
  return LIMITS[plan];
}

export function hasProofUploads(plan: PlanName = CURRENT_PLAN) {
  return planLimits(plan).canUploadImages;
}

export function canUploadDocuments(currentCount: number, plan: PlanName = CURRENT_PLAN) {
  return currentCount < planLimits(plan).maxDocuments;
}

export function canAddTeamMembers(currentCount: number, plan: PlanName = CURRENT_PLAN) {
  return currentCount < planLimits(plan).maxTeamMembers;
}

// Free monthly AI assistant credits granted per plan tier.
export const AI_CREDIT_ALLOWANCE: Record<PlanName, number> = {
  "Starter Package": 20,
  "Growth Package": 50,
  "Premium Package": 120,
};

// Purchasable AI credit top-up packs (paid via eSewa).
export const AI_CREDIT_PACKS = [
  { credits: 200, price: 4000 },
  { credits: 1000, price: 18000 },
  { credits: 5000, price: 80000 },
] as const;

// Rate (Rs per credit) used to price a custom, non-pack credit amount — matches the
// smallest pack's per-credit rate so custom purchases never undercut the bundled packs.
export const AI_CUSTOM_CREDIT_RATE = 20;
export const AI_CUSTOM_CREDIT_MIN = 1;
export const AI_CUSTOM_CREDIT_MAX = 10000;

export function priceForCustomCredits(credits: number) {
  return Math.round(credits * AI_CUSTOM_CREDIT_RATE);
}
