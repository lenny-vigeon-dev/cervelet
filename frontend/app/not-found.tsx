import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="bg-gradient-to-r from-brand via-brand-strong to-brand bg-clip-text text-8xl font-bold text-transparent">
          404
        </h1>
        <h2 className="text-2xl font-semibold text-brand-soft">
          Page introuvable
        </h2>
        <p className="max-w-md text-sm text-zinc-400">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand to-brand-strong px-6 py-3 text-sm font-semibold text-black shadow-brand transition hover:opacity-90"
      >
        Retour à l'accueil
      </Link>
    </div>
  );
}
