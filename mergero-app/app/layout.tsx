import type { Metadata } from "next";
import "./globals.css";
import "./mergero.css";

export const metadata: Metadata = {
  title: "Mergero Quick Check",
  description: "Explore an illustrative business value and choose your next step with Mergero.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

