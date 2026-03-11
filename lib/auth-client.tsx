'use client'

import { ReactNode } from "react";
import { signIn as nextAuthSignIn, signOut as nextAuthSignOut, useSession } from "next-auth/react";

function defaultSignIn() {
  return nextAuthSignIn("google", { callbackUrl: "/home" });
}

export function useAuth() {
  const { data, status } = useSession();
  const user = data?.user as { id?: string } | undefined;

  return {
    userId: user?.id ?? null,
    isLoaded: status !== "loading",
    isSignedIn: status === "authenticated",
  };
}

export function useUser() {
  const { data, status } = useSession();
  const sessionUser = data?.user as { id?: string; name?: string | null; email?: string | null; image?: string | null } | undefined;
  const user = sessionUser ? {
    id: sessionUser.id ?? null,
    fullName: sessionUser.name ?? null,
    imageUrl: sessionUser.image ?? null,
    primaryEmailAddress: sessionUser.email ? { emailAddress: sessionUser.email } : null,
    emailAddresses: sessionUser.email ? [{ emailAddress: sessionUser.email }] : [],
  } : null;

  return {
    user,
    isSignedIn: status === "authenticated",
    isLoaded: status !== "loading",
  };
}

export function SignInButton({ children }: { children: ReactNode; mode?: string }) {
  return <span onClick={() => defaultSignIn()}>{children}</span>;
}

export function SignUpButton({ children }: { children: ReactNode; mode?: string }) {
  return <span onClick={() => defaultSignIn()}>{children}</span>;
}

export function SignOutButton({ children }: { children: ReactNode }) {
  return <span onClick={() => nextAuthSignOut({ callbackUrl: "/" })}>{children}</span>;
}
