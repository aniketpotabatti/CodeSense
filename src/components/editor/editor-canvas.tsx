import { useEffect, useState, type ComponentType } from "react";
import { EditorSkeleton } from "./editor-skeleton";

export function EditorCanvas() {
  const [Pane, setPane] = useState<ComponentType | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("./monaco-pane").then((mod) => {
      if (!cancelled) setPane(() => mod.MonacoPane);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Pane) return <EditorSkeleton />;
  return <Pane />;
}
