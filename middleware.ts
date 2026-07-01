import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname === "/login" || pathname === "/polaris/login";
  const isApiRoute = pathname.startsWith("/api/");

  if (isApiRoute) return NextResponse.next();

  if (!token && !isAuthPage) {
    const base = process.env.NEXTAUTH_URL || req.nextUrl.origin;
    const loginUrl = new URL("/polaris/login", base);
    return NextResponse.redirect(loginUrl);
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/polaris", req.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
