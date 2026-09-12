export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 10;

export function isAccountLocked(lockedAt: Date | null | undefined) {
  if (!lockedAt) return false;
  return Date.now() - lockedAt.getTime() < LOCKOUT_MINUTES * 60 * 1000;
}
