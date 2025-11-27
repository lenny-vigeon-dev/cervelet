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
 * Generate snapshot endpoint
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
