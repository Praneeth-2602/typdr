import type { Metadata } from "next";
import "../styles/globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { PwaRegister } from "@/components/providers/PwaRegister";
import { env } from "@/lib/env";

const siteUrl = env.NEXTAUTH_URL || "https://typdr.vercel.app";

export const metadata: Metadata = {
  title: "typdr — Type faster. Learn smarter.",
  description:
    "A typing platform that actually teaches you. Beginner lessons, per-key analytics, AI-generated drills, races, and honest WPM scores.",
  icons: { icon: "/favicon.svg" },
  manifest: "/manifest.json",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "typdr — Type faster. Learn smarter.",
    description: "Lessons, analytics, AI drills, and multiplayer races.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "typdr" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "typdr — Type faster. Learn smarter.",
    description: "Lessons, analytics, AI drills, and multiplayer races.",
    images: ["/og.png"],
  },
  themeColor: "#e8f55c",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "typdr",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>
            {children}
            <PwaRegister />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
