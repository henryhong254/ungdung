import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = nextUrl.pathname.startsWith("/login");
      if (isAuthPage) return isLoggedIn ? Response.redirect(new URL("/", nextUrl)) : true;
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) { token.id = user.id; token.role = (user as any).role; }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      (session.user as any).role = token.role;
      return session;
    },
  },
};
