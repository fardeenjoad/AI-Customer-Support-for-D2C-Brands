"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePrivy } from "@privy-io/react-auth";
import { LifeBuoy, ShieldCheck, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const { privyLogin, isLoggingIn } = useAuth();
  const { login: triggerPrivy, ready, authenticated, logout: privyLogout, getAccessToken } = usePrivy();
  const [mockEmail, setMockEmail] = useState("");
  const isPrivyConfigured = process.env.NEXT_PUBLIC_PRIVY_APP_ID && process.env.NEXT_PUBLIC_PRIVY_APP_ID !== "cl00000000000000000000000";
  const privyHandled = useRef(false);

  // Stable reference to avoid re-render loops
  const privyLoginRef = useRef(privyLogin);
  privyLoginRef.current = privyLogin;

  // Clear Privy session if user just logged out from ResolveIQ
  useEffect(() => {
    if (ready && authenticated && typeof window !== "undefined" && sessionStorage.getItem("just-logged-out") === "true") {
      privyLogout();
    } else if (ready && !authenticated && typeof window !== "undefined" && sessionStorage.getItem("just-logged-out") === "true") {
      sessionStorage.removeItem("just-logged-out");
    }
  }, [ready, authenticated, privyLogout]);

  useEffect(() => {
    if (!authenticated || privyHandled.current) return;
    if (typeof window !== "undefined" && sessionStorage.getItem("just-logged-out") === "true") return;

    const handlePrivyAuth = async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          privyHandled.current = true;
          privyLoginRef.current({ token });
        }
      } catch (error) {
        console.error("Failed to get Privy access token:", error);
      }
    };
    handlePrivyAuth();
  }, [authenticated, getAccessToken]);

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

          <Card className="w-full animate-scaleUp">
            <CardHeader>
              <CardTitle className="text-xl font-bold font-heading">Get Started</CardTitle>
              <CardDescription>
                Authenticate passwordlessly to start tracking customer tickets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                type="button"
                variant="primary"
                className="w-full h-11 flex items-center justify-center space-x-2 bg-primary hover:bg-primary-hover text-white font-semibold shadow-lg shadow-primary/10"
                onClick={triggerPrivy}
                disabled={!ready || isLoggingIn}
                isLoading={isLoggingIn}
              >
                <span>Register with Privy (Email/Google)</span>
              </Button>

              {!isPrivyConfigured && (
                <div className="mt-4 p-4 border border-dashed border-amber-500/30 rounded-lg bg-amber-500/5 space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                      Sandbox Bypass Mode
                    </span>
                    <span className="text-[9px] text-text-muted">
                      No Privy App ID detected
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-normal">
                    Enter any email below to mock the customer Privy registration flow locally.
                  </p>
                  <Input
                    type="email"
                    placeholder="Enter email to mock login"
                    icon={<Mail className="h-4 w-4 text-text-muted" />}
                    value={mockEmail}
                    onChange={(e) => setMockEmail(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full h-9 text-xs border border-amber-500/20 text-amber-500 hover:bg-amber-500/10 font-semibold"
                    disabled={!mockEmail.includes("@") || isLoggingIn}
                    onClick={() => {
                      if (mockEmail) {
                        privyLogin({ token: mockEmail });
                      }
                    }}
                    isLoading={isLoggingIn}
                  >
                    Simulate Authentication
                  </Button>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <div className="text-xs text-text-muted text-center">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline font-semibold transition-colors">
                  Sign In
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
