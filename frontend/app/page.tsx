import { PixelCanvas } from "@/components/pixel-canvas";
import { APIStatusCard } from "@/components/api-status-card";
import { AuthCard } from "@/components/auth-card";
import { FeaturesGrid } from "@/components/features-grid";
// import { fetchCanvasSnapshot, fetchCanvasSummary } from "@/lib/canvas";
// import { safeFetch } from "@/hooks/use-safe-fetch";
import type { CanvasSnapshot, CanvasSummary } from "@/types/canvas";
import Link from "next/link";
import Image from "next/image";

// Revalidate canvas data every 30 seconds for better performance
// while keeping it relatively fresh for collaborative updates
export const revalidate = 30;

export default async function HomePage() {
  // Temporarily disabled: backend endpoints /canvas and /canvas/summary don't exist yet
  // Canvas is now loaded via real-time hook (Cloud Storage snapshot + Firestore)
  const snapshot: CanvasSnapshot | null = null;
  const summary: CanvasSummary | null = null;

  // const [snapshot, summary] = (await Promise.all([
  //   safeFetch(() => fetchCanvasSnapshot()),
  //   safeFetch(() => fetchCanvasSummary()),
  // ])) as [CanvasSnapshot | null, CanvasSummary | null];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12">
      <header className="relative flex flex-col gap-6">
        <div className="pointer-events-none absolute -top-24 -left-20 -z-10 h-64 w-64 rounded-full bg-brand/20 blur-3xl md:h-96 md:w-96" />
        
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand/40 bg-brand/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-brand">
          <Image 
            src="/favicon.ico" 
            alt="Logo" 
            width={50} 
            height={50} 
            className="opacity-90 rounded-full"
          />
          Pixelhub
        </span>

        <div className="grid gap-12 md:grid-cols-2">
          <div className="flex flex-col gap-5 justify-center">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              L'expérience collaborative ultime, propulsée par le Cloud.
            </h1>
            <p className="text-pretty text-lg text-zinc-300">
              Pixelhub est une plateforme de pixel art massivement multijoueur conçue pour la performance.
              Profitez d'une synchronisation temps réel fluide et d'une interface immersive, le tout soutenu par une architecture Serverless moderne et scalable.
            </p>
          </div>

          <div className="w-full">
            <AuthCard />
          </div>
        </div>
      </header>

      <section className="flex flex-col gap-8">
        <div className="relative group aspect-square w-full">
          <PixelCanvas snapshot={snapshot ?? undefined} className="w-full h-full" />
          <Link
            href="/canva"
            className="absolute inset-0 flex items-center justify-center bg-surface/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          >
            <div className="flex flex-col items-center gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-brand"
              >
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
              <span className="text-brand font-semibold text-lg">Ouvrir en plein écran</span>
            </div>
          </Link>
        </div>
      </section>

      <FeaturesGrid />

      <footer className="mt-12 flex flex-col items-center justify-between gap-6 border-t border-brand/20 pt-8 text-sm text-zinc-400 md:flex-row">
        <div className="flex items-center gap-2">
          <Image 
            src="/favicon.ico" 
            alt="Cervelet Logo" 
            width={20} 
            height={20} 
            className="opacity-80 rounded-full"
          />
          <span>
            Propulsé par <span className="font-semibold text-brand-soft">Cervelet</span>
          </span>
        </div>
        <p className="text-zinc-500">
          &copy; {new Date().getFullYear()} Pixelhub. Open source & Serverless.
        </p>
        <div className="flex gap-6">
          <a 
            href="https://github.com/lenny-vigeon-dev/cervelet" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-brand transition-colors"
          >
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}
