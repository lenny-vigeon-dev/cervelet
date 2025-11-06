export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-canvas-border border-t-sky-500" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Chargement...
        </p>
      </div>
    </div>
  );
}
