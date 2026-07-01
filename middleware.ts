import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only handle /polaris/* routes
  if (!pathname.startsWith("/polaris")) return NextResponse.next();

  const isAuthPage = pathname === "/polaris/login";
  const isApiRoute = pathname.startsWith("/polaris/api/") || pathname.startsWith("/api/");

  if (isApiRoute) return NextResponse.next();

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto") || "https";

  // Validate JWT properly instead of just checking cookie existence
  const cookieName = proto === "https"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  let token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName });
  if (!token?.sub) {
    token = await getToken({ req, secret: process.env.AUTH_SECRET });
  }

  const hasValidSession = !!token?.sub;

  if (!hasValidSession && !isAuthPage) {
    return NextResponse.redirect(`${proto}://${host}/polaris/login`);
  }

  if (hasValidSession && isAuthPage) {
    return NextResponse.redirect(`${proto}://${host}/polaris`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
