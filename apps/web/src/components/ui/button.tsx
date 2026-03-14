import type { VariantProps } from "class-variance-authority";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva } from "class-variance-authority";

import { useAppSound } from "@/hooks/use-app-sound";
import { select008Sound } from "@/lib/select-008";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-full border border-transparent bg-clip-padding text-[0.7rem] font-semibold uppercase tracking-[0.22em] focus-visible:ring-2 aria-invalid:ring-1 [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-300 ease-out disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-primary to-[oklch(0.72_0.1_72)] text-primary-foreground shadow-[0_8px_24px_rgba(218,185,100,0.2),inset_0_1px_0_rgba(255,255,255,0.15)] hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(218,185,100,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] active:translate-y-0 active:shadow-[0_4px_12px_rgba(218,185,100,0.15)]",
        outline:
          "border-white/[0.08] bg-white/[0.03] text-foreground hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-white/[0.06] dark:bg-input/20 dark:border-input/60 dark:hover:bg-input/40 aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:-translate-y-0.5 hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "border-transparent hover:bg-white/[0.05] hover:text-foreground dark:hover:bg-muted/40 aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "bg-destructive/12 border-destructive/15 hover:-translate-y-0.5 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/25",
        link: "text-primary/80 tracking-[0.14em] underline-offset-4 hover:underline hover:text-primary",
      },
      size: {
        default:
          "h-10 gap-1.5 px-5 has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5",
        xs: "h-7 gap-1 px-2.5 text-[0.62rem] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3.5 text-[0.65rem] has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-1.5 px-6 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-8",
        "icon-xs": "size-6 rounded-none [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-none",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface AppButtonProps extends ButtonPrimitive.Props, VariantProps<typeof buttonVariants> {
  soundOnHover?: boolean;
}

function Button({
  className,
  variant = "default",
  size = "default",
  soundOnHover = true,
  onMouseEnter,
  disabled,
  ...props
}: AppButtonProps) {
  const playHoverSound = useAppSound(select008Sound, { volumeMultiplier: 0.1 });

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
      disabled={disabled}
      onMouseEnter={(event) => {
        if (soundOnHover && !disabled) {
          playHoverSound();
        }
        onMouseEnter?.(event);
      }}
    />
  );
}

export { Button };
