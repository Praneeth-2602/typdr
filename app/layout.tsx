import type { Metadata } from "next";
import "../styles/globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";

export const metadata: Metadata = {
  title: "SwiftKeys — Type faster. Learn smarter.",
  description:
    "A typing platform that actually teaches you. Beginner lessons, per-key analytics, AI-generated drills, and honest WPM scores. Serverless. No account needed.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
