import { FileCode2 } from "lucide-react";
import { getActiveFile, useCodesense } from "@/lib/codesense/store";
import { cn } from "@/lib/utils";

export function FileTabs() {
  const files = useCodesense((s) => s.files);
  const activeFileId = useCodesense((s) => s.activeFileId);
  const setActiveFile = useCodesense((s) => s.setActiveFile);

  return (
    <div
      role="tablist"
      aria-label="Open files"
      className="flex min-w-0 items-end gap-1 overflow-x-auto px-2 pt-1"
    >
      {files.map((file) => {
        const active = file.id === activeFileId;
        return (
          <button
            key={file.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setActiveFile(file.id)}
            className={cn(
              "flex h-11 shrink-0 items-center gap-2 rounded-t-md px-3 text-sm transition-colors duration-150 md:h-9",
              active
                ? "bg-background text-foreground"
                : "text-muted hover:bg-surface-2 hover:text-foreground",
            )}
          >
            <FileCode2 className="size-3.5 opacity-70" />
            <span className="font-mono text-xs">{file.name}</span>
          </button>
        );
      })}
      <span className="sr-only">Editing {getActiveFile().name}</span>
    </div>
  );
}
