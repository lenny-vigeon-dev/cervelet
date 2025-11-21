# Pub/Sub Topics Module

This module creates Google Cloud Pub/Sub topics for the PixelHub application's asynchronous messaging needs.

## Topics Created

### 1. `discord-cmd-requests`
- **Purpose**: Receives Discord bot command requests
- **Retention**: 7 days
- **Use Case**: Discord interaction webhook receives commands and publishes them to this topic for asynchronous processing

### 2. `write-pixel-requests`
- **Purpose**: Receives pixel write requests
- **Retention**: 7 days  
- **Use Case**: API receives pixel placement requests and publishes them to this topic. The write-pixels-worker Cloud Run service subscribes to process them asynchronously

### 3. `snapshot-requests`
- **Purpose**: Receives canvas snapshot generation requests
- **Retention**: 7 days
- **Use Case**: Triggers canvas snapshot creation for backups or historical purposes

### 4. `pixel-updates-events`
- **Purpose**: Publishes pixel update events for real-time updates
- **Retention**: 1 day (real-time events don't need long retention)
- **Use Case**: After a pixel is successfully written, an event is published here for the frontend to consume via WebSocket/SSE for live canvas updates

## Usage

```hcl
module "pubsub" {
  source = "./modules/pubsub"

  project_id = var.project_id

  labels = {
    environment = "production"
    managed_by  = "terraform"
    application = "cervelet"
  }
}
```

## Outputs

- `discord_cmd_requests_topic_id` - Full resource ID of discord-cmd-requests topic
- `discord_cmd_requests_topic_name` - Name of discord-cmd-requests topic
- `write_pixel_requests_topic_id` - Full resource ID of write-pixel-requests topic
- `write_pixel_requests_topic_name` - Name of write-pixel-requests topic
- `snapshot_requests_topic_id` - Full resource ID of snapshot-requests topic
- `snapshot_requests_topic_name` - Name of snapshot-requests topic
- `pixel_updates_events_topic_id` - Full resource ID of pixel-updates-events topic
- `pixel_updates_events_topic_name` - Name of pixel-updates-events topic
- `all_topic_names` - List of all topic names

## Architecture

```
┌─────────────────┐
│  Discord Bot    │
└────────┬────────┘
         │ publishes
         ▼
┌────────────────────────┐
│ discord-cmd-requests   │ ───► Discord Command Worker
└────────────────────────┘

┌─────────────────┐
│   API Gateway   │
└────────┬────────┘
         │ publishes
         ▼
┌────────────────────────┐
│ write-pixel-requests   │ ───► Write Pixels Worker
└────────────────────────┘

┌─────────────────┐
│  Admin/Cron     │
└────────┬────────┘
         │ publishes
         ▼
┌────────────────────────┐
│  snapshot-requests     │ ───► Snapshot Worker
└────────────────────────┘

┌─────────────────┐
│ Pixel Workers   │
└────────┬────────┘
         │ publishes
         ▼
┌────────────────────────┐
│ pixel-updates-events   │ ───► WebSocket/SSE Server ───► Frontend
└────────────────────────┘
```

## Message Retention

- **Command/Request Topics** (discord-cmd, write-pixel, snapshot): 7 days retention
  - Allows for debugging and replay of failed messages
  - Supports disaster recovery scenarios
  
- **Event Topics** (pixel-updates): 1 day retention
  - Real-time events are ephemeral
  - Shorter retention reduces storage costs
  - Missed events can be recovered from Firestore

## Subscriptions

Subscriptions are created separately by the services that consume from these topics:
- Cloud Run services create push subscriptions automatically
- Cloud Functions can be triggered by Pub/Sub topics
- Custom workers can create pull subscriptions as needed

## Cost Considerations

Pub/Sub pricing (as of 2024):
- First 10 GB/month: Free
- Additional data: $0.04/GB
- Topic/subscription operations are minimal cost

For a typical r/place-style application:
- Estimated cost: $1-5/month for moderate usage
- High traffic periods may increase costs temporarily

## Security

Topics are created with default IAM permissions. To publish/subscribe:

```bash
# Grant publish permission to a service account
gcloud pubsub topics add-iam-policy-binding write-pixel-requests \
  --member="serviceAccount:SERVICE_ACCOUNT@PROJECT.iam.gserviceaccount.com" \
  --role="roles/pubsub.publisher"

# Grant subscribe permission
gcloud pubsub subscriptions add-iam-policy-binding SUBSCRIPTION_NAME \
  --member="serviceAccount:SERVICE_ACCOUNT@PROJECT.iam.gserviceaccount.com" \
  --role="roles/pubsub.subscriber"
```

## Monitoring

Monitor topics in Google Cloud Console:
- Topic throughput and message count
- Subscription backlog and delivery latency
- Failed delivery attempts

Set up alerts for:
- High message backlog (> 1000 messages)
- Old unacknowledged messages (> 5 minutes)
- High publish error rate (> 1%)

## References

- [Google Cloud Pub/Sub Documentation](https://cloud.google.com/pubsub/docs)
- [Pub/Sub Best Practices](https://cloud.google.com/pubsub/docs/best-practices)
- [Message Retention](https://cloud.google.com/pubsub/docs/replay-overview)
