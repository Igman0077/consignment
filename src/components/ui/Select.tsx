import { cn } from "@/lib/utils";
import { SelectHTMLAttributes, forwardRef, ReactNode } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, hint, id, children, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-semibold text-slate-700">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base transition-all duration-150 hover:border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {hint && <p className="text-sm text-slate-500">{hint}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
