"use client";

import type { SessionState } from "@/types/session";

export interface ToolbarProps {
  session: SessionState;
  onSelectColor?: (hexColor: string) => void;
}

/**
 * Toolbar regroupe les contrôles de placement de pixels. Elle est volontairement
 * minimale et servira de point d’ancrage pour la palette, l’historique et les outils.
 */
export function Toolbar({ session, onSelectColor }: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-full border border-canvas-border bg-canvas-surface/80 px-4 py-2 text-sm text-slate-700 shadow-surface dark:text-slate-200">
      <span className="font-semibold">
        {session.isAuthenticated && session.user
          ? session.user.username
          : "Anonyme"}
      </span>
      <div className="flex items-center gap-2">
        {["#ef4444", "#f97316", "#22d3ee", "#a855f7", "#facc15"].map(
          (color) => (
            <button
              key={color}
              type="button"
              aria-label={`Choisir ${color}`}
              className="h-6 w-6 rounded-full transition hover:scale-110 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-sky-500"
              style={{ backgroundColor: color }}
              onClick={() => onSelectColor?.(color)}
            />
          )
        )}
      </div>
    </div>
  );
}

export default Toolbar;
