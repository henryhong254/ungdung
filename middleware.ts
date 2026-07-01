import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  // With basePath: "/polaris", pathname here has basePath stripped:
  // /polaris      -> "/"
  // /polaris/login -> "/login"
  // /polaris/api/* -> "/api/*"
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname === "/login";
  const isApiRoute = pathname.startsWith("/api/");

  if (isApiRoute) return NextResponse.next();

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto") || "https";

  const cookieName = proto === "https"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  let hasValidSession = false;
  try {
    let token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName });
    if (!token?.sub) {
      token = await getToken({ req, secret: process.env.AUTH_SECRET });
    }
    hasValidSession = !!token?.sub;
  } catch {
    hasValidSession = false;
  }

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
