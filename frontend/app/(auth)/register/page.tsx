"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { LifeBuoy, ShieldCheck } from "lucide-react";

// Lazy-load AuthCard to avoid heavy @privy-io/react-auth SDK compilation in dev mode
const AuthCard = dynamic(() => import("@/components/auth/AuthCard"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[320px] rounded-xl border border-border bg-card flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-[10px] text-text-muted">Loading authentication form...</p>
      </div>
    </div>
  ),
});

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_440px]">
        <section className="hidden lg:block">
          <Link href="/" className="inline-flex items-center space-x-2.5 mb-10">
            <div className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <span className="font-extrabold text-text-primary text-base tracking-wide">
              RESOLVE<span className="text-primary">IQ</span>
            </span>
          </Link>

          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary mb-5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Passwordless Customer Sign Up
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-text-primary">
              Create a support account instantly.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-text-muted">
              Get immediate access to D2C support queues. Verify with your email OTP or Google account to raise tickets across all active brands.
            </p>
          </div>
        </section>

        <div className="w-full">
          <div className="lg:hidden flex items-center justify-center space-x-2.5 mb-8">
            <div className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <span className="font-extrabold text-text-primary text-base tracking-wide">
              RESOLVE<span className="text-primary">IQ</span>
            </span>
          </div>

          <AuthCard mode="signup" />
        </div>
      </div>
    </div>
  );
}
