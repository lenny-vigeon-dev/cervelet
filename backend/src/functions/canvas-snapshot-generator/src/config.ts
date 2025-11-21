export const config = {
  // GCP Project ID
  projectId: process.env.GCP_PROJECT_ID || process.env.GCLOUD_PROJECT || 'serverless-tek89',

  // Firestore configuration
  firestore: {
    canvasCollection: 'canvases',
    pixelsCollection: 'pixels',
    defaultCanvasId: 'main-canvas',
  },

  // Cloud Storage configuration
  storage: {
    bucketName: process.env.CANVAS_SNAPSHOTS_BUCKET || 'serverless-tek89-canvas-snapshots',
    latestSnapshotPath: 'canvas/latest.png',
    historicalSnapshotPrefix: 'canvas/historical/',
  },

  // Canvas configuration
  canvas: {
    defaultWidth: 1000,
    defaultHeight: 1000,
    backgroundColor: '#FFFFFF',
  },

  // Performance configuration
  performance: {
    batchSize: 500, // Process pixels in batches
    maxConcurrentBatches: 5,
  },
};
