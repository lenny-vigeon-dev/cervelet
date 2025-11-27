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
    const colorHex = '#' + color.toString(16).padStart(6, '0');
    const message = success 
      ? `${userId} placed pixel at (${x}, ${y}) color ${colorHex}`
      : `ERROR: ${userId} failed to place pixel at (${x}, ${y}) color ${colorHex}`;
    
    log(success ? 'INFO' : 'ERROR', message, {
      event: 'pixel_write',
      userId,
      coordinates: { x, y },
      color,
      colorHex,
      success,
      durationMs,
      labels: { operation: 'write_pixel' },
    });
  },

  pubsubReceived: (messageId: string, subscription: string) => {
    log('INFO', `Pub/Sub message received - ID: ${messageId.substring(0, 12)}`, {
      event: 'pubsub_received',
      messageId,
      subscription,
      labels: { operation: 'pubsub' },
    });
  },

  pubsubProcessed: (messageId: string, durationMs: number, success: boolean) => {
    const message = success
      ? `Pub/Sub message processed successfully in ${durationMs}ms`
      : `ERROR: Pub/Sub message processing failed after ${durationMs}ms`;
    
    log(success ? 'INFO' : 'ERROR', message, {
      event: 'pubsub_processed',
      messageId,
      durationMs,
      success,
      labels: { operation: 'pubsub' },
    });
  },

  cooldownCheck: (userId: string, allowed: boolean, remainingMs?: number) => {
    const message = allowed 
      ? `Cooldown OK for ${userId}`
      : `Cooldown active for ${userId} - ${Math.ceil((remainingMs || 0) / 1000)}s remaining`;
    
    log(allowed ? 'INFO' : 'WARNING', message, {
      event: 'cooldown_check',
      userId,
      allowed,
      remainingMs,
      remainingSeconds: remainingMs ? Math.ceil(remainingMs / 1000) : undefined,
      labels: { operation: 'cooldown' },
    });
  },

  firestoreOperation: (operation: string, collection: string, documentId: string, durationMs: number, success: boolean, error?: string) => {
    const message = success
      ? `Firestore ${operation} OK - ${collection}/${documentId} (${durationMs}ms)`
      : `ERROR Firestore ${operation} - ${collection}/${documentId}: ${error || 'unknown error'}`;
    
    log(success ? 'INFO' : 'ERROR', message, {
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
    const message = success
      ? `Discord ${operation} sent successfully`
      : `Discord ${operation} failed: ${error || 'unknown error'}`;
    
    log(success ? 'INFO' : 'WARNING', message, {
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
    log('NOTICE', `Service write-pixels-worker started on port ${port}`, {
      event: 'service_startup',
      port,
      nodeVersion: process.version,
      labels: { operation: 'lifecycle' },
    });
  },

  serviceShutdown: (reason: string) => {
    log('NOTICE', `Service shutting down: ${reason}`, {
      event: 'service_shutdown',
      reason,
      labels: { operation: 'lifecycle' },
    });
  },

  validationError: (reason: string, details: Record<string, unknown>) => {
    log('WARNING', `Validation error: ${reason}`, {
      event: 'validation_error',
      reason,
      ...details,
      labels: { operation: 'validation' },
    });
  },
};
