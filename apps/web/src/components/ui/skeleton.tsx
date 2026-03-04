import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-white/[0.04] rounded-xl animate-pulse", className)}
      {...props}
    />
  );
}

export { Skeleton };
