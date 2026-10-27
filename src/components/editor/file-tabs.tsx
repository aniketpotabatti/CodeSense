import { FileCode2, FileJson } from "lucide-react";
import { getActiveFile, useCodesense } from "@/lib/codesense/store";
import { cn } from "@/lib/utils";

const LANGUAGE_ICONS: Record<string, React.ElementType> = {
  json: FileJson,
};

const LANGUAGE_COLORS: Record<string, string> = {
  typescript: "text-blue-400",
  javascript: "text-yellow-400",
  python: "text-blue-600",
  go: "text-cyan-400",
  rust: "text-orange-400",
  java: "text-amber-500",
};

function LanguageIcon({
  language,
  active,
}: {
  language: string;
  active: boolean;
}) {
  const Icon = LANGUAGE_ICONS[language] ?? FileCode2;
  const color = active
    ? "text-foreground"
    : LANGUAGE_COLORS[language] ?? "text-muted opacity-70";
  return <Icon className={cn("size-3.5 shrink-0", color)} />;
}

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
            aria-label={`${file.name} (${file.language})`}
            onClick={() => setActiveFile(file.id)}
            className={cn(
              "flex h-11 shrink-0 items-center gap-2 rounded-t-md px-3 text-sm transition-colors duration-150 md:h-9 border-b-2 border-transparent",
              active
                ? "bg-background text-foreground border-accent"
                : "text-muted hover:bg-surface-2 hover:text-foreground",
            )}
          >
            <LanguageIcon language={file.language} active={active} />
            <span className="font-mono text-xs">{file.name}</span>
          </button>
        );
      })}
      <span className="sr-only">Editing {getActiveFile().name}</span>
    </div>
  );
}
