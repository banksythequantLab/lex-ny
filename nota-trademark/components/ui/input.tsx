import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-sm border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-base text-[var(--color-ink)] placeholder:text-[var(--color-ink-2)]/40 focus-visible:outline-none focus-visible:border-[var(--color-seal)] focus-visible:ring-2 focus-visible:ring-[var(--color-seal)]/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
