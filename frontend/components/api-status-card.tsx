import { API_URL } from "@/lib/api";
import type { CanvasSnapshot, CanvasSummary } from "@/types/canvas";

export interface APIStatusCardProps {
  snapshot: CanvasSnapshot | null;
  summary: CanvasSummary | null;
}

/**
 * Displays the API Gateway status with connection info and canvas metrics.
 * Shows error message if API is unreachable.
 */
export function APIStatusCard({ snapshot, summary }: APIStatusCardProps) {
  const apiReachable = snapshot !== null || summary !== null;

  return (
    <div className="rounded-3xl border border-brand/25 bg-canvas-surface/90 p-6 shadow-surface backdrop-blur">
      <h2 className="text-xl font-semibold text-brand-soft">
        Statut API Gateway
      </h2>
      <p className="mt-2 text-sm text-zinc-400">
        Exemple d'appel réalisé côté serveur lors du rendu initial.
      </p>
      <dl className="mt-6 space-y-3 text-sm">
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
        <div className="mt-4 rounded-2xl border border-brand/30 bg-surface/70 p-4 text-xs text-brand-soft shadow-inner shadow-brand/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-brand animate-pulse" />
            <span className="font-semibold">Mode Hybride Actif</span>
          </div>
          <p className="text-zinc-400">
            Le canvas fonctionne en temps réel via Firestore. Les métriques serveur (API Gateway) sont temporairement désactivées.
          </p>
        </div>
      )}
    </div>
  );
}
