import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-[background-color,color,box-shadow,transform,opacity] duration-150 ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:not-disabled:scale-[0.96]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-border hover:bg-primary/90",
        secondary:
          "bg-surface-2 text-foreground shadow-border hover:bg-surface-2/80",
        outline:
          "bg-transparent text-foreground shadow-border hover:bg-surface-2",
        ghost: "bg-transparent text-muted hover:bg-surface-2 hover:text-foreground",
        accent: "bg-accent text-accent-foreground hover:bg-accent/90",
        destructive: "bg-destructive/15 text-destructive hover:bg-destructive/25",
      },
      size: {
        default: "h-11 px-3.5 text-sm md:h-9",
        sm: "h-11 px-3 text-sm md:h-8 md:px-2.5 md:text-xs",
        lg: "h-11 px-4 text-sm",
        icon: "size-11 md:size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
