import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname === "/login" || pathname === "/polaris/login";
  const isApiRoute = pathname.startsWith("/api/");

  if (isApiRoute) return NextResponse.next();

  // NextAuth v5 có thể dùng các tên cookie khác nhau
  const hasSession =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("next-auth.session-token") ||
    req.cookies.has("__Secure-authjs.session-token") ||
    req.cookies.has("__Secure-next-auth.session-token");

  if (!hasSession && !isAuthPage) {
    const base = process.env.NEXTAUTH_URL || req.nextUrl.origin;
    return NextResponse.redirect(new URL("/polaris/login", base));
  }

  if (hasSession && isAuthPage) {
    const base = process.env.NEXTAUTH_URL || req.nextUrl.origin;
    return NextResponse.redirect(new URL("/polaris", base));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
