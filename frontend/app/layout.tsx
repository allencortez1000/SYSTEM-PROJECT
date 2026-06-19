import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import AuthGate from "./components/auth-gate";

export const metadata: Metadata = {
  title: "Rabino Home Builders Corporation",
  description: "Enterprise-grade HR, payroll, attendance, and compliance management platform.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
