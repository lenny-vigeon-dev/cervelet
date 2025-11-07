import type { HttpFunction } from "@google-cloud/functions-framework";
import { verifyDiscordSignature } from "./verifySignature";
import type { DiscordInteraction } from "./types";

export const discordAcknowledge: HttpFunction = async (req, res) => {
  // Skip signature verification in development mode
  const isDev = process.env.NODE_ENV === 'development' || process.env.SKIP_SIGNATURE_VERIFICATION === 'true';
  
  if (!isDev && !verifyDiscordSignature(req)) {
    return res.status(401).send("Invalid request signature");
  }

  const body = req.body as DiscordInteraction;

  if (body.type === 1) {
    // PING
    return res.status(200).json({ type: 1 });
  }

  // Deferred reply (acknowledge)
  return res.status(200).json({ type: 5 });
};
