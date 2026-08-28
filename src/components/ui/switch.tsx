import * as SwitchPrimitive from "@radix-ui/react-switch";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Switch({
  className,
  ...props
}: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-6 w-10 shrink-0 items-center rounded-full shadow-border transition-colors duration-150",
        "data-[state=checked]:bg-accent data-[state=unchecked]:bg-surface-2",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-foreground shadow-sm",
          "transition-transform duration-150 ease-out",
          "data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0.5",
          "data-[state=checked]:bg-accent-foreground",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
