import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className="flex size-7 items-center justify-center rounded-md bg-surface-2 text-accent shadow-border"
      >
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none">
          <path
            d="M6 3.5 2.75 8 6 12.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 3.5 13.25 8 10 12.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.7"
          />
        </svg>
      </span>
      <span className="font-sans text-sm font-semibold tracking-tight">
        Code<span className="text-accent">Sense</span>
      </span>
    </div>
  );
}
