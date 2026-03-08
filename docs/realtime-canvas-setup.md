# Real-time Canvas Implementation

## Overview

The canvas uses a **hybrid approach** for optimal performance and real-time collaboration:

1. **Initial Load**: Canvas snapshot from Cloud Storage (PNG image)
2. **Real-time Updates**: Firestore listeners for live pixel changes
3. **Periodic Refresh**: Snapshot refreshes every 60 seconds to prevent drift

This approach minimizes Firestore reads while providing instant updates to all users.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  PixelCanvas Component                                 │ │
│  │  - Renders canvas with zoom/pan controls               │ │
│  │  - Displays real-time status indicator                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           ▼                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  useRealtimeCanvas Hook                                │ │
│  │  - Loads snapshot from Cloud Storage                   │ │
│  │  - Subscribes to Firestore pixel updates              │ │
│  │  - Manages state and errors                            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        ▼                                     ▼
┌──────────────────┐              ┌──────────────────────┐
│  Cloud Storage   │              │     Firestore        │
│                  │              │                      │
│  canvas/         │              │  Collection: canvas  │
│    latest.png    │              │  Doc ID: {x}_{y}     │
│                  │              │  Fields:             │
│  - Fast CDN      │              │  - color             │
│  - Low cost      │              │  - userId            │
│  - Cached        │              │  - lastUpdatedAt     │
└──────────────────┘              └──────────────────────┘
        ▲                                     ▲
        │                                     │
        └─────────────┬───────────────────────┘
                      │
        ┌─────────────────────────────────────┐
        │  Backend (Serverless Functions)     │
        │                                     │
        │  1. write-pixels-worker             │
        │     - Writes pixels to Firestore    │
        │     - Rate limiting                 │
        │                                     │
        │  2. canvas-snapshot-generator       │
        │     - Generates PNG from Firestore  │
        │     - Uploads to Cloud Storage      │
        │     - Runs on schedule/trigger      │
        └─────────────────────────────────────┘
```

## Components

### 1. Firebase Configuration

**File**: [frontend/lib/firebase/config.ts](../frontend/lib/firebase/config.ts)

Initializes Firebase client SDK for Firestore real-time listeners.

```typescript
import { getFirestoreDb } from '@/lib/firebase/config';

const db = getFirestoreDb();
```

### 2. useRealtimeCanvas Hook

**File**: [frontend/hooks/use-realtime-canvas.ts](../frontend/hooks/use-realtime-canvas.ts)

Custom React hook that manages:
- Loading canvas snapshot from Cloud Storage
- Subscribing to Firestore pixel updates
- Filtering updates (only pixels after snapshot timestamp)
- Periodic snapshot refresh

**Usage**:
```typescript
const {
  snapshotImage,      // HTMLImageElement from Cloud Storage
  realtimePixels,     // Array of pixels updated in real-time
  isLoading,          // Loading state
  isListening,        // Whether Firestore listener is active
  error,              // Error state
  refreshSnapshot,    // Manual refresh function
  disconnect          // Unsubscribe from real-time updates
} = useRealtimeCanvas({
  canvasId: 'main-canvas',
  enableRealtime: true,
  refreshInterval: 60000
});
```

### 3. PixelCanvas Component

**File**: [frontend/components/pixel-canvas.tsx](../frontend/components/pixel-canvas.tsx)

Main canvas component with:
- Real-time rendering (snapshot + live pixels)
- Zoom and pan controls
- Pixel selection and drawing
- Status indicator (Live/Offline)
- Real-time pixel counter

**Props**:
```typescript
<PixelCanvas
  enableRealtime={true}
  canvasId="main-canvas"
  scale={8}
/>
```

## Data Flow

### 1. Initial Load (Cold Start)

```
User opens page
    │
    ▼
useRealtimeCanvas hook initializes
    │
    ▼
Load snapshot from Cloud Storage
GET https://storage.googleapis.com/.../canvas/latest.png
    │
    ▼
Render snapshot on canvas
    │
    ▼
Subscribe to Firestore for pixels after snapshot timestamp
```

### 2. Real-time Updates

```
User A places pixel via Discord bot
    │
    ▼
Backend writes to Firestore
Collection: canvas
Doc: {x}_{y}
    │
    ▼
Firestore triggers onSnapshot listener
    │
    ▼
All connected clients receive update
    │
    ▼
