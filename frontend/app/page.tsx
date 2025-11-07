import Link from "next/link";
import { PixelCanvas } from "@/components/pixel-canvas";
import { Toolbar } from "@/components/toolbar";
import { ApiError, API_URL } from "@/lib/api";
import { fetchCanvasSnapshot, fetchCanvasSummary } from "@/lib/canvas";
import { fetchSession } from "@/lib/session";
import type { CanvasSnapshot, CanvasSummary } from "@/types/canvas";
import type { SessionState } from "@/types/session";

// Revalidate canvas data every 30 seconds for better performance
// while keeping it relatively fresh for collaborative updates
export const revalidate = 30;

async function safeFetch<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(
        `API request to ${error.request.method} ${error.request.path} failed with ${error.status}`,
        error.body
      );
      return null;
    }
    console.error("Unexpected error while calling API", error);
    return null;
  }
}

export default async function HomePage() {
  const [session, snapshot, summary] = (await Promise.all([
    fetchSession(),
    safeFetch(() => fetchCanvasSnapshot()),
    safeFetch(() => fetchCanvasSummary()),
  ])) as [SessionState, CanvasSnapshot | null, CanvasSummary | null];

  const isAuthenticated = session.isAuthenticated;
  const apiReachable = snapshot !== null || summary !== null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12">
      <header className="flex flex-col gap-5">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand/40 bg-brand/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-brand">
          Pixelhub
        </span>
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          Construis un canvas collaboratif temps réel propulsé par ton backend
          serverless.
        </h1>
        <p className="max-w-2xl text-pretty text-lg text-zinc-300">
          Cette base Next.js (App Router) se connecte à une API Gateway externe
          via{" "}
          <code className="rounded border border-white/10 bg-black/70 px-1.5 py-0.5 font-mono text-sm text-brand-soft">
            NEXT_PUBLIC_API_URL
          </code>
          . Les appels sont centralisés dans{" "}
          <code className="rounded border border-white/10 bg-black/70 px-1.5 py-0.5 font-mono text-sm text-brand-soft">
            lib/api.ts
          </code>
          et prêts pour Discord OAuth2.
        </p>
      </header>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Toolbar session={session} />
          <PixelCanvas snapshot={snapshot ?? undefined} />
        </div>
        <aside className="flex flex-col gap-6">
          <div className="rounded-3xl border border-brand/25 bg-canvas-surface/90 p-6 shadow-surface backdrop-blur">
            <h2 className="text-xl font-semibold text-brand-soft">
              Statut API Gateway
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Exemple d’appel réalisé côté serveur lors du rendu initial.
            </p>
            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-zinc-500">Endpoint</dt>
                <dd className="font-medium text-foreground">{API_URL}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-zinc-500">Canvas snapshot</dt>
                <dd className="font-medium text-foreground">
                  {snapshot ? "OK" : "Indisponible"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-zinc-500">Users connectés</dt>
                <dd className="font-medium text-foreground">
                  {summary?.activeUsers ?? "N/A"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-zinc-500">Cooldown (s)</dt>
                <dd className="font-medium text-foreground">
                  {summary?.cooldownSeconds ?? "N/A"}
                </dd>
              </div>
            </dl>
            {!apiReachable && (
              <p className="mt-4 rounded-2xl border border-brand/30 bg-black/70 p-4 text-xs text-brand-soft shadow-inner shadow-brand/20">
                Impossible de joindre l’API pour le moment. Vérifie{" "}
                <code className="rounded border border-white/10 bg-black/70 px-1 py-0.5 font-mono text-brand-soft">
                  NEXT_PUBLIC_API_URL
                </code>{" "}
                et que Gateway répond.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-brand/25 bg-canvas-surface/90 p-6 shadow-surface backdrop-blur">
            <h2 className="text-xl font-semibold text-brand-soft">
              Authentification Discord
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Direction l’API Gateway pour gérer l’OAuth2. Ce front ne stocke
              que l’état local utilisateur.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/auth/discord"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand to-brand-strong px-5 py-2.5 text-sm font-semibold text-black shadow-brand transition hover:opacity-95"
              >
                {isAuthenticated
                  ? `Connecté en tant que ${session.user.username}`
                  : "Se connecter avec Discord"}
              </Link>
              {!isAuthenticated && (
                <p className="text-xs text-zinc-400">
                  Le callback OAuth est géré par l’API Gateway qui renvoie un
                  cookie de session. Les requêtes fetch incluent automatiquement
                  les cookies.
                </p>
              )}
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-6 rounded-3xl border border-brand/20 bg-black/60 p-8 shadow-surface backdrop-blur md:grid-cols-3">
        <div>
          <h3 className="text-lg font-semibold text-brand-soft">
            Librairies principales
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-zinc-300">
            <li>Next.js 16 · React 19 · Turbopack</li>
            <li>TypeScript strict · ESLint</li>
            <li>Tailwind CSS v4</li>
          </ul>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-brand-soft">
            Plan de synchronisation
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-zinc-300">
            <li>
              Polling périodique via{" "}
              <code className="rounded border border-white/10 bg-black/70 px-1 py-0.5 font-mono text-brand-soft">
                /canvas
              </code>
            </li>
            <li>
              Option SSE via{" "}
              <code className="rounded border border-white/10 bg-black/70 px-1 py-0.5 font-mono text-brand-soft">
                /canvas/stream
              </code>
            </li>
            <li>Gestion centralisée des erreurs</li>
          </ul>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-brand-soft">
            Étapes suivantes
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-zinc-300">
            <li>Brancher les mutations (place pixel)</li>
            <li>Ajouter la Toolbar &amp; palettes</li>
            <li>Visualiser les utilisateurs connectés</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
