import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({
  className,
  children,
  side = "right",
  title,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  side?: "right" | "bottom";
  title: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/70 data-[state=open]:animate-in data-[state=closed]:animate-out" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col bg-surface shadow-border",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          side === "right"
            ? "inset-y-0 right-0 h-full w-full max-w-md rounded-l-xl"
            : "inset-x-0 bottom-0 max-h-[85vh] rounded-t-xl",
          className,
        )}
        {...props}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <DialogPrimitive.Title className="text-sm font-semibold tracking-tight">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close asChild>
            <Button variant="ghost" size="icon" aria-label="Close">
              <X className="size-4" />
            </Button>
          </DialogPrimitive.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
