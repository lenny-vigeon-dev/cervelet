import { PixelCanvas } from "@/components/pixel-canvas";
import { ToolbarWrapper } from "@/components/toolbar-wrapper";
import { APIStatusCard } from "@/components/api-status-card";
import { AuthCard } from "@/components/auth-card";
import { FeaturesGrid } from "@/components/features-grid";
import { fetchCanvasSnapshot, fetchCanvasSummary } from "@/lib/canvas";
import { safeFetch } from "@/hooks/use-safe-fetch";
import type { CanvasSnapshot, CanvasSummary } from "@/types/canvas";

// Revalidate canvas data every 30 seconds for better performance
// while keeping it relatively fresh for collaborative updates
export const revalidate = 30;

export default async function HomePage() {
  const [snapshot, summary] = (await Promise.all([
    safeFetch(() => fetchCanvasSnapshot()),
    safeFetch(() => fetchCanvasSummary()),
  ])) as [CanvasSnapshot | null, CanvasSummary | null];

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
          <ToolbarWrapper />
          <PixelCanvas snapshot={snapshot ?? undefined} />
        </div>
        <aside className="flex flex-col gap-6">
          <APIStatusCard snapshot={snapshot} summary={summary} />
          <AuthCard />
        </aside>
      </section>

      <FeaturesGrid />
    </main>
  );
}
