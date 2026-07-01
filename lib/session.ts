import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export async function getSession(req: NextRequest): Promise<SessionUser | null> {
  // NextAuth v5 (Auth.js) dùng "authjs.session-token", không phải "next-auth.session-token"
  const cookieName = process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  let token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName });

  // Fallback: thử tên cũ nếu không tìm thấy
  if (!token?.sub) {
    token = await getToken({ req, secret: process.env.AUTH_SECRET });
  }

  if (!token?.sub) return null;
  return {
    id: token.sub,
    name: (token.name as string) || "",
    email: (token.email as string) || "",
    role: (token.role as string) || "assistant",
  };
}
