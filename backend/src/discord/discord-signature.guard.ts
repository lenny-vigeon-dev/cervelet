import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import nacl from 'tweetnacl';

/**
 * NestJS Guard that verifies Discord Ed25519 interaction signatures.
 *
 * Discord signs every interaction POST with the application's public key.
 * The signature is verified against the raw body bytes, so the NestJS app
 * must be bootstrapped with `rawBody: true`.
 *
 * @see https://discord.com/developers/docs/interactions/overview#setting-up-an-endpoint
 */
@Injectable()
export class DiscordSignatureGuard implements CanActivate {
  private readonly logger = new Logger(DiscordSignatureGuard.name);
  private readonly publicKey: Buffer;

  constructor() {
    const key = process.env.DISCORD_PUBLIC_KEY;
    if (!key) {
      throw new Error(
        'DISCORD_PUBLIC_KEY environment variable is required for Discord signature verification',
      );
    }
    this.publicKey = Buffer.from(key, 'hex');
  }

  /** Maximum allowed age of a signed request (seconds). Default: 300 (5 min). */
  private static readonly MAX_TIMESTAMP_AGE_S = (() => {
    const parsed = parseInt(process.env.DISCORD_MAX_TIMESTAMP_AGE_S || '', 10);
    return Number.isNaN(parsed) ? 300 : parsed;
  })();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const signature = request.headers['x-signature-ed25519'] as
      | string
      | undefined;
    const timestamp = request.headers['x-signature-timestamp'] as
      | string
      | undefined;

    if (!signature || !timestamp) {
      this.logger.warn('Missing Discord signature headers');
      throw new UnauthorizedException('Missing signature headers');
    }

    // Reject stale timestamps to prevent replay attacks
    const timestampSeconds = Number(timestamp);
    if (
      Number.isNaN(timestampSeconds) ||
      Math.abs(Date.now() / 1000 - timestampSeconds) >
        DiscordSignatureGuard.MAX_TIMESTAMP_AGE_S
    ) {
      this.logger.warn('Stale or invalid Discord timestamp');
      throw new UnauthorizedException('Invalid request timestamp');
    }

    const rawBody = this.getRawBody(request);
    if (!rawBody) {
      this.logger.warn('Could not extract raw body for signature verification');
      throw new UnauthorizedException('Cannot verify signature');
    }

    try {
      const message = Buffer.concat([Buffer.from(timestamp, 'utf8'), rawBody]);

      const isValid = nacl.sign.detached.verify(
        message,
        Buffer.from(signature, 'hex'),
        this.publicKey,
      );

      if (!isValid) {
        this.logger.warn('Invalid Discord signature');
        throw new UnauthorizedException('Invalid request signature');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.warn(
        `Signature verification error: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new UnauthorizedException('Invalid request signature');
    }

    return true;
  }

  /**
   * Extract the raw body buffer from the request.
   *
   * When NestJS is bootstrapped with `rawBody: true`, Express stores the
   * raw bytes on `req.rawBody`.
   */
  private getRawBody(req: Request): Buffer | null {
    const raw = (req as Request & { rawBody?: Buffer | string }).rawBody;

    if (raw) {
      return Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    }

    // No fallback: rawBody is required for correct Ed25519 verification.
    // JSON re-serialization is non-deterministic and would compromise
    // signature security. Ensure NestJS is bootstrapped with rawBody: true.
    return null;
  }
}
