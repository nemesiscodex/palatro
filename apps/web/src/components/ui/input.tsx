import { Input as InputPrimitive } from "@base-ui/react/input";
import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "dark:bg-input/25 border-white/[0.08] focus-visible:border-primary/40 focus-visible:ring-primary/20 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:bg-input/50 dark:disabled:bg-input/80 h-11 rounded-full border bg-white/[0.03] px-5 py-1 text-sm transition-all duration-200 file:h-6 file:text-xs file:font-medium focus-visible:ring-2 aria-invalid:ring-1 md:text-sm file:text-foreground placeholder:text-muted-foreground/50 w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
