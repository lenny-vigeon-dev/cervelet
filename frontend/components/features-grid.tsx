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
          Fonctionnalités
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-zinc-300">
          {[
            "Placement de pixels en temps réel",
            "Palette de couleurs & Toolbar",
            "Zoom & Pan fluide (style r/place)",
            "Authentification Discord",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-brand"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
