# Write Pixels Worker

Serverless worker that validates pixel placement requests, writes them to Firestore, and triggers downstream processes (Discord feedback, optional snapshot generation).

## Responsibilities
- Validate payload shape (coordinates, color, userId).
- Enforce cooldown per user (5 minutes).
- Atomic write to Firestore (`pixels` + `users/lastPixelPlaced`).
- Optional Discord follow-up (success/error) when invoked via Discord interactions.
- Publish a Pub/Sub message to trigger the canvas snapshot generator (optional, best-effort).

## HTTP Endpoint (direct frontend calls)
- **Path**: `/write` (Express in `src/main.ts`)
- **Auth**: Discord OAuth access token in `Authorization: Bearer <token>`.
- **Payload (JSON)**:
  ```json
  {
    "x": 10,
    "y": 20,
    "color": 16711680
  }
  ```
  - `x`, `y`: integers (>= 0)
  - `color`: int RGB (0 to 16777215; e.g., 0xFF0000 for red)
- **Responses**:
  - `200 { "success": true }`
  - `400 { "error": "..." }` invalid payload or color range
  - `401 { "error": "Missing/Invalid Discord access token" }`
  - `500 { "error": "Internal error" }`

## Pub/Sub Trigger (Discord slash commands)
- Accepts Pub/Sub messages on `/` (root) via Cloud Run (see `src/main.ts`).
- Expected Pub/Sub message data (base64 JSON):
  ```json
  {
    "userId": "123456789",
    "x": 10,
    "y": 20,
    "color": 16711680,
    "interactionToken": "discord-interaction-token",
    "applicationId": "discord-app-id"
  }
  ```
  - `interactionToken`/`applicationId` are optional; when present, Discord feedback is sent.

## Config / Environment
- Cooldown: `COOLDOWN_MS = 300000` (5 minutes) in `src/config.ts`.
- Default canvas: `DEFAULT_CANVAS_ID = 'main-canvas'`.
- Pub/Sub snapshot trigger topic: `SNAPSHOT_TRIGGER_TOPIC` (env var; default `canvas-snapshot-trigger`). If unset, snapshot publish is skipped.
- Firestore collections: `users`, `pixels` (see `src/config.ts`).
- Discord API base URL: `https://discord.com/api/v10`.

## Services
- `FirestoreService`: reads `users/{userId}`, transactionally writes `pixels/{canvasId}_{x}_{y}` and updates `users/{userId}.lastPixelPlaced`.
- `DiscordService`: sends follow-ups (success/error/cooldown) when interaction tokens are provided.
- `PubSubService`: publishes snapshot trigger messages (best-effort, non-blocking).

## Error Handling
- Cooldown violations throw with `remainingMs` attached.
- Discord follow-up failures are logged but do not block the main flow.
- Snapshot publish failures are logged but do not block the main flow.

## Deployment Notes
- Cloud Run service name (example): `write-pixels-worker`.
- Required IAM: service account needs Firestore access and Pub/Sub publish on `SNAPSHOT_TRIGGER_TOPIC`.
- CORS: `/write` handles preflight with permissive `Access-Control-Allow-Origin: *`.
