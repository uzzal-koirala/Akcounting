"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { createSession, destroySession, getSession } from "@/lib/auth/session";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { LOCKOUT_MINUTES, MAX_LOGIN_ATTEMPTS } from "@/lib/account-lock";
import { PASSWORD_REQUIREMENT_MESSAGE, passwordError } from "@/lib/password";
import { sendMail } from "@/lib/mailer";
import { passwordResetEmailHtml, verifyEmailHtml } from "@/lib/email-templates";
import { findReferrerByCode } from "@/actions/referral";

const EMAIL_VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

async function sendVerificationEmail(user: { id: string; name: string; email: string }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const token = randomBytes(32).toString("hex");
  const emailVerifyExpiresAt = new Date(Date.now() + EMAIL_VERIFY_TOKEN_TTL_MS);
  await prisma.user.update({ where: { id: user.id }, data: { emailVerifyToken: token, emailVerifyExpiresAt } });
  const link = `${appUrl}/verify-email?token=${token}`;
  await sendMail({ to: user.email, subject: "Verify your AKCounting email address", html: verifyEmailHtml({ name: user.name, link }) });
}

export type AuthFormState = { error?: string; locked?: boolean; minutesLeft?: number } | undefined;

const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  phone: z.string().trim().min(7, "Enter a valid phone number."),
  password: z.string().refine((value) => !passwordError(value), PASSWORD_REQUIREMENT_MESSAGE),
  confirmPassword: z.string().min(1, "Confirm your password."),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

async function loginAsTeamMember(email: string, password: string, remember: boolean): Promise<AuthFormState> {
  const member = await prisma.teamMember.findUnique({ where: { email } });
  if (!member || !member.passwordHash) return { error: "Invalid email or password." };
  if (member.status === "Suspended") return { error: "Your access has been suspended. Please contact your workspace owner." };

  const owner = await prisma.user.findUnique({ where: { id: member.ownerId }, select: { status: true } });
  if (!owner || owner.status === "Suspended") return { error: "This workspace has been suspended. Please contact support." };

  const passwordMatches = await bcrypt.compare(password, member.passwordHash);
  if (!passwordMatches) return { error: "Invalid email or password." };

  await createSession({ userId: member.id, email: member.email, name: member.name, role: "user", ownerId: member.ownerId, memberRole: member.role }, remember);
  redirect("/dashboard");
}

export async function registerUser(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };

  const { name, email, phone, password, confirmPassword } = parsed.data;
  if (password !== confirmPassword) return { error: "Passwords do not match." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with this email already exists." };

  const passwordHash = await bcrypt.hash(password, 10);
  const referralCodeInput = String(formData.get("ref") ?? "").trim();
  const referredByUserId = referralCodeInput ? await findReferrerByCode(referralCodeInput) : null;
  // No plan or planRenewsAt yet — the dashboard layout blocks all pages with a mandatory
  // plan-picker modal until the user selects one and starts their 7-day free trial.
  const user = await prisma.user.create({ data: { name, email, phone, passwordHash, referredByUserId } });

  try {
    await sendVerificationEmail(user);
  } catch {
    // Signup still succeeds even if the verification email fails to send — the user can
    // request another one from the verify-email page.
  }

  await createSession({ userId: user.id, email: user.email, name: user.name, role: user.role });
  redirect("/verify-email");
}

// Plain async helper (not a form action) so the /verify-email page can call it directly during
// render when a `?token=` is present, then redirect() itself — no client-side form needed.
export async function verifyEmailToken(token: string): Promise<{ error?: string }> {
  if (!token) return { error: "This link is missing its token. Please use the link from your verification email." };

  const user = await prisma.user.findUnique({ where: { emailVerifyToken: token } });
  if (!user || !user.emailVerifyExpiresAt || user.emailVerifyExpiresAt.getTime() < Date.now()) {
    return { error: "This link is invalid or has expired. Please request a new one." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date(), emailVerifyToken: null, emailVerifyExpiresAt: null } });
  return {};
}

export async function resendVerificationEmail(): Promise<{ error?: string; sent?: boolean }> {
  const session = await getSession();
  if (!session) return { error: "You must be signed in to request a new verification email." };

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, emailVerifiedAt: true } });
  if (!user) return { error: "Your account could not be found." };
  if (user.emailVerifiedAt) return { sent: true };

  try {
    await sendVerificationEmail(user);
    return { sent: true };
  } catch {
    return { error: "Could not send the verification email. Please try again shortly." };
  }
}

