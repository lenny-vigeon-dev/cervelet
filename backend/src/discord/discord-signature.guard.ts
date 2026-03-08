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

    const rawBody = this.getRawBody(request);
    if (!rawBody) {
      this.logger.warn('Could not extract raw body for signature verification');
      throw new UnauthorizedException('Cannot verify signature');
    }

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

    // Fallback: reconstruct from parsed body (less reliable but functional)
    const body: unknown = req.body;
    if (!body) return null;
    if (Buffer.isBuffer(body)) return body;
    if (typeof body === 'string') return Buffer.from(body, 'utf8');

    try {
      return Buffer.from(JSON.stringify(body));
    } catch {
      return null;
    }
  }
}
