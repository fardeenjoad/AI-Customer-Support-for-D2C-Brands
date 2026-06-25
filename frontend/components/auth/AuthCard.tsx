"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { KeyRound, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";

const privyAppId =
  process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cl00000000000000000000000";

interface AuthCardProps {
  mode: "signin" | "signup";
}

/* ── Zod schema for agent email + password (signin mode only) ── */
const loginSchema = zod.object({
  email: zod
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),
  password: zod
    .string()
    .min(6, "Password must be at least 6 characters"),
});

type LoginFormData = zod.infer<typeof loginSchema>;

/* ══════════════════════════════════════════════════════════════════
   Inner component — lives inside the single PrivyProvider
   ══════════════════════════════════════════════════════════════════ */
function AuthCardInner({ mode }: AuthCardProps) {
  const router = useRouter();
  const { login, privyLogin, isLoggingIn, isRedirecting } = useAuth();
  const {
    login: triggerPrivy,
    ready,
    authenticated,
    logout: privyLogout,
    getAccessToken,
  } = usePrivy();
  const [mockEmail, setMockEmail] = useState("");
  const isPrivyConfigured =
    process.env.NEXT_PUBLIC_PRIVY_APP_ID &&
    process.env.NEXT_PUBLIC_PRIVY_APP_ID !== "cl00000000000000000000000";
  const privyHandled = useRef(false);

  const isSignIn = mode === "signin";

  /* ── Prefetch both possible redirect targets ── */
  useEffect(() => {
    router.prefetch("/dashboard");
    router.prefetch("/portal");
  }, [router]);

  /* ── Stable reference to privyLogin to avoid re-render loops ── */
  const privyLoginRef = useRef(privyLogin);
  privyLoginRef.current = privyLogin;

  /* ── Clear Privy session if user just logged out from ResolveIQ ── */
  useEffect(() => {
    if (
      ready &&
      authenticated &&
      typeof window !== "undefined" &&
      sessionStorage.getItem("just-logged-out") === "true"
    ) {
      privyLogout();
    } else if (
      ready &&
      !authenticated &&
      typeof window !== "undefined" &&
      sessionStorage.getItem("just-logged-out") === "true"
    ) {
      sessionStorage.removeItem("just-logged-out");
    }
  }, [ready, authenticated, privyLogout]);

  /* ── Handle Privy authentication callback ── */
  useEffect(() => {
    if (!authenticated || privyHandled.current) return;
    if (
      typeof window !== "undefined" &&
      sessionStorage.getItem("just-logged-out") === "true"
    )
      return;

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

  /* ── Agent email + password form state (always initialised,
       rendered only in signin mode) ── */
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginFormData) => {
    login(data);
  };

  /* ── Redirecting spinner ── */
  if (isRedirecting) {
    return (
      <div className="w-full h-[400px] rounded-xl border border-border bg-card flex flex-col items-center justify-center gap-4 p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-xs font-medium text-text-muted">
          Opening your workspace...
        </p>
      </div>
    );
  }

  /* ── Sandbox bypass block (shared between both modes) ── */
  const sandboxBypass = !isPrivyConfigured && (
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
        {isSignIn
          ? "Enter any customer email to mock Privy login."
          : "Enter any email below to mock the customer Privy registration flow locally."}
      </p>
      <Input
        type="email"
        placeholder={
          isSignIn ? "name@customer.com" : "Enter email to mock login"
        }
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
        {isSignIn ? "Simulate Customer Sign In" : "Simulate Authentication"}
      </Button>
    </div>
  );

  return (
    <Card className="w-full animate-scaleUp">
      <CardHeader>
        <CardTitle className="text-xl font-bold font-heading">
          {isSignIn ? "Welcome back" : "Get Started"}
        </CardTitle>
        <CardDescription>
          {isSignIn
            ? "Enter your credentials to access the ResolveIQ workspace."
            : "Authenticate passwordlessly to start tracking customer tickets."}
        </CardDescription>
      </CardHeader>

      {/* ═══════ SIGN-IN mode: Privy button + sandbox + OR divider ═══════ */}
      {isSignIn ? (
        <>
          <div className="px-6 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="w-full h-10 flex items-center justify-center space-x-2 font-semibold text-xs border border-border"
              onClick={triggerPrivy}
              disabled={!ready}
            >
              <span>Sign In with Privy (Customers)</span>
            </Button>

            {sandboxBypass}

            <div className="relative flex py-3 items-center">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink mx-4 text-[9px] uppercase font-bold tracking-widest text-text-muted">
                OR (Agents / Admins)
              </span>
              <div className="flex-grow border-t border-border"></div>
            </div>
          </div>

          {/* Agent email + password form */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4 text-left">
              <Input
                type="email"
                label="Email Address"
                placeholder="name@brand.com"
                icon={<Mail />}
                error={errors.email?.message}
                {...register("email")}
              />

              <Input
                type="password"
                label="Password"
                placeholder="Enter password"
                icon={<KeyRound />}
                error={errors.password?.message}
                {...register("password")}
              />
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                variant="primary"
                className="w-full h-10"
                isLoading={isLoggingIn}
              >
                Sign In
              </Button>
              <div className="text-xs text-text-muted text-center">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="text-primary hover:underline font-semibold transition-colors"
                >
                  Register
                </Link>
              </div>
            </CardFooter>
          </form>
        </>
      ) : (
        /* ═══════ SIGN-UP mode: Privy-only flow ═══════ */
        <>
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

            {sandboxBypass}
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <div className="text-xs text-text-muted text-center">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary hover:underline font-semibold transition-colors"
              >
                Sign In
              </Link>
            </div>
          </CardFooter>
        </>
      )}
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Outer wrapper — the ONLY PrivyProvider in the entire application
   ══════════════════════════════════════════════════════════════════ */
export default function AuthCard({ mode }: AuthCardProps) {
  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ["email", "google"],
        appearance: {
          theme: "light",
          accentColor: "#6366f1",
        },
        embeddedWallets: {
          createOnLogin: "off",
        },
      }}
    >
      <AuthCardInner mode={mode} />
    </PrivyProvider>
  );
}
