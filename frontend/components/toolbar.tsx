"use client";

import type { SessionState } from "@/types/session";
import { COLOR_PALETTE } from "@/lib/colors";

export interface ToolbarProps {
  session: SessionState;
  onSelectColor?: (hexColor: string) => void;
  onClose?: () => void;
}

/**
 * Toolbar regroupe les contrôles de placement de pixels. Elle est volontairement
 * minimale et servira de point d'ancrage pour la palette, l'historique et les outils.
 */
export function Toolbar({ session, onSelectColor, onClose }: ToolbarProps) {
  return (
    <div className="relative flex flex-col items-center gap-3 rounded-3xl border border-brand/30 bg-surface/80 px-6 py-4 text-sm text-foreground shadow-surface backdrop-blur mt-4">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-surface text-zinc-400 hover:bg-zinc-700 hover:text-white border border-border transition-colors"
          aria-label="Fermer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18"/>
            <path d="m6 6 12 12"/>
          </svg>
        </button>
      )}
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
