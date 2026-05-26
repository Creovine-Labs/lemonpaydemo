import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const LIRA_ORG_ID = process.env.NEXT_PUBLIC_LIRA_ORG_ID;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lemonpay — Banking, simplified.",
  description:
    "Lemonpay is a mobile-first neobank built for Rwanda. Send, save, and spend with a card that fits your life.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-neutral-900">
        {children}
        <Toaster theme="light" position="top-center" />
        {LIRA_ORG_ID && (
          <Script
            src="https://widget.liraintelligence.com/v1/widget.js"
            strategy="afterInteractive"
            data-org-id={LIRA_ORG_ID}
            data-greeting="Hi! How can we help you now?"
            data-position="bottom-right"
          />
        )}
      </body>
    </html>
  );
}
