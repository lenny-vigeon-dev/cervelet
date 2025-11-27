import { PubSub } from '@google-cloud/pubsub';
import { DEFAULT_CANVAS_ID, PROJECT_ID, SNAPSHOT_TRIGGER_TOPIC } from '../config';

/**
 * Pub/Sub service to trigger downstream processing (e.g., snapshot generator)
 */
export class PubSubService {
  private readonly client: PubSub;

  constructor() {
    this.client = new PubSub({ projectId: PROJECT_ID });
  }

  /**
   * Publishes a message to trigger the canvas snapshot generator.
   * If the topic name is empty, the call is skipped.
   */
  async triggerSnapshot(canvasId: string = DEFAULT_CANVAS_ID): Promise<void> {
    if (!SNAPSHOT_TRIGGER_TOPIC) {
      return;
    }

    const data = Buffer.from(
      JSON.stringify({
        canvasId,
        source: 'write-pixels-worker',
        timestamp: new Date().toISOString(),
      }),
    );

    await this.client
      .topic(SNAPSHOT_TRIGGER_TOPIC)
      .publishMessage({ data });
  }
}
