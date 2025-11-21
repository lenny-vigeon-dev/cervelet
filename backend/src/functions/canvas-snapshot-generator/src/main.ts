import { http } from '@google-cloud/functions-framework';
import type { Request, Response } from '@google-cloud/functions-framework';
import { SnapshotService } from './snapshot.service';

/**
 * HTTP Cloud Function to generate canvas snapshots
 *
 * Can be triggered by:
 * - Cloud Scheduler (periodic snapshots)
 * - HTTP request (manual trigger)
 * - Pub/Sub (event-driven)
 *
 * Query parameters:
 * - canvasId: ID of the canvas to snapshot (optional, defaults to 'main-canvas')
 *
 * Example:
 * curl https://REGION-PROJECT_ID.cloudfunctions.net/canvas-snapshot-generator?canvasId=main-canvas
 */
http('generateSnapshot', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // CORS headers for frontend access
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // Get canvas ID from query params or body
    const canvasId = req.query.canvasId as string || req.body?.canvasId || 'main-canvas';

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
