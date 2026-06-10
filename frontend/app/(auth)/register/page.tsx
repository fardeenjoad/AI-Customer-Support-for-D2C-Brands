"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { Building, KeyRound, LifeBuoy, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

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
              Brand-scoped account access
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-text-primary">
              Create an account and join the right brand queue.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-text-muted">
              New teammates can be scoped to a D2C brand configuration so tickets, FAQs, and AI response settings stay organized.
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
              <CardTitle className="text-xl font-bold">Create account</CardTitle>
              <CardDescription>
                Register to begin managing customer support tickets.
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

                <Select
                  label="D2C Brand Configuration"
                  icon={<Building />}
                  error={errors.brand_id?.message}
                  {...register("brand_id")}
                >
                  <option value="">Select a brand configuration...</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.brand_name}
                    </option>
                  ))}
                </Select>
                {isLoadingBrands && (
                  <div className="text-[10px] text-primary font-medium animate-pulse pl-0.5">
                    Loading brand configurations...
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex flex-col space-y-4">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full h-10"
                  isLoading={isRegistering}
                >
                  Register Account
                </Button>
                <div className="text-xs text-text-muted text-center">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline font-semibold transition-colors">
                    Sign In
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
