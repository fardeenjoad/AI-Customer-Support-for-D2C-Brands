import * as React from "react";
import NextLink, { LinkProps as NextLinkProps } from "next/link";
import { cn } from "@/lib/utils";

export interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">, NextLinkProps {
  variant?: "primary" | "secondary" | "muted";
  underline?: "none" | "hover" | "always";
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, variant = "primary", underline = "hover", href, ...props }, ref) => {
    return (
      <NextLink
        ref={ref}
        href={href}
        className={cn(
          "inline-flex items-center gap-1.5 font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm",
          {
            "text-primary hover:text-primary/80": variant === "primary",
            "text-text-primary hover:text-primary": variant === "secondary",
            "text-text-muted hover:text-text-primary": variant === "muted",
            "hover:underline": underline === "hover",
            "underline": underline === "always",
            "no-underline": underline === "none",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Link.displayName = "Link";

export { Link };
