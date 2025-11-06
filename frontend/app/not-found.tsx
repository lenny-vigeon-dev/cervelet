import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-8xl font-bold text-sky-500">404</h1>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Page introuvable
        </h2>
        <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-400"
      >
        Retour à l'accueil
      </Link>
    </div>
  );
}
