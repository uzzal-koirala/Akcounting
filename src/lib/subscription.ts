export function isPlanExpired(planRenewsAt: Date | null | undefined) {
  return Boolean(planRenewsAt && planRenewsAt.getTime() < Date.now());
}

export function daysUntil(date: Date | null | undefined) {
  if (!date) return 0;
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}
