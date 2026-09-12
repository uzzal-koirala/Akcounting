import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { isPlanExpired } from "@/lib/subscription";

const SESSION_COOKIE = "session";
const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/set-password"];
const PUBLIC_PATHS = ["/account-suspended", "/verify-email"];

async function getSessionPayload(request: NextRequest): Promise<{ userId: string; role: string } | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return { userId: String(payload.userId ?? ""), role: (payload.role as string) ?? "user" };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSessionPayload(request);
  const role = session?.role ?? null;
  const authenticated = session !== null;
  const isAuthPath = AUTH_PATHS.some((path) => pathname.startsWith(path));
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const homePath = role === "admin" ? "/super-admin" : "/dashboard";

  if (!authenticated && !isAuthPath && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (authenticated && isAuthPath) {
    const url = request.nextUrl.clone();
    url.pathname = homePath;
    return NextResponse.redirect(url);
  }

  if (authenticated && role !== "admin" && pathname.startsWith("/super-admin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Re-checked on every request (including client-side navigations) so a suspended, unverified,
  // or expired account can't keep using cached dashboard pages without a fresh server check.
  if (session && role !== "admin" && pathname !== "/account-suspended") {
    const [user, paidCount] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.userId }, select: { status: true, planRenewsAt: true, emailVerifiedAt: true } }),
      prisma.payment.count({ where: { userId: session.userId, status: "Complete" } }),
    ]);

    if (user?.status === "Suspended") {
      const url = request.nextUrl.clone();
      url.pathname = "/account-suspended";
      return NextResponse.redirect(url);
    }

    if (!user?.emailVerifiedAt && pathname !== "/verify-email") {
      const url = request.nextUrl.clone();
      url.pathname = "/verify-email";
      return NextResponse.redirect(url);
    }

    if (user?.emailVerifiedAt && pathname === "/verify-email") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    if (isPlanExpired(user?.planRenewsAt) && pathname !== "/subscription" && pathname !== "/verify-email") {
      const url = request.nextUrl.clone();
      url.pathname = "/subscription";
      url.searchParams.set("ended", paidCount > 0 ? "subscription" : "trial");
      return NextResponse.redirect(url);
    }
  }

  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: forwardedHeaders } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
