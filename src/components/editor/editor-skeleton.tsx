export function EditorSkeleton() {
  return (
    <div className="flex h-full flex-col gap-3 bg-background px-4 py-4">
      <div className="h-3 w-40 rounded-sm bg-surface-2" />
      <div className="h-3 w-5/6 rounded-sm bg-surface-2" />
      <div className="h-3 w-2/3 rounded-sm bg-surface-2" />
      <div className="h-3 w-3/4 rounded-sm bg-surface-2" />
      <div className="mt-4 h-3 w-52 rounded-sm bg-surface-2" />
      <div className="h-3 w-4/5 rounded-sm bg-surface-2" />
      <p className="mt-6 text-xs text-muted">Loading editor</p>
    </div>
  );
}
