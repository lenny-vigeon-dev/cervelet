# Frontend Pixel Writing Implementation

## Overview

The frontend now supports placing pixels directly from the web interface by writing to Firestore using the Firebase JavaScript SDK.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Frontend (React)                    │
│                                                      │
│  User clicks pixel → Selects color → Clicks "Draw"  │
│                          │                           │
│                          ▼                           │
│              writePixel() function                   │
│          (lib/firebase/write-pixel.ts)              │
│                          │                           │
│         ┌────────────────┴────────────────┐         │
│         ▼                                 ▼         │
│   Check cooldown              Write to Firestore    │
│   (users collection)          (canvas collection)   │
│                                                      │
└──────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────┐
│                    Firestore                         │
│                                                      │
│  Collection: canvas                                  │
│  Doc ID: {x}_{y}                                    │
│  Fields:                                            │
│  - canvasId: string                                 │
│  - x: number                                        │
│  - y: number                                        │
│  - color: number (RGB as integer)                   │
│  - userId: string                                   │
│  - lastUpdatedAt: Timestamp                         │
│                                                      │
│  Collection: users                                   │
│  Doc ID: {userId}                                   │
│  Fields:                                            │
│  - id: string                                       │
│  - lastPixelPlaced: Timestamp                       │
│  - updatedAt: Timestamp                             │
└──────────────────────────────────────────────────────┘
                          │
                          ▼
        Real-time listener updates all clients
```

## Files Modified/Created

### 1. **frontend/lib/firebase/write-pixel.ts** (Created)

Client-side function for writing pixels to Firestore.

**Key features:**
- Validates user authentication
- Checks cooldown (5 minutes)
- Writes pixel to `canvas` collection
- Updates user's `lastPixelPlaced` timestamp
- Returns success/error result

**Usage:**
```typescript
import { writePixel } from '@/lib/firebase/write-pixel';

const result = await writePixel({
  canvasId: 'main-canvas',
  x: 100,
  y: 200,
  color: 0xFF0000, // Red
  userId: 'anon_123456'
});

if (result.success) {
  console.log('Pixel placed!');
} else {
  console.error(result.error);
}
```

### 2. **frontend/hooks/use-user.ts** (Created)

Hook for managing user authentication.

**Current behavior:**
- Generates anonymous user ID stored in localStorage
- Format: `anon_{timestamp}_{random}`

**TODO:**
- Replace with Discord OAuth authentication
- Integrate with existing AuthCard component

**Usage:**
```typescript
import { useUser } from '@/hooks/use-user';

const { user, isLoading } = useUser();

if (user) {
  console.log(user.id); // "anon_1234567890_abc123"
  console.log(user.username); // "Anonymous 3123"
  console.log(user.isAnonymous); // true
}
```

### 3. **frontend/components/pixel-canvas.tsx** (Modified)

Updated to call `writePixel()` when user places a pixel.

**Changes:**
- Added `useUser()` hook for authentication
- Modified `drawPixel()` to be async and call `writePixel()`
- Added optimistic update: pixel shows immediately, reverts on error
- Added loading state (`isDrawing`)
- Added error display
- Disabled button during pixel placement

**User flow:**
1. User clicks pixel on canvas
2. Selects color from palette
3. Clicks "Dessiner" button
4. Button shows "Placement..." and is disabled
5. Pixel appears immediately (optimistic update)
6. Write to Firestore in background
7. On success: pixel stays, Firestore real-time listener confirms
8. On error: pixel is removed, error message shown

### 4. **firestore.rules** (Modified)

Updated security rules to allow anonymous pixel writing.

**Changes:**

#### Canvas Collection:
```javascript
match /canvas/{pixelId} {
  allow read: if true;

  // Anyone can write (including anonymous)
  allow create, update: if request.resource.data.keys().hasAll([
    'canvasId', 'x', 'y', 'color', 'userId', 'lastUpdatedAt'
  ]) &&
  request.resource.data.color >= 0 &&
  request.resource.data.color <= 16777215;
}
```

#### Users Collection:
```javascript
match /users/{userId} {
  allow read: if true;

  // Allow anonymous users (userId matches 'anon_*')
  allow create, update: if request.auth != null ||
    (request.resource.data.id is string &&
     request.resource.data.id.matches('anon_.*'));
}
```

## Deployment

### 1. Deploy Firestore Rules

**Option A: Firebase Console**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: `serverless-tek89`
3. Navigate to Firestore Database → Rules
4. Copy content from `firestore.rules`
5. Click "Publish"

**Option B: Firebase CLI**
```bash
# From project root
firebase deploy --only firestore:rules
```

### 2. Test the Implementation

1. Start frontend dev server:
   ```bash
   cd frontend
   pnpm dev
   ```

2. Open http://localhost:3000

3. Click a pixel on the canvas

4. Select a color

5. Click "Dessiner"

6. Verify:
   - Button shows "Placement..."
   - Pixel appears immediately
   - No errors in console
   - Firestore shows pixel in `canvas` collection
   - Real-time listener updates other clients

## Rate Limiting

### Current Implementation

**Cooldown:** 5 minutes between pixels per user

**Enforcement:**
- Client-side: `writePixel()` checks `users/{userId}/lastPixelPlaced`
- If cooldown active, returns error with remaining time

**Example error:**
```
Cooldown active! Wait 3 more minutes
```

### Future Improvements

1. **Server-side enforcement:**
   - Add Cloud Function trigger on `canvas` write
   - Reject writes if cooldown not expired
   - Prevents client-side bypass

2. **Progressive cooldown:**
   - First pixel: no cooldown
   - Subsequent pixels: increasing cooldown (1min, 5min, 15min)

3. **Premium users:**
   - Shorter cooldown for authenticated Discord users
   - No cooldown for admins

## Color Format

Colors are stored as integers (0x000000 to 0xFFFFFF).

**Conversion:**

```typescript
// Hex string → Integer
const colorInt = parseInt('#FF0000'.replace('#', ''), 16);
// → 16711680

