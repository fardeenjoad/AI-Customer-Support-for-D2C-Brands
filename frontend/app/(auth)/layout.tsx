"use client";

import dynamic from "next/dynamic";

// Lazy-load PrivyProvider to prevent the heavy Privy SDK (~8000 modules including
// walletconnect, crypto, etc.) from blocking page load. The auth layout only
// renders after the component is downloaded.
const PrivyAuthWrapper = dynamic(() => import("./PrivyAuthWrapper"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-xs font-medium text-text-muted">Loading authentication...</p>
    </div>
  ),
});

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PrivyAuthWrapper>{children}</PrivyAuthWrapper>;
}
