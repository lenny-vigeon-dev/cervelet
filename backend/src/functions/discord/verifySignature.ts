import type { Request } from "@google-cloud/functions-framework";
import * as nacl from "tweetnacl";

const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;

if (!DISCORD_PUBLIC_KEY) {
  throw new Error("DISCORD_PUBLIC_KEY env var must be set");
}

const DISCORD_PUBLIC_KEY_BUFFER = Buffer.from(DISCORD_PUBLIC_KEY, "hex");

export function verifyDiscordSignature(req: Request): boolean {
  const signatureHeader = req.header("X-Signature-Ed25519");
  const timestampHeader = req.header("X-Signature-Timestamp");
  const rawBody = getBodyBuffer(req);

  if (
    typeof signatureHeader !== "string" ||
    typeof timestampHeader !== "string" ||
    !rawBody
  ) {
    return false;
  }

  const message = Buffer.concat([Buffer.from(timestampHeader, "utf8"), rawBody]);

  return nacl.sign.detached.verify(
    message,
    Buffer.from(signatureHeader, "hex"),
    DISCORD_PUBLIC_KEY_BUFFER
  );
}

/**
 * Discord signs the exact byte sequence sent in the HTTP body.
 * Some runtimes (esp. newer Express middlewares) stop exposing `req.rawBody`,
 * so we lazily rebuild a Buffer from whatever body representation we have.
 */
function getBodyBuffer(req: Request): Buffer | null {
  if (req.rawBody) {
    return Buffer.isBuffer(req.rawBody)
      ? req.rawBody
      : Buffer.from(req.rawBody);
  }

  const body = (req as Request & { body?: unknown }).body;

  if (!body) return null;
  if (Buffer.isBuffer(body)) return body;
  if (typeof body === "string") return Buffer.from(body, "utf8");
  if (body instanceof Uint8Array) return Buffer.from(body);

  try {
    return Buffer.from(JSON.stringify(body));
  } catch {
    return null;
  }
}
