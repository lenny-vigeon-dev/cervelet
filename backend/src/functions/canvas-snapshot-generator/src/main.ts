import express, { Request, Response } from 'express';
import { SnapshotService } from './snapshot.service';

/**
 * HTTP Cloud Run service to generate canvas snapshots
 *
 * Can be triggered by:
 * - Cloud Scheduler (periodic snapshots)
 * - HTTP request (manual trigger)
 * - Pub/Sub (event-driven via write-pixels-worker)
 *
 * Request body (POST):
 * - canvasId: ID of the canvas to snapshot (optional, defaults to 'main-canvas')
 *
 * Example:
 * curl -X POST https://REGION-PROJECT_ID.run.app/generate \
 *   -H "Content-Type: application/json" \
 *   -d '{"canvasId": "main-canvas"}'
 */

// Express application initialization
const app = express();
app.use(express.json());

/**
 * CORS handling
 */
app.options('*', (_req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.status(204).send();
});

/**
 * Health check endpoint
 */
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy' });
});

/**
 * Root endpoint
 */
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    service: 'canvas-snapshot-generator',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Pub/Sub push endpoint.
 * Receives messages from the 'snapshot-requests' topic subscription.
 * Extracts canvasId from the Pub/Sub message data, or defaults to 'main-canvas'.
 */
app.post('/', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Parse Pub/Sub envelope
    const pubsubMessage = req.body?.message;
    let canvasId = 'main-canvas';

    if (pubsubMessage?.data) {
      try {
        const decoded = Buffer.from(pubsubMessage.data, 'base64').toString('utf-8');
        const payload = JSON.parse(decoded);
        if (payload.canvasId) {
          canvasId = payload.canvasId;
        }
      } catch {
        // Ignore parse errors -- use default canvasId
      }
    }

    console.log(
      JSON.stringify({
        level: 'info',
        message: `Pub/Sub triggered snapshot for canvas: ${canvasId}`,
        messageId: pubsubMessage?.messageId || 'unknown',
      }),
    );

    const snapshotService = new SnapshotService();
    await snapshotService.generateSnapshot(canvasId);

    const duration = Date.now() - startTime;
    console.log(
      JSON.stringify({
        level: 'info',
        message: `Snapshot generated via Pub/Sub in ${duration}ms`,
      }),
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error generating snapshot from Pub/Sub:', error);
    // Return 500 so Pub/Sub retries the message (and eventually routes to DLQ).
    // Only ACK (200) permanently invalid messages -- those are handled above
    // (e.g. unparseable Pub/Sub data falls through to the default canvasId).
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Generate snapshot endpoint (direct HTTP trigger)
 */
app.post('/generate', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');

    // Get canvas ID from request body
    const canvasId = req.body?.canvasId || 'main-canvas';

    console.log(`Generating snapshot for canvas: ${canvasId}`);

    // Generate snapshot
    const snapshotService = new SnapshotService();
    const metadata = await snapshotService.generateSnapshot(canvasId);

    const duration = Date.now() - startTime;

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Canvas snapshot generated successfully',
      data: metadata,
      duration: `${duration}ms`,
    });
  } catch (error) {
    console.error('Error generating snapshot:', error);

    const duration = Date.now() - startTime;

    res.status(500).json({
      success: false,
      message: 'Failed to generate canvas snapshot',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
    });
  }
});

// Server startup
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(
    JSON.stringify({
      level: 'info',
      message: `canvas-snapshot-generator started on port ${PORT}`,
      port: PORT,
      timestamp: new Date().toISOString(),
    }),
  );
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log(
    JSON.stringify({
      level: 'info',
      message: 'SIGTERM signal received - graceful shutdown',
      timestamp: new Date().toISOString(),
    }),
  );
  process.exit(0);
});
