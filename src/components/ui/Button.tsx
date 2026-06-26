import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "outline" | "success" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 focus-visible:ring-brand-500",
  secondary:
    "bg-slate-800 text-white shadow-sm hover:bg-slate-700 active:bg-slate-900 focus-visible:ring-slate-500",
  outline:
    "border-2 border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-brand-500",
  success:
    "border-2 border-green-400 bg-white text-green-800 shadow-sm hover:border-green-500 hover:bg-green-100 active:bg-green-200 focus-visible:ring-green-500",
  danger:
    "bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500",
  ghost:
    "text-slate-700 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-brand-500",
};

const sizes: Record<Size, string> = {
  sm: "min-h-11 px-4 py-2 text-sm",
  md: "min-h-11 px-5 py-2.5 text-base",
  lg: "min-h-12 px-6 py-3 text-base sm:text-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
