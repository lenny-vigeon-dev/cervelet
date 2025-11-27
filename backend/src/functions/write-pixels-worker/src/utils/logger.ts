/**
 * GCP Cloud Logging compatible structured logger
 * https://cloud.google.com/logging/docs/structured-logging
 */

type Severity = 'DEBUG' | 'INFO' | 'NOTICE' | 'WARNING' | 'ERROR' | 'CRITICAL';

interface LogEntry {
  severity: Severity;
  message: string;
  component: string;
  [key: string]: unknown;
}

const SERVICE_NAME = 'write-pixels-worker';

function log(severity: Severity, message: string, context: Record<string, unknown> = {}): void {
  const entry: LogEntry = {
    severity,
    message,
    component: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    ...context,
  };

  // GCP Cloud Logging parses JSON from stdout/stderr
  if (severity === 'ERROR' || severity === 'CRITICAL') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log('DEBUG', message, context),
  info: (message: string, context?: Record<string, unknown>) => log('INFO', message, context),
  notice: (message: string, context?: Record<string, unknown>) => log('NOTICE', message, context),
  warn: (message: string, context?: Record<string, unknown>) => log('WARNING', message, context),
  error: (message: string, context?: Record<string, unknown>) => log('ERROR', message, context),
  critical: (message: string, context?: Record<string, unknown>) => log('CRITICAL', message, context),

  // Specialized logging methods
  pixelWrite: (userId: string, x: number, y: number, color: number, success: boolean, durationMs: number) => {
    log(success ? 'INFO' : 'ERROR', success ? 'Pixel written successfully' : 'Pixel write failed', {
      event: 'pixel_write',
      userId,
      coordinates: { x, y },
      color,
      colorHex: '#' + color.toString(16).padStart(6, '0'),
      success,
      durationMs,
      labels: { operation: 'write_pixel' },
    });
  },

  pubsubReceived: (messageId: string, subscription: string) => {
    log('INFO', 'Pub/Sub message received', {
      event: 'pubsub_received',
      messageId,
      subscription,
      labels: { operation: 'pubsub' },
    });
  },

  pubsubProcessed: (messageId: string, durationMs: number, success: boolean) => {
    log(success ? 'INFO' : 'ERROR', success ? 'Pub/Sub message processed' : 'Pub/Sub message processing failed', {
      event: 'pubsub_processed',
      messageId,
      durationMs,
      success,
      labels: { operation: 'pubsub' },
    });
  },

  cooldownCheck: (userId: string, allowed: boolean, remainingMs?: number) => {
    log('INFO', allowed ? 'Cooldown check passed' : 'Cooldown active - request rejected', {
      event: 'cooldown_check',
      userId,
      allowed,
      remainingMs,
      remainingSeconds: remainingMs ? Math.ceil(remainingMs / 1000) : undefined,
      labels: { operation: 'cooldown' },
    });
  },

  firestoreOperation: (operation: string, collection: string, documentId: string, durationMs: number, success: boolean, error?: string) => {
    log(success ? 'INFO' : 'ERROR', `Firestore ${operation} ${success ? 'completed' : 'failed'}`, {
      event: 'firestore_operation',
      operation,
      collection,
      documentId,
      durationMs,
      success,
      error,
      labels: { operation: 'firestore', collection },
    });
  },

  discordWebhook: (operation: string, applicationId: string, success: boolean, statusCode?: number, error?: string) => {
    log(success ? 'INFO' : 'WARNING', `Discord ${operation} ${success ? 'sent' : 'failed'}`, {
      event: 'discord_webhook',
      operation,
      applicationId,
      success,
      statusCode,
      error,
      labels: { operation: 'discord' },
    });
  },

  serviceStartup: (port: number | string) => {
    log('NOTICE', 'Service started', {
      event: 'service_startup',
      port,
      nodeVersion: process.version,
      labels: { operation: 'lifecycle' },
    });
  },

  serviceShutdown: (reason: string) => {
    log('NOTICE', 'Service shutting down', {
      event: 'service_shutdown',
      reason,
      labels: { operation: 'lifecycle' },
    });
  },

  validationError: (reason: string, details: Record<string, unknown>) => {
    log('WARNING', `Validation failed: ${reason}`, {
      event: 'validation_error',
      reason,
      ...details,
      labels: { operation: 'validation' },
    });
  },
};
