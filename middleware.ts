import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = ["/home", "/chat", "/meeting", "/settings", "/integrations"];
const sessionCookiePrefixes = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

export default function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  const hasSessionCookie = req.cookies
    .getAll()
    .some((cookie) =>
      sessionCookiePrefixes.some((prefix) => cookie.name === prefix || cookie.name.startsWith(`${prefix}.`)),
    );

  if (!hasSessionCookie && isProtected) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
