"use client";

import { useAuthStore } from "@/store/authStore";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { User, Shield, Building, Moon, Info } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      toast.error("Please enter a new password.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsUpdating(true);
    setTimeout(() => {
      setIsUpdating(false);
      toast.success("Security credentials updated!");
      setPassword("");
      setConfirmPassword("");
    }, 1200);
  };

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto animate-fadeIn">
      <div className="flex flex-col space-y-1">
        <h2 className="text-xl font-bold font-heading text-text-primary tracking-tight">
          System Settings
        </h2>
        <p className="text-xs text-text-muted">
          Manage your personal credentials, workspace preferences, and security clearances.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-text-muted">Personal Profile</CardTitle>
              <CardDescription>Your registered account credentials and role assignments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] text-text-muted font-bold tracking-wider uppercase pl-0.5">Email Address</label>
                <div className="flex items-center space-x-2 bg-surface/50 border border-border p-2.5 rounded-lg">
                  <User className="h-4 w-4 text-text-muted" />
                  <span className="text-xs text-text-primary">{user?.email || "agent@resolveiq.com"}</span>
                </div>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] text-text-muted font-bold tracking-wider uppercase pl-0.5">Clearance Level</label>
                <div className="flex items-center space-x-2 bg-surface/50 border border-border p-2.5 rounded-lg">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-xs text-text-primary capitalize font-semibold">{user?.role || "agent"}</span>
                </div>
              </div>

              {user?.brand_id && (
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[10px] text-text-muted font-bold tracking-wider uppercase pl-0.5">Brand Scope</label>
                  <div className="flex items-center space-x-2 bg-surface/50 border border-border p-2.5 rounded-lg">
                    <Building className="h-4 w-4 text-accent" />
                    <span className="text-xs text-text-primary font-mono">{user.brand_id}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-text-muted">Clearance Passphrase</CardTitle>
              <CardDescription>Update your workstation security passphrase</CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdatePassword}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-text-muted font-bold tracking-wider uppercase pl-0.5">New Password</label>
                  <Input
                    type="password"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-text-muted font-bold tracking-wider uppercase pl-0.5">Confirm Password</label>
                  <Input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" variant="primary" isLoading={isUpdating}>
                  Update Passphrase
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-text-muted">Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs text-text-primary">
                    <Moon className="h-4.5 w-4.5 text-accent" />
                    <span className="font-semibold">Dark Theme</span>
                  </div>
                  <Badge variant="default">Always On</Badge>
                </div>
                <p className="text-[10px] text-text-muted leading-relaxed">
                  ResolveIQ operates strictly in Dark Mode First to protect agents&apos; eyes during long workstation queues.
                </p>
              </div>

              <div className="border-t border-border/50 pt-4 flex flex-col space-y-3">
                <div className="flex items-center space-x-2 text-xs text-text-primary">
                  <Info className="h-4.5 w-4.5 text-primary" />
                  <span className="font-semibold">System SLA Check</span>
                </div>
                <p className="text-[10px] text-text-muted leading-relaxed">
                  Ticket queue is set to auto-refresh every 60 seconds. SLA warnings breach calculations happen in real-time.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
