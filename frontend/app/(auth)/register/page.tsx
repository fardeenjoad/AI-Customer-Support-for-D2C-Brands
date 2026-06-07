"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Terminal, KeyRound, Mail, Building } from "lucide-react";

const registerSchema = zod.object({
  email: zod.string().min(1, "Email is required").email("Invalid email address"),
  password: zod.string().min(6, "Password must be at least 6 characters"),
  brand_id: zod.string().min(1, "Scoping D2C brand selection is required"),
});

type RegisterFormData = zod.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register: signup, isRegistering } = useAuth();
  const { useBrands } = useAnalytics();
  const { data: brandsRes, isLoading: isLoadingBrands } = useBrands({ limit: 100 });
  const brands = brandsRes?.data || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      brand_id: "",
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    signup(data);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 radial-bg relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center space-x-2.5 mb-8 select-none">
        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-glow">
          <Terminal className="h-5 w-5 text-glow" />
        </div>
        <span className="font-bold text-text-primary text-base font-heading tracking-wider">
          RESOLVE<span className="text-accent">IQ</span>
        </span>
      </div>

      <Card className="w-full max-w-md animate-scaleUp z-10">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold font-heading">
            Create Account
          </CardTitle>
          <CardDescription>
            Register to join a brand queue and begin managing customer tickets
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] text-text-muted font-bold tracking-wider uppercase pl-0.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-text-muted" />
                <input
                  type="email"
                  placeholder="name@brand.com"
                  className="flex h-10 w-full rounded-lg border border-border bg-surface pl-10 pr-3 py-2 text-sm text-text-primary placeholder-text-muted transition-all duration-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <span className="text-xs text-danger font-medium pl-0.5">
                  {errors.email.message}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-text-muted font-bold tracking-wider uppercase pl-0.5">
                Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3.5 h-4 w-4 text-text-muted" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="flex h-10 w-full rounded-lg border border-border bg-surface pl-10 pr-3 py-2 text-sm text-text-primary placeholder-text-muted transition-all duration-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <span className="text-xs text-danger font-medium pl-0.5">
                  {errors.password.message}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-text-muted font-bold tracking-wider uppercase pl-0.5">
                D2C Brand Configuration
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-3.5 h-4 w-4 text-text-muted z-10" />
                <select
                  className="flex h-10 w-full rounded-lg border border-border bg-surface pl-10 pr-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 cursor-pointer appearance-none"
                  {...register("brand_id")}
                >
                  <option value="">Select a brand configuration...</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.brand_name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.brand_id && (
                <span className="text-xs text-danger font-medium pl-0.5">
                  {errors.brand_id.message}
                </span>
              )}
              {isLoadingBrands && (
                <span className="text-[10px] text-primary font-medium animate-pulse pl-0.5">
                  Loading brand configurations...
                </span>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              variant="primary"
              className="w-full h-10 font-medium"
              isLoading={isRegistering}
            >
              Register Account
            </Button>
            <div className="text-xs text-text-muted text-center">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:text-accent font-semibold transition-colors">
                Sign In
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
