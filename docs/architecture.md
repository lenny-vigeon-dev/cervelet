# PixelHub Architecture

## 1. High-Level Cloud Services Overview

```mermaid
graph TB
    subgraph Clients
        Discord["Discord<br/>(Interactions API)"]
        Browser["Web Browser<br/>(Next.js Frontend)"]
    end

    subgraph "Google Cloud Platform — serverless-488811"
        subgraph "Entry Points"
            APIGW["API Gateway<br/>cervelet-api-gateway"]
            FrontendCR["Cloud Run<br/>pixelhub-frontend"]
        end

        subgraph "Backend Proxy"
            Proxy["Cloud Run<br/>cf-proxy (NestJS)"]
        end

        subgraph "Pub/Sub Topics"
            T1["write-pixel-requests"]
            T2["discord-cmd-requests"]
            T3["snapshot-requests"]
            T4["pixel-updates-events"]
        end

        subgraph "Workers (Cloud Run)"
            W1["write-pixels-worker"]
            W2["discord-cmd-worker"]
            W3["canvas-snapshot-generator"]
        end

        subgraph "Data & Storage"
            Firestore["Firestore<br/>(default database)"]
            GCS["Cloud Storage<br/>canvas-snapshots bucket"]
            SecretMgr["Secret Manager"]
        end

        Scheduler["Cloud Scheduler<br/>every 5 min"]
    end

    Discord -->|"POST /discord/interactions"| APIGW
    Browser -->|"HTTPS"| FrontendCR
    Browser -->|"POST /write, /auth/*"| APIGW
    Browser -.->|"onSnapshot (real-time)"| Firestore

    APIGW -->|"OIDC auth"| Proxy
    Proxy -->|"publish"| T1
    Proxy -->|"publish"| T2

    T1 -->|"push subscription"| W1
    T2 -->|"push subscription"| W2
    T3 -->|"push subscription"| W3

    W1 -->|"read/write"| Firestore
    W2 -->|"read/write"| Firestore
    W2 -->|"publish"| T3
    W3 -->|"read"| Firestore
    W3 -->|"upload PNG"| GCS

    Proxy -->|"mint Firebase token"| Firestore

    Scheduler -->|"publish"| T3

    SecretMgr -.->|"inject secrets"| Proxy
    SecretMgr -.->|"inject secrets"| W2

    FrontendCR -->|"load snapshot"| GCS

    style APIGW fill:#4285F4,color:#fff
    style Proxy fill:#34A853,color:#fff
    style W1 fill:#34A853,color:#fff
    style W2 fill:#34A853,color:#fff
    style W3 fill:#34A853,color:#fff
    style FrontendCR fill:#34A853,color:#fff
    style Firestore fill:#FBBC04,color:#000
    style GCS fill:#FBBC04,color:#000
    style T1 fill:#EA4335,color:#fff
    style T2 fill:#EA4335,color:#fff
    style T3 fill:#EA4335,color:#fff
    style T4 fill:#EA4335,color:#fff
    style Scheduler fill:#9C27B0,color:#fff
    style SecretMgr fill:#607D8B,color:#fff
```

## 2. Event-Driven Data Flow — Pixel Write Pipeline

```mermaid
sequenceDiagram
    participant User as User (Discord / Web)
    participant APIGW as API Gateway
    participant Proxy as cf-proxy
    participant PubSub as Pub/Sub<br/>write-pixel-requests
    participant Worker as write-pixels-worker
    participant FS as Firestore
    participant Browser as Web Clients

    User->>APIGW: POST /write or /discord/interactions
    APIGW->>Proxy: Forward (OIDC auth)

    alt Discord Interaction
        Proxy->>User: ACK (type 5, deferred)
    end

    Proxy->>PubSub: Publish pixel payload
    Proxy->>User: 200 OK (web) / ACK (Discord)

    PubSub->>Worker: Push subscription delivery

    Worker->>FS: Begin transaction
    Note over Worker,FS: 1. Read canvas (check active status)<br/>2. Read user (check cooldown)<br/>3. Read cooldownSeconds from canvas doc<br/>4. Write pixel to 'pixels' collection<br/>5. Append to 'pixelHistory'<br/>6. Update user profile<br/>7. Increment canvas totalPixels
    FS-->>Worker: Transaction committed

    FS-->>Browser: onSnapshot (real-time update)
    Note over Browser: Canvas re-renders<br/>the updated pixel
```

## 3. Discord Slash Command Pipeline

```mermaid
sequenceDiagram
    participant User as Discord User
    participant Discord as Discord API
    participant APIGW as API Gateway
    participant Proxy as cf-proxy
    participant PubSub as Pub/Sub
    participant Worker as discord-cmd-worker
    participant FS as Firestore
    participant DiscordAPI as Discord Webhooks

    User->>Discord: /draw, /snapshot, /canvas, etc.
    Discord->>APIGW: POST /discord/interactions
    APIGW->>Proxy: Forward (signature verified)

    alt Immediate response (/help, /allo)
        Proxy->>Discord: Type 4 (immediate message)
    else Deferred response (all other commands)
        Proxy->>Discord: Type 5 (ACK, deferred)

        alt Draw command
            Proxy->>PubSub: Publish to write-pixel-requests
        else Other commands
            Proxy->>PubSub: Publish to discord-cmd-requests
        end

        PubSub->>Worker: Push subscription delivery
        Worker->>FS: Read/write canvas data
        Worker->>DiscordAPI: PATCH follow-up message
        DiscordAPI->>User: Display result in Discord
    end
```

## 4. Authentication Flow (Discord OAuth2 → Firebase)

```mermaid
sequenceDiagram
    participant User as Web Browser
    participant Frontend as pixelhub-frontend
    participant Discord as Discord OAuth2
    participant APIGW as API Gateway
    participant Proxy as cf-proxy (NestJS)
    participant Firebase as Firebase Auth

    User->>Frontend: Click "Login with Discord"
    Frontend->>Discord: Redirect to OAuth2 authorize
    Discord->>Frontend: Callback with auth code
    Frontend->>Discord: Exchange code for access token
    Discord-->>Frontend: Discord access token

    Frontend->>APIGW: POST /auth/firebase-token<br/>(X-Discord-Token header + API key)
    APIGW->>Proxy: Forward request (OIDC auth)
    Proxy->>Discord: GET /users/@me (validate token)
    Discord-->>Proxy: User profile
    Proxy->>Firebase: createCustomToken(discordUserId)
    Firebase-->>Proxy: Firebase custom token
    Proxy-->>APIGW: { firebaseToken }
    APIGW-->>Frontend: { firebaseToken }
    Frontend->>Firebase: signInWithCustomToken()
    Firebase-->>User: Authenticated session
```

## 5. Canvas Snapshot Pipeline

```mermaid
sequenceDiagram
    participant Trigger as Cloud Scheduler / Discord /snapshot
    participant PubSub as Pub/Sub<br/>snapshot-requests
    participant SnapGen as canvas-snapshot-generator
    participant FS as Firestore
    participant GCS as Cloud Storage

    Trigger->>PubSub: Publish { canvasId }

    Note over Trigger: Scheduler runs every 5 min<br/>or triggered by /snapshot command

    PubSub->>SnapGen: Push subscription delivery
    SnapGen->>FS: Read all pixels for canvas
    SnapGen->>SnapGen: Generate PNG with sharp
    SnapGen->>GCS: Upload canvas/latest.png
    Note over GCS: Public read access<br/>(allUsers objectViewer)
```

## 6. Pub/Sub Topics and Subscriptions

```mermaid
graph LR
    subgraph Publishers
        Proxy["cf-proxy"]
        CmdWorker["discord-cmd-worker"]
        Scheduler["Cloud Scheduler"]
    end

    subgraph "Topics & Subscriptions"
        T1["write-pixel-requests"]
        S1["write-pixel-requests-sub<br/>(push → write-pixels-worker)"]
        T1 --> S1

        T2["discord-cmd-requests"]
        S2["discord-cmd-requests-sub<br/>(push → discord-cmd-worker)"]
        T2 --> S2

        T3["snapshot-requests"]
        S3["snapshot-requests-sub<br/>(push → canvas-snapshot-generator)"]
        T3 --> S3

        T4["pixel-updates-events<br/>(fan-out, no subscribers yet)"]
    end

    subgraph Workers
        W1["write-pixels-worker"]
        W2["discord-cmd-worker"]
        W3["canvas-snapshot-generator"]
    end

    Proxy -->|"pixel draws"| T1
    Proxy -->|"slash commands"| T2
    CmdWorker -->|"/snapshot trigger"| T3
    Scheduler -->|"cron every 5 min"| T3

    S1 -->|"push"| W1
    S2 -->|"push"| W2
    S3 -->|"push"| W3

    style T1 fill:#EA4335,color:#fff
    style T2 fill:#EA4335,color:#fff
    style T3 fill:#EA4335,color:#fff
    style T4 fill:#EA4335,color:#fff
    style S1 fill:#FF7043,color:#fff
    style S2 fill:#FF7043,color:#fff
    style S3 fill:#FF7043,color:#fff
```

## 7. Firestore Data Model

```mermaid
erDiagram
    canvases {
        string id PK "e.g. main-canvas"
        int width "Canvas width in pixels"
        int height "Canvas height in pixels"
        string status "active | paused | resetting"
        int totalPixels "Count of unique pixel positions"
        int cooldownSeconds "Rate limit (set by admin)"
        int version "Schema version"
        timestamp createdAt
        timestamp updatedAt
    }

    pixels {
        string id PK "canvasId_x_y"
        string canvasId FK
        int x "X coordinate"
        int y "Y coordinate"
        int color "Hex color as integer"
        string userId FK
        string username
        timestamp updatedAt
    }

    users {
        string id PK "Discord user ID"
        string username
        string avatarUrl
        string role "user | admin"
        int totalPixelsPlaced
        timestamp lastPixelPlaced
        timestamp createdAt
    }

    pixelHistory {
        string id PK "Auto-generated"
        string canvasId FK
        int x
        int y
        int color
        string userId FK
        string username
        timestamp createdAt
    }

    canvases ||--o{ pixels : "contains"
    users ||--o{ pixels : "places"
    users ||--o{ pixelHistory : "authored"
    canvases ||--o{ pixelHistory : "records"
```

## 8. IAM & Service Accounts (Least Privilege)

```mermaid
graph TB
    subgraph "Service Accounts"
        SA1["proxy-svc"]
        SA2["write-pixels-svc"]
        SA3["snap-svc"]
        SA4["discord-cmd-svc"]
        SA5["sa-api-gateway-config"]
    end

    subgraph "Permissions"
        SA1 -->|"Pub/Sub Publisher"| PubSub["Pub/Sub Topics"]
        SA1 -->|"Firestore Read"| FS["Firestore"]
        SA1 -->|"Secret Accessor"| SM["Secret Manager"]

        SA2 -->|"Firestore Read/Write"| FS
        SA2 -->|"Pub/Sub Subscriber"| PubSub

        SA3 -->|"Firestore Read"| FS
        SA3 -->|"Storage Object Creator"| GCS["Cloud Storage"]

        SA4 -->|"Firestore Read/Write"| FS
        SA4 -->|"Secret Accessor"| SM
        SA4 -->|"Pub/Sub Publisher"| PubSub

        SA5 -->|"Run Invoker"| Proxy["cf-proxy"]
    end

    style SA1 fill:#4285F4,color:#fff
    style SA2 fill:#34A853,color:#fff
    style SA3 fill:#FBBC04,color:#000
    style SA4 fill:#EA4335,color:#fff
    style SA5 fill:#9C27B0,color:#fff
```
