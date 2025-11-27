"use client";

import type { SessionState } from "@/types/session";
import { COLOR_PALETTE } from "@/lib/colors";

export interface ToolbarProps {
  session: SessionState;
  onSelectColor?: (hexColor: string) => void;
}

/**
 * Toolbar regroupe les contrôles de placement de pixels. Elle est volontairement
 * minimale et servira de point d'ancrage pour la palette, l'historique et les outils.
 */
export function Toolbar({ session, onSelectColor }: ToolbarProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-brand/30 bg-black/80 px-6 py-4 text-sm text-foreground shadow-surface backdrop-blur">
      <span className="font-semibold text-brand-soft">
        {session.isAuthenticated && session.user
          ? session.user.username
          : "Anonyme"}
      </span>
      <div className="grid grid-cols-8 gap-2">
        {COLOR_PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Choisir ${color}`}
            className="h-8 w-8 rounded-md border border-white/30 shadow-sm transition hover:scale-110 hover:border-white/60 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-brand"
            style={{ backgroundColor: color }}
            onClick={() => onSelectColor?.(color)}
          />
        ))}
      </div>
    </div>
  );
}

export default Toolbar;
