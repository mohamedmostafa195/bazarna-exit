import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import { ensureAuthEnv, getAppBaseUrl } from "@/lib/app-url";
import { normalizeEmail } from "@/lib/normalize-email";

ensureAuthEnv();

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = normalizeEmail(parsed.data.email);

        const user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.password
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.representativeName,
          role: user.role,
          brandName: user.brandName,
          boothNumber: user.boothNumber,
          entranceType: user.entranceType,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      const appUrl = getAppBaseUrl();
      const safeBase =
        baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")
          ? appUrl
          : baseUrl;

      if (url.startsWith("/")) return `${safeBase}${url}`;
      try {
        const target = new URL(url);
        const base = new URL(safeBase);
        if (target.origin === base.origin) return url;
        // Block redirects to localhost when on production
        if (
          target.hostname === "localhost" ||
          target.hostname === "127.0.0.1"
        ) {
          return `${safeBase}/login`;
        }
      } catch {
        /* ignore invalid url */
      }
      return `${safeBase}/login`;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.brandName = user.brandName;
        token.boothNumber = user.boothNumber;
        token.entranceType = user.entranceType;
      }
      if (trigger === "update" && session?.entranceType) {
        token.entranceType = session.entranceType;
      }

      // Keep JWT role in sync with the database (important on Vercel after seeding admins).
      if (
        process.env.NEXT_RUNTIME !== "edge" &&
        token.id &&
        typeof token.id === "string"
      ) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id },
            select: {
              role: true,
              entranceType: true,
              brandName: true,
              boothNumber: true,
            },
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.brandName = dbUser.brandName;
            token.boothNumber = dbUser.boothNumber;
            if (trigger !== "update" || !session?.entranceType) {
              token.entranceType = dbUser.entranceType;
            }
          }
        } catch (error) {
          console.error("[auth] Failed to refresh user from database:", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.brandName = token.brandName as string;
        session.user.boothNumber = token.boothNumber as string;
        session.user.entranceType = token.entranceType as string | null;
      }
      return session;
    },
  },
});
