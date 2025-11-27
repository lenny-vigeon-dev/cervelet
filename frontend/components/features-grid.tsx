/**
 * Grid displaying the main features and tech stack of the application.
 * Shows libraries, synchronization plan, and next steps.
 */
export function FeaturesGrid() {
  return (
    <section className="grid gap-6 rounded-3xl border border-brand/20 bg-surface/60 p-8 shadow-surface backdrop-blur md:grid-cols-3">
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
            <code className="rounded border border-white/10 bg-surface/70 px-1 py-0.5 font-mono text-brand-soft">
              /canvas
            </code>
          </li>
          <li>
            Option SSE via{" "}
            <code className="rounded border border-white/10 bg-surface/70 px-1 py-0.5 font-mono text-brand-soft">
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
  );
}
