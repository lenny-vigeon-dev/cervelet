import { AuthStatus } from "@/components/auth-status";

/**
 * Card displaying Discord authentication status and login/logout controls.
 * Wraps the AuthStatus component with appropriate styling.
 */
export function AuthCard() {
  return (
    <div className="rounded-3xl border border-brand/25 bg-canvas-surface/90 p-6 shadow-surface backdrop-blur">
      <h2 className="text-xl font-semibold text-brand-soft">
        Authentification Discord
      </h2>
      <p className="mt-2 text-sm text-zinc-400">
        Authentification via Discord OAuth2. Les informations sont stockées
        localement dans votre navigateur.
      </p>
      <AuthStatus />
    </div>
  );
}
