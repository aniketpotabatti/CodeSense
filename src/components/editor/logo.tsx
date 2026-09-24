import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className="flex size-8 items-center justify-center rounded-xl bg-[#13151b] border border-[#232733] shadow-[0_2px_8px_rgba(0,0,0,0.35)] text-[#00e5ff]"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="8 7 3 12 8 17" />
          <polyline points="16 7 21 12 16 17" />
        </svg>
      </span>
      <span className="font-sans text-[15px] font-bold tracking-tight select-none">
        <span className="text-white">Code</span>
        <span className="text-[#00e5ff]">Sense</span>
      </span>
    </div>
  );
}
