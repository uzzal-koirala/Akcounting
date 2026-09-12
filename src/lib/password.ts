export const PASSWORD_REQUIREMENT_MESSAGE = "Password must be at least 8 characters and include an uppercase letter, a number, and a symbol.";

const UPPERCASE = /[A-Z]/;
const NUMBER = /[0-9]/;
const SYMBOL = /[^A-Za-z0-9]/;

export function passwordError(password: string): string | null {
  if (password.length < 8) return PASSWORD_REQUIREMENT_MESSAGE;
  if (!UPPERCASE.test(password)) return PASSWORD_REQUIREMENT_MESSAGE;
  if (!NUMBER.test(password)) return PASSWORD_REQUIREMENT_MESSAGE;
  if (!SYMBOL.test(password)) return PASSWORD_REQUIREMENT_MESSAGE;
  return null;
}

export function isStrongPassword(password: string): boolean {
  return passwordError(password) === null;
}
