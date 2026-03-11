import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "./db";

type SessionUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

const providerClientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID;
const providerClientSecret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET;

export const { handlers, signIn, signOut, auth: nextAuth } = NextAuth({
  session: { strategy: "jwt" },
  providers: providerClientId && providerClientSecret ? [
    Google({
      clientId: providerClientId,
      clientSecret: providerClientSecret,
    }),
  ] : [],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile && "sub" in profile && typeof profile.sub === "string") {
        token.userId = profile.sub;
      }
      if (!token.userId && token.sub) {
        token.userId = token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      const user = session.user as SessionUser | undefined;
      if (user) {
        user.id = (token.userId as string) || token.sub || undefined;
      }
      return session;
    },
  },
});

export async function auth() {
  const session = await nextAuth();
  const user = session?.user as SessionUser | undefined;
  if (user?.id) {
    await prisma.user.upsert({
      where: { clerkId: user.id },
      update: {
        email: user.email ?? undefined,
        name: user.name ?? undefined,
      },
      create: {
        id: crypto.randomUUID(),
        clerkId: user.id,
        email: user.email ?? null,
        name: user.name ?? null,
        currentPlan: "premium",
        subscriptionStatus: "active",
      },
    });
  }
  return { userId: user?.id ?? null };
}

export async function currentUser() {
  const session = await nextAuth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.id) {
    return null;
  }

  return {
    id: user.id,
    fullName: user.name || null,
    firstName: user.name?.split(" ")[0] || null,
    lastName: user.name?.split(" ").slice(1).join(" ") || null,
    imageUrl: user.image || null,
    primaryEmailAddress: user.email ? { emailAddress: user.email } : null,
    emailAddresses: user.email ? [{ emailAddress: user.email }] : [],
  };
}
