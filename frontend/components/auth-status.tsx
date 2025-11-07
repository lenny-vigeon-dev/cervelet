"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/hooks/use-session";

/**
 * Authentication status component that displays login button or user info.
 * Uses client-side session from localStorage.
 */
export function AuthStatus() {
  const { session, isLoading, logout } = useSession();

  if (isLoading) {
    return (
      <div className="mt-6 flex flex-col gap-3">
        <div className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand/50 to-brand-strong/50 px-5 py-2.5 text-sm font-semibold text-black/50">
          Chargement...
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      {session.isAuthenticated ? (
        <>
          <div className="rounded-2xl border border-brand/30 bg-black/70 p-4 shadow-inner shadow-brand/20">
            <p className="text-sm font-semibold text-brand-soft">
              Connecté en tant que
            </p>
            <div className="mt-2 flex items-center gap-3">
              {session.user.avatarUrl && (
                <Image
                  src={session.user.avatarUrl}
                  alt={session.user.username}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full"
                />
              )}
              <div>
                <p className="font-semibold text-foreground">
                  {session.user.username}
                </p>
                {session.user.email && (
                  <p className="text-xs text-zinc-400">{session.user.email}</p>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center justify-center rounded-full border border-brand/40 bg-black/60 px-5 py-2.5 text-sm font-semibold text-brand-soft transition hover:bg-black/80"
          >
            Se déconnecter
          </button>
        </>
      ) : (
        <>
          <Link
            href="/auth/discord"
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand to-brand-strong px-5 py-2.5 text-sm font-semibold text-black shadow-brand transition hover:opacity-95"
          >
            Se connecter avec Discord
          </Link>
          <p className="text-xs text-zinc-400">
            L'authentification est gérée via OAuth2 Discord. Vos informations
            sont stockées localement dans votre navigateur.
          </p>
        </>
      )}
    </div>
  );
}
