import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "RelayFlow", template: "%s · RelayFlow" },
  description: "Lead follow-up for home-service businesses, with a human approving every message.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
