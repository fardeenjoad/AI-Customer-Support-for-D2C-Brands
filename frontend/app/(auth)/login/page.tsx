"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { LifeBuoy, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const loginSchema = zod.object({
  email: zod.string().min(1, "Email is required").email("Invalid email address"),
  password: zod.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = zod.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoggingIn, isRedirecting } = useAuth();

  useEffect(() => {
    router.prefetch("/dashboard");
    router.prefetch("/portal");
  }, [router]);

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

  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-xs font-medium text-text-muted">Opening your workspace...</p>
      </div>
    );
  }

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
              Secure agent workspace
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-text-primary">
              Sign in to manage queues, conversations, and escalations.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-text-muted">
              ResolveIQ gives support teams a clean command center for AI-assisted replies, sentiment routing, and customer follow-up.
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
              <CardTitle className="text-xl font-bold">Welcome back</CardTitle>
              <CardDescription>
                Enter your credentials to access the ResolveIQ workspace.
              </CardDescription>
            </CardHeader>

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
                  <Link href="/register" className="text-primary hover:underline font-semibold transition-colors">
                    Create Account
                  </Link>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
