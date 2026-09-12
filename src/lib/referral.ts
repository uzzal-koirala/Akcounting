export const REFERRAL_REWARD_AMOUNT = 500;
export const DEFAULT_MIN_WITHDRAWAL = 1000;
const FALLBACK_DAILY_RATE = 20;

export function daysForWithdrawalAmount(amount: number, planMonthlyPrice: number) {
  const dailyRate = planMonthlyPrice > 0 ? planMonthlyPrice / 30 : FALLBACK_DAILY_RATE;
  return Math.max(1, Math.round(amount / dailyRate));
}
