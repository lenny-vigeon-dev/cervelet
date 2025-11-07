"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-brand/10 p-4">
          <svg
            className="h-12 w-12 text-brand"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-brand-soft">
          Une erreur est survenue
        </h2>
        <p className="max-w-md text-sm text-zinc-400">
          {error.message || "Une erreur inattendue s'est produite."}
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-zinc-500">ID: {error.digest}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand to-brand-strong px-6 py-3 text-sm font-semibold text-black shadow-brand transition hover:opacity-90"
      >
        Réessayer
      </button>
    </div>
  );
}
