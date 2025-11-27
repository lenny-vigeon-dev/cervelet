"use client";

import { AuthStatus } from "@/components/auth-status";
import { useCooldown } from "@/hooks/use-cooldown";

/**
 * Card displaying Discord authentication status and login/logout controls.
 * Wraps the AuthStatus component with appropriate styling.
 */
export function AuthCard() {
  const { isOnCooldown, remainingFormatted } = useCooldown();

  return (
    <div className="flex h-full flex-col justify-center rounded-3xl border border-brand/25 bg-canvas-surface/90 p-6 shadow-surface backdrop-blur">
      <h2 className="text-xl font-semibold text-brand-soft">
        Authentification Discord
      </h2>
      <p className="mt-2 text-sm text-zinc-400">
        Authentification via Discord OAuth2. Les informations sont stockées
        localement dans votre navigateur.
      </p>
      <AuthStatus />

      {isOnCooldown && (
        <div className="mt-4 rounded-2xl border border-brand/30 bg-surface/70 p-4 shadow-inner shadow-brand/20">
          <p className="text-sm font-semibold text-brand-soft">
            Cooldown actif
          </p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {remainingFormatted}
          </p>
          <p className="text-xs text-zinc-400">
            Temps restant avant le prochain pixel
          </p>
        </div>
      )}
    </div>
  );
}
