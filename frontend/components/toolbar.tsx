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
    <div className="flex flex-wrap items-center gap-3 rounded-full border border-brand/30 bg-black/60 px-5 py-2 text-sm text-foreground shadow-surface backdrop-blur">
      <span className="font-semibold text-brand-soft">
        {session.isAuthenticated && session.user
          ? session.user.username
          : "Anonyme"}
      </span>
      <div className="flex items-center gap-2">
        {["#ffd392", "#ffb347", "#ffa321", "#ff862e", "#f46a0b"].map(
          (color) => (
            <button
              key={color}
              type="button"
              aria-label={`Choisir ${color}`}
              className="h-7 w-7 rounded-full border border-white/20 shadow-sm transition hover:scale-110 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-brand"
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