// Integer → Hex string
const colorHex = '#' + colorInt.toString(16).padStart(6, '0');
// → "#ff0000"

// Integer → RGB components
const r = (colorInt >> 16) & 0xFF;
const g = (colorInt >> 8) & 0xFF;
const b = colorInt & 0xFF;
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Permission denied` | Firestore rules not deployed | Deploy rules via console or CLI |
| `User not authenticated` | User object is null | Check localStorage for anonymous ID |
| `Cooldown active! Wait X minutes` | User placed pixel recently | Wait for cooldown to expire |
| `Invalid color value` | Color outside 0x000000-0xFFFFFF | Validate color picker values |
| `Failed to check cooldown` | Firestore read error | Check network, Firebase config |

### Error Display

Errors are shown in a red banner at the top-left of the canvas:

```typescript
{(error || drawError) && (
  <div className="absolute top-4 left-4 z-20 bg-red-900/80 ...">
    <span className="text-xs text-red-200">
      {drawError || `Error: ${error.message}`}
    </span>
  </div>
)}
```

## Real-time Synchronization

### How It Works

1. **User A** places pixel at (100, 200) with color red
2. `writePixel()` writes to Firestore `canvas/100_200`
3. **User B** has Firestore real-time listener active
4. User B's listener receives update immediately
5. Pixel appears on User B's canvas in <1 second

### Optimistic Updates

The UI shows pixels **before** Firestore confirms the write:

```typescript
// 1. Show pixel immediately
setDrawnPixels([...drawnPixels, { x, y, color }]);

// 2. Write to Firestore
const result = await writePixel(...);

// 3. On error, remove pixel
if (!result.success) {
  setDrawnPixels(drawnPixels.filter(p => p.x !== x || p.y !== y));
}
```

This creates a snappy UX where pixels appear instantly.

## Security Considerations

### Current Security Model

⚠️ **WARNING:** Current implementation allows anonymous pixel writing with minimal validation. This is acceptable for MVP but should be improved for production.

**Current protections:**
- ✅ Color value validation (0x000000-0xFFFFFF)
- ✅ Required field validation (canvasId, x, y, color, userId, lastUpdatedAt)
- ✅ Client-side cooldown check
- ❌ No server-side cooldown enforcement
- ❌ No IP-based rate limiting
- ❌ No abuse prevention

### Production Security Checklist

Before going to production:

1. **Authentication:**
   - [ ] Implement Discord OAuth
   - [ ] Remove anonymous user support
   - [ ] Verify `request.auth.uid` in Firestore rules

2. **Rate Limiting:**
   - [ ] Add Cloud Function trigger for server-side cooldown
   - [ ] Implement IP-based rate limiting (Cloud Armor)
   - [ ] Add Firestore read quotas

3. **Abuse Prevention:**
   - [ ] Add honeypot pixels
   - [ ] Detect bot patterns
   - [ ] Implement ban system

4. **Canvas Bounds:**
   - [ ] Validate x/y coordinates against canvas dimensions
   - [ ] Reject out-of-bounds writes

## Integration with Backend Worker

The frontend `writePixel()` is **parallel** to the backend `write-pixels-worker`:

| Feature | Frontend | Backend Worker |
|---------|----------|----------------|
| **Trigger** | User clicks "Dessiner" | Discord slash command |
| **Authentication** | Anonymous user ID | Discord user ID |
| **Cooldown** | Client-side check | Server-side check |
| **Firestore** | Direct write via SDK | Direct write via Admin SDK |
| **Discord feedback** | ❌ No | ✅ Yes (interaction followup) |

Both write to the same Firestore collection (`canvas`), so pixels from Discord and web appear in real-time for all users.

## Future Enhancements

1. **Undo/Redo:**
   - Store pixel history client-side
   - Allow users to undo their last pixel

2. **Brush sizes:**
   - 1x1, 2x2, 3x3 pixel brushes
   - Costs more cooldown time

3. **Color picker:**
   - Full RGB color picker
   - Recent colors history
   - Color palettes

4. **User stats:**
   - Total pixels placed
   - Leaderboard
   - Pixel heatmap

5. **Canvas layers:**
   - Multiple canvases
   - Canvas selection UI

6. **Collaboration:**
   - Show cursors of other users
   - Real-time user count

## Related Documentation

- [Real-time Canvas Setup](./realtime-canvas-setup.md)
- [Firestore Data Model](./database/firestore-data-model.md)
- [Write Pixels Worker](../backend/src/functions/write-pixels-worker/README.md)
