"use client";

import { useCallback, useEffect, useRef } from "react";
import { DiffEditor, loader, type DiffOnMount } from "@monaco-editor/react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { editor as MonacoEditorNs } from "monaco-editor";

const MONACO_VS =
  "https://cdn.jsdelivr.net/npm/monaco-editor@0.56.0/min/vs";

if (typeof window !== "undefined") {
  loader.config({ paths: { vs: MONACO_VS } });
}

interface RefactorDiffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  original: string;
  modified: string;
  language: string;
  onApply: (content: string) => void;
}

export function RefactorDiffDialog({
  open,
  onOpenChange,
  original,
  modified,
  language,
  onApply,
}: RefactorDiffDialogProps) {
  const editorRef = useRef<MonacoEditorNs.IStandaloneDiffEditor | null>(null);

  const handleMount: DiffOnMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  const handleApply = useCallback(() => {
    const model = editorRef.current?.getModifiedEditor()?.getModel();
    if (!model) return;
    onApply(model.getValue());
    onOpenChange(false);
  }, [onApply, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="w-full max-w-[95vw] max-h-[90vh] bg-surface border border-border rounded-lg shadow-xl flex flex-col"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">
              Apply Refactor
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              aria-label="Close refactor dialog"
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <DiffEditor
              original={original}
              modified={modified}
              language={language}
              height="100%"
              width="100%"
              onMount={handleMount}
              options={{
                originalEditable: false,
                renderSideBySide: true,
              }}
            />
          </div>
          <div className="border-t border-border px-4 py-3 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleApply}
              disabled={!editorRef.current}
            >
              Apply Refactor
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}