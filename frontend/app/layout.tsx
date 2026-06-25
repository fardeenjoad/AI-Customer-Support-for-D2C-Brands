import type { Metadata } from "next";
import Providers from "@/components/common/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResolveIQ - AI Customer Support Platform for D2C Brands",
  description:
    "AI customer support automation for D2C brands. Resolve common requests, route escalations, and manage agent queues from one workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body className="font-sans bg-background text-text-primary antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
