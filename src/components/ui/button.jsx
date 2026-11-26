import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-glow focus-visible:ring-offset-2 focus-visible:ring-offset-night-950 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-amber-glow text-night-950 shadow-glow hover:bg-amber-soft",
        secondary:
          "border border-night-600 bg-night-800 text-parchment-100 hover:bg-night-700",
        ghost: "text-parchment-200 hover:bg-night-800 hover:text-parchment-50",
        outline:
          "border border-night-600 bg-transparent text-parchment-100 hover:bg-night-800",
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "h-11 px-5",
        lg: "h-12 px-7 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

const Button = React.forwardRef(({ className, variant, size, type = "button", ...props }, ref) => (
  <button type={type} ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = "Button";

export { Button, buttonVariants };
