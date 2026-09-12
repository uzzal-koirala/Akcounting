import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "session";
const REMEMBER_DURATION_SECONDS = 60 * 60 * 24 * 7;
const DEFAULT_DURATION_SECONDS = 60 * 60 * 12;

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET environment variable is not configured.");
  return new TextEncoder().encode(secret);
}

export type SessionPayload = { userId: string; email: string; name: string; role: string; ownerId?: string; memberRole?: string };

// `remember` controls both the JWT's own expiry and the cookie's maxAge: unchecked, the session
// is a short-lived (12h) browser-session cookie (cleared when the browser closes); checked, it's
// a real 7-day persistent cookie. Either way the JWT itself is never valid longer than the cookie.
export async function createSession(payload: SessionPayload, remember = true) {
  const durationSeconds = remember ? REMEMBER_DURATION_SECONDS : DEFAULT_DURATION_SECONDS;
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${durationSeconds}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: durationSeconds } : {}),
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      role: (payload.role as string) ?? "user",
      ownerId: payload.ownerId as string | undefined,
      memberRole: payload.memberRole as string | undefined,
    };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