Update rendered on canvas immediately
```

### 3. Periodic Refresh

```
60 seconds elapsed
    │
    ▼
Reload snapshot from Cloud Storage
    │
    ▼
Clear real-time pixel buffer
    │
    ▼
Re-subscribe to new updates
```

## Firestore Query Strategy

The hook uses a smart query to minimize reads:

```typescript
// Only listen to pixels updated AFTER snapshot was loaded
query(
  collection(db, 'canvas'),
  where('lastUpdatedAt', '>', snapshotTimestamp),
  orderBy('lastUpdatedAt', 'desc')
)
```

This ensures:
- No duplicate data (snapshot already has historical pixels)
- Only new changes are fetched
- Minimal Firestore read costs

## Environment Variables

**Frontend** ([.env.local](../frontend/.env.local)):

```bash
# Firebase Project ID
NEXT_PUBLIC_FIREBASE_PROJECT_ID=serverless-488811

# Canvas Snapshot URL
NEXT_PUBLIC_CANVAS_SNAPSHOT_URL=https://storage.googleapis.com/serverless-488811-canvas-snapshots/canvas/latest.png

# Optional: Firestore Emulator for local dev
# NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=localhost:8080
```

## Performance Optimization

### Cost Optimization

| Approach | Firestore Reads | Cloud Storage Bandwidth |
|----------|----------------|------------------------|
| **Only Firestore** | 1M pixels = 1M reads | 0 |
| **Hybrid (snapshot + real-time)** | Only new pixels (~100-1000/min) | 1 snapshot load (~100KB) |

**Savings**: ~99% reduction in Firestore reads for initial load

### Latency Optimization

- **Snapshot**: Loaded via CDN (fast global delivery)
- **Real-time updates**: Firestore listeners (sub-second latency)
- **Periodic refresh**: Prevents drift from accumulating too many overlay pixels

### Scalability

- **Cloud Storage**: Handles millions of concurrent requests
- **Firestore**: Auto-scales for read/write load
- **No backend polling**: Firestore listeners are push-based (efficient)

## Firestore Security Rules

Required rules for client-side access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to canvas pixels
    match /canvas/{pixelId} {
      allow read: if true;
      allow write: if false;  // Only backend can write
    }
  }
}
```

⚠️ **Important**:
- Frontend has **read-only** access to Firestore
- Writes are handled by backend serverless functions
- This prevents abuse and enforces rate limiting

## Testing

### Manual Test

1. Start frontend dev server:
   ```bash
   cd frontend
   pnpm dev
   ```

2. Open browser console to see real-time logs:
   ```
   ✅ Canvas snapshot loaded
   🔴 Subscribing to real-time pixel updates...
   🎨 Received 1 pixel update(s)
   ```

3. Place a pixel via Discord bot

4. Verify pixel appears in real-time on frontend

### Emulator Testing

For local development with Firestore emulator:

```bash
# Start Firestore emulator
gcloud emulators firestore start

# Set env var
export NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=localhost:8080

# Run frontend
pnpm dev
```

## Troubleshooting

### Issue: "Failed to load canvas snapshot"

**Cause**: Snapshot doesn't exist in Cloud Storage

**Solution**: Run snapshot generator function:
```bash
curl -X POST https://REGION-PROJECT.cloudfunctions.net/canvas-snapshot-generator
```

### Issue: "Firestore permission denied"

**Cause**: Security rules not deployed

**Solution**: Deploy Firestore rules:
```bash
firebase deploy --only firestore:rules
```

### Issue: Real-time updates not appearing

**Checks**:
1. Console shows "🔴 Subscribing to real-time pixel updates..."
2. Network tab shows WebSocket connection to Firestore
3. Firestore has correct pixel format: `{x}_{y}`

## Future Improvements

1. **Compression**: Use WebP instead of PNG for smaller snapshot size
2. **Progressive Loading**: Load low-res snapshot first, then high-res
3. **Delta Compression**: Only send changed regions instead of full snapshot
4. **WebSocket fallback**: For environments where Firestore listeners fail
5. **Offline support**: Cache snapshot for offline viewing

## Related Documentation

- [Firestore Data Model](./database/firestore-data-model.md)
- [Canvas Snapshot Generator](../backend/src/functions/canvas-snapshot-generator/README.md)
- [Write Pixels Worker](../backend/src/functions/write-pixels-worker/README.md)
