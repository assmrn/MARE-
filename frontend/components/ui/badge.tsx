import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground border-border",
        primary: "bg-primary-muted text-primary border-transparent",
        success: "bg-success-muted text-success border-transparent",
        warning: "bg-warning-muted text-warning border-transparent",
        destructive: "bg-destructive-muted text-destructive border-transparent",
        outline: "bg-transparent text-muted-foreground border-border",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "size-1.5 rounded-full",
            variant === "success" && "bg-success",
            variant === "warning" && "bg-warning",
            variant === "destructive" && "bg-destructive",
            variant === "primary" && "bg-primary",
            (!variant || variant === "default" || variant === "outline") && "bg-muted-foreground"
          )}
        />
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
