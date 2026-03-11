import { nextAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

const protectedRoutes = ["/home", "/chat", "/meeting", "/settings", "/integrations"];

export default nextAuth((req) => {
  const pathname = req.nextUrl.pathname;
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  if (!req.auth && isProtected) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
