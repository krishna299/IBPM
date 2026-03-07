import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/shared/auth-provider";
import { cn } from "@/lib/utils";

const geist = GeistSans;

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IBPM — Integrated Beauty Product Management",
  description: "Central management portal for Esthetic Insights Pvt Ltd",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}