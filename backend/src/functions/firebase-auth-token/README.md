# Firebase Auth Token

Serverless function that bridges Discord OAuth authentication with Firebase Auth. Verifies a Discord OAuth access token and mints a Firebase custom token with the Discord user ID as the UID.

## Responsibilities
- Verify Discord OAuth access tokens against the Discord API (`/users/@me`).
- Generate Firebase custom tokens with Discord user claims (username, email).
- Handle CORS for cross-origin requests.

## HTTP Endpoint
- **Method**: `POST`
- **Auth**: The Discord access token is sent in the JSON body (the `Authorization` header is reserved for Cloud Run IAM/OIDC when invoked by the frontend proxy).
- **Payload (JSON)**:
  ```json
  {
    "discordAccessToken": "<discord-oauth-access-token>"
  }
  ```
- **Legacy fallback**: For direct calls (e.g. local testing), the Discord token can be sent in the `Authorization: Bearer <token>` header.
- **Responses**:
  - `200 { "token": "eyJhbGciOi..." }` -- Firebase custom token.
  - `401 { "error": "Missing Discord access token" }` -- No token provided.
  - `401 { "error": "Invalid Discord access token" }` -- Discord verification failed.
  - `405 { "error": "Method not allowed" }` -- Non-POST request.
  - `500 { "error": "..." }` -- Internal error (Firebase Admin SDK failure).

## Architecture
This service is **not** routed through the API Gateway. It is an internal Cloud Run service invoked only by the frontend's server-side API route (`/api/firebase-auth-token`). The frontend proxies the request with an OIDC ID token for Cloud Run IAM authentication.

```
Browser -> Frontend (/api/firebase-auth-token) -> [OIDC] -> firebase-auth-token (Cloud Run)
```

## Config / Environment
- `GCP_PROJECT_ID` / `GOOGLE_CLOUD_PROJECT` / `FIREBASE_PROJECT_ID`: GCP project ID.
- `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`: Optional explicit credentials (falls back to Application Default Credentials on Cloud Run).
- `FRONTEND_URL`: Allowed CORS origin (default `*`).

## Firebase Custom Token Claims
The minted token includes:
- **UID**: Discord user ID (e.g. `123456789012345678`).
- **Custom claims**: `discord: true`, `username`, `email` (if available).

## Deployment
- Cloud Run service name: `firebase-auth-token`.
- Uses `@google-cloud/functions-framework` with `--target=createFirebaseToken`.
- Required IAM: `Firebase Admin SDK` permissions (auto-granted on Cloud Run with default SA or dedicated SA).
