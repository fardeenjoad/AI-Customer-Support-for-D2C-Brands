import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from "@/components/common/Providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ResolveIQ — AI Customer Support Platform for D2C Brands",
  description: "Ultra-premium customer support automation. Detect sentiment, automate ticketing, FAQ chatbot routing, and agent collaboration queues.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} font-sans bg-background text-text-primary antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
