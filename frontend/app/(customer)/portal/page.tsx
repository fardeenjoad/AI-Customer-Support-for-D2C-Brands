"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Lazy-load PortalContent to prevent heavy components and layout compilation from blocking the dev entry point
const PortalContent = dynamic(() => import("@/components/portal/PortalContent"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-background dark:bg-[#0b0c10] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  ),
});

export default function CustomerPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background dark:bg-[#0b0c10] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <PortalContent />
    </Suspense>
  );
}
