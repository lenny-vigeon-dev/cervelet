"use client";

import { useSession } from "@/hooks/use-session";
import { Toolbar } from "@/components/toolbar";

export interface ToolbarWrapperProps {
  onSelectColor?: (hexColor: string) => void;
}

/**
 * Client-side wrapper for Toolbar that uses the session hook.
 * This ensures the session is hydrated from localStorage on the client.
 */
export function ToolbarWrapper({ onSelectColor }: ToolbarWrapperProps) {
  const { session } = useSession();

  return <Toolbar session={session} onSelectColor={onSelectColor} />;
}
