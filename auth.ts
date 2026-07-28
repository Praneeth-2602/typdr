import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { getServerSession, type NextAuthOptions } from "next-auth";

// next-auth v4 reads NEXTAUTH_SECRET. AUTH_SECRET is Auth.js v5 convention.
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
    return "typdr-dev-secret-change-in-production";
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
      .replace(/^-+|-+$/g, "") || "typdr-user"
  );
}

const providers: NextAuthOptions["providers"] = [
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
];

if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    })
  );
}

if (process.env.GOOGLE_ID && process.env.GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  secret,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  providers,
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    jwt({ token, user, account }) {
      if (user) {
        // OAuth users: stable id from provider account; credentials: our username id
        const oauthId =
          account?.provider && account.provider !== "credentials" && account.providerAccountId
            ? `${account.provider}:${account.providerAccountId}`
            : null;
        token.userId = oauthId ?? user.id;
        token.username =
          user.name ??
          (typeof user.email === "string" ? user.email.split("@")[0] : undefined);
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
