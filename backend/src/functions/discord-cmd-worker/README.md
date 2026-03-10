# Discord Command Worker

Serverless worker that processes deferred Discord slash commands via Pub/Sub. Handles `/snapshot`, `/session`, and `/canvas` commands by performing the requested action and sending a follow-up response back to Discord.

## Responsibilities
- Receive Pub/Sub push messages from the `discord-cmd-requests` topic.
- Route commands to the appropriate handler (`snapshot`, `session`, `canvas`).
- Send Discord follow-up messages with command results or errors.

## Commands

### `/snapshot`
- Triggers canvas snapshot generation (via the `canvas-snapshot-generator` service).
- Verifies the snapshot is accessible in Cloud Storage.
- Sends a Discord embed with the snapshot image URL.

### `/session <action>`
- Admin-only command to manage canvas sessions.
- Actions: `start`, `pause`, `reset`.
- `reset` batch-deletes all pixels and increments the canvas version.
- Updates canvas status in Firestore and sends confirmation to Discord.

### `/canvas`
- Retrieves canvas metadata (dimensions, status, version) and pixel count.
- Sends a formatted info message to Discord.

## Pub/Sub Trigger
- Accepts Pub/Sub push messages on `POST /` (root).
- Expected Pub/Sub message data (base64 JSON):
  ```json
  {
    "command": "snapshot",
    "userId": "123456789",
    "interactionToken": "discord-interaction-token",
    "applicationId": "discord-app-id",
    "options": {}
  }
  ```

## Config / Environment
- `PORT`: HTTP port (default `8080`).
- `GCP_PROJECT_ID` / `GOOGLE_CLOUD_PROJECT`: GCP project ID for Firestore.
- `DISCORD_BOT_TOKEN`: Bot token for sending follow-up messages (via Secret Manager).
- Default canvas ID: `main-canvas`.

## Services
- `FirestoreService`: Canvas CRUD (get, update status, reset, count pixels).
- `DiscordService`: Discord REST API follow-up messages (success, error, embeds).

## Error Handling
- Invalid Pub/Sub messages (missing `message.data`) return `200` to prevent retries.
- Invalid payloads (missing required fields) return `200` to prevent retries.
- Processing errors return `500` to allow Pub/Sub retry (with eventual DLQ routing).
- Unknown commands receive an error follow-up so the deferred response does not hang.

## Deployment
- Cloud Run service name: `discord-cmd-worker`.
- Required IAM: Firestore read/write, Secret Manager access for `DISCORD_BOT_TOKEN`.
- Pub/Sub subscription: `discord-cmd-requests-sub` with 300s ack deadline.