export async function loginUser(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const captchaValid = await verifyTurnstileToken(formData.get("cf-turnstile-response"));
  if (!captchaValid) return { error: "Captcha verification failed. Please try again." };

  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };

  const { email, password } = parsed.data;
  const remember = formData.get("remember") === "on";
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return loginAsTeamMember(email, password, remember);

  const isAdmin = user.role === "admin";

  if (!isAdmin && user.lockedAt) {
    const elapsedMs = Date.now() - user.lockedAt.getTime();
    const lockoutMs = LOCKOUT_MINUTES * 60 * 1000;
    if (elapsedMs < lockoutMs) {
      return { locked: true, minutesLeft: Math.ceil((lockoutMs - elapsedMs) / 60000) };
    }
    await prisma.user.update({ where: { id: user.id }, data: { lockedAt: null, failedLoginAttempts: 0 } });
    user.lockedAt = null;
    user.failedLoginAttempts = 0;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    if (isAdmin) return { error: "Invalid email or password." };

    const attempts = user.failedLoginAttempts + 1;
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: attempts, lockedAt: new Date() } });
      return { locked: true, minutesLeft: LOCKOUT_MINUTES };
    }
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: attempts } });
    // Deliberately generic, with no attempt counter — revealing "N attempts left" would tell an
    // attacker this email is a real account (a nonexistent email always gets this same message).
    return { error: "Invalid email or password." };
  }

  if (user.status === "Suspended") return { error: "Your account has been suspended. Please contact support." };

  if (!isAdmin && user.failedLoginAttempts > 0) {
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedAt: null } });
  }

  await createSession({ userId: user.id, email: user.email, name: user.name, role: user.role }, remember);
  redirect(user.role === "admin" ? "/super-admin" : "/dashboard");
}

export async function logoutUser() {
  await destroySession();
  redirect("/login");
}

const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
// Deliberately generic — the same response is returned whether or not an account exists for the
// given email, so this endpoint can't be used to enumerate registered users.
const GENERIC_RESET_MESSAGE = "If an account exists for that email, we've sent a link to reset your password.";

export type RequestPasswordResetState = { message: string } | undefined;

export async function requestPasswordReset(_prevState: RequestPasswordResetState, formData: FormData): Promise<RequestPasswordResetState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { message: GENERIC_RESET_MESSAGE };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
  const link = `${appUrl}/set-password?token=${token}`;

  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
    if (user) {
      await prisma.user.update({ where: { id: user.id }, data: { passwordSetToken: token, passwordSetExpiresAt: expiresAt } });
      await sendMail({ to: email, subject: "Reset your AKCounting password", html: passwordResetEmailHtml({ name: user.name, link }) });
    } else {
      const member = await prisma.teamMember.findUnique({ where: { email }, select: { id: true, name: true, status: true } });
      if (member && member.status !== "Suspended") {
        await prisma.teamMember.update({ where: { id: member.id }, data: { passwordSetToken: token, passwordSetExpiresAt: expiresAt } });
        await sendMail({ to: email, subject: "Reset your AKCounting password", html: passwordResetEmailHtml({ name: member.name, link }) });
      }
    }
  } catch {
    // Swallow lookup/send failures — the response must stay identical either way.
  }

  return { message: GENERIC_RESET_MESSAGE };
}

export type SetPasswordState = { error?: string } | undefined;

const setPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().refine((value) => !passwordError(value), PASSWORD_REQUIREMENT_MESSAGE),
  confirmPassword: z.string().min(1, "Confirm your password."),
});

export async function completePasswordSetup(_prevState: SetPasswordState, formData: FormData): Promise<SetPasswordState> {
  const parsed = setPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  if (parsed.data.password !== parsed.data.confirmPassword) return { error: "Passwords do not match." };

  const user = await prisma.user.findUnique({ where: { passwordSetToken: parsed.data.token } });
  if (user) {
    if (!user.passwordSetExpiresAt || user.passwordSetExpiresAt.getTime() < Date.now()) {
      return { error: "This link is invalid or has expired. Please request a new one." };
    }
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash, passwordSetToken: null, passwordSetExpiresAt: null } });
    await createSession({ userId: user.id, email: user.email, name: user.name, role: user.role });
    redirect(user.role === "admin" ? "/super-admin" : "/dashboard");
  }

  const member = await prisma.teamMember.findUnique({ where: { passwordSetToken: parsed.data.token } });
  if (!member || !member.passwordSetExpiresAt || member.passwordSetExpiresAt.getTime() < Date.now()) {
    return { error: "This link is invalid or has expired. Please request a new one." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.teamMember.update({ where: { id: member.id }, data: { passwordHash, passwordSetToken: null, passwordSetExpiresAt: null, status: "Active" } });
  await createSession({ userId: member.id, email: member.email, name: member.name, role: "user", ownerId: member.ownerId, memberRole: member.role });
  redirect("/dashboard");
}
