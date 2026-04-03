import { getServerSession, type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";

// next-auth v4 reads NEXTAUTH_SECRET. AUTH_SECRET is Auth.js v5 convention.
// We read both so the app works whichever the developer sets.
const secret =
  process.env.NEXTAUTH_SECRET ??
  process.env.AUTH_SECRET ??
  (() => {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Missing NEXTAUTH_SECRET environment variable. " +
          "Set it in .env.local (locally) or in your hosting provider's environment settings."
      );
    }
    // Dev-only fallback so `next dev` works without configuration.
    return "swiftkeys-dev-secret-change-in-production";
  })();

const sharedPassword = process.env.SWIFTKEYS_SHARED_PASSWORD?.trim();

function normalizeUsername(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 32);
}

function usernameToId(username: string) {
  return (
    username
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "swiftkeys-user"
  );
}

export const authOptions: NextAuthOptions = {
  secret,
  session: {
    strategy: "jwt",
    // 30-day sessions so users don't get logged out constantly
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [
    Credentials({
      name: "Username and Password",
      credentials: {
        username: {
          label: "Username",
          type: "text",
          placeholder: "typepilot",
        },
        password: {
          label: "Password",
          type: "password",
          placeholder: "At least 6 characters",
        },
      },
      authorize(credentials) {
        const rawUsername =
          typeof credentials?.username === "string" ? credentials.username : "";
        const rawPassword =
          typeof credentials?.password === "string" ? credentials.password : "";
        const username = normalizeUsername(rawUsername);
        const password = rawPassword.trim();

        if (!username || username.length < 3) return null;
        if (!password || password.length < 6) return null;
        if (sharedPassword && password !== sharedPassword) return null;

        return {
          id: usernameToId(username),
          name: username,
        };
      },
    }),
  ],
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.username = user.name ?? undefined;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id =
          typeof token.userId === "string" ? token.userId : session.user.id;
        session.user.name =
          typeof token.username === "string"
            ? token.username
            : (session.user.name ?? undefined);
      }
      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}
