import * as React from "react";
import { cn } from "@/lib/utils";

const fieldClasses =
  "w-full rounded-xl border border-night-600 bg-night-900 px-4 py-3 text-sm text-parchment-50 placeholder:text-parchment-400 focus:border-amber-glow focus:outline-none focus:ring-2 focus:ring-amber-glow/30 disabled:cursor-not-allowed disabled:opacity-50";

const Input = React.forwardRef(({ className, type = "text", ...props }, ref) => (
  <input type={type} ref={ref} className={cn(fieldClasses, "h-11", className)} {...props} />
));
Input.displayName = "Input";

const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldClasses, "min-h-28 resize-y leading-relaxed", className)} {...props} />
));
Textarea.displayName = "Textarea";

const Badge = React.forwardRef(({ className, tone = "neutral", ...props }, ref) => {
  const tones = {
    neutral: "border-night-600 bg-night-800 text-parchment-200",
    amber: "border-amber-glow/50 bg-amber-glow/15 text-amber-soft",
    green: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
    rose: "border-rose-400/40 bg-rose-400/10 text-rose-200",
  };
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        tones[tone] || tones.neutral,
        className,
      )}
      {...props}
    />
  );
});
Badge.displayName = "Badge";

export { Input, Textarea, Badge };
