# Firestore Data Model

## Overview

This document describes the NoSQL data model for the collaborative pixel art application (r/place clone) using Google Cloud Firestore.

## Collections Structure

### 1. `canvases` Collection

Stores canvas metadata and configuration.

**Document ID:** Auto-generated or custom (e.g., `main-canvas`)

**Document Structure:**
```typescript
{
  id: string;              // Document ID
  width: number;           // Canvas width in pixels
  height: number;          // Canvas height in pixels
  version: number;         // Canvas version number
  createdAt: Timestamp;    // Creation timestamp
  updatedAt: Timestamp;    // Last update timestamp
  totalPixels: number;     // Total pixels placed (denormalized count)
}
```

**Indexes:**
- None required (small collection)

---

### 2. `pixels` Collection

Stores individual pixel data. Uses composite document IDs for efficient lookups.

**Document ID:** `{canvasId}_{x}_{y}` (e.g., `main-canvas_100_250`)

**Document Structure:**
```typescript
{
  canvasId: string;        // Reference to canvas
  x: number;               // X coordinate
  y: number;               // Y coordinate
  color: number;           // Color value (integer representation)
  userId: string | null;   // User ID who placed the pixel
  updatedAt: Timestamp;    // When pixel was last updated
}
```

**Indexes:**
- Composite index: `canvasId ASC, updatedAt DESC` - for fetching recent pixels
- Composite index: `userId ASC, updatedAt DESC` - for user pixel history

**Query Patterns:**
- Get all pixels for a canvas: Query by `canvasId`
- Get recent pixels: Query by `canvasId` + order by `updatedAt`
- Get user's pixels: Query by `userId` + order by `updatedAt`

---

### 3. `users` Collection

Stores user information and statistics.

**Document ID:** Auto-generated or custom user ID

**Document Structure:**
```typescript
{
  id: string;              // Document ID
  username: string;        // Unique username
  lastPixelPlaced: Timestamp | null;  // Last pixel placement time
  totalPixelsPlaced: number;           // Total count of pixels placed
  createdAt: Timestamp;    // Account creation timestamp
}
```

**Indexes:**
- Single field index: `username ASC` - for username lookups and uniqueness

**Query Patterns:**
- Find user by username
- Get user statistics

---

### 4. `pixelHistory` Collection

Stores audit trail of all pixel changes (append-only).

**Document ID:** Auto-generated

**Document Structure:**
```typescript
{
  id: string;              // Auto-generated document ID
  canvasId: string;        // Reference to canvas
  x: number;               // X coordinate
  y: number;               // Y coordinate
  color: number;           // Color value
  userId: string | null;   // User who placed the pixel
  createdAt: Timestamp;    // When this history entry was created
}
```

**Indexes:**
- Composite index: `canvasId ASC, createdAt DESC` - for canvas history queries
- Composite index: `canvasId ASC, x ASC, y ASC, createdAt DESC` - for pixel-specific history

**Query Patterns:**
- Get canvas history: Query by `canvasId` + order by `createdAt DESC`
- Get history for specific pixel: Query by `canvasId`, `x`, `y` + order by `createdAt DESC`

---

## Alternative: Subcollections Approach

For better data organization and automatic cleanup, we can use subcollections:

### Structure:
```
canvases/{canvasId}
  └── pixels/{pixelId}           // Subcollection: pixels for this canvas
  └── history/{historyId}        // Subcollection: history for this canvas

users/{userId}
  └── pixels/{pixelId}           // Subcollection: pixels placed by this user
```

**Pros:**
- Better data hierarchy
- Automatic cleanup when parent document is deleted
- Clearer data relationships

**Cons:**
- Can't query across all canvases easily
- Slightly more complex querying

**Recommendation:** Use root-level collections for flexibility, especially if you plan to have multiple canvases and need cross-canvas queries.

---

## Data Migration Strategy

### From PostgreSQL (Prisma) to Firestore:

1. **Canvas Table → `canvases` Collection**
   - Direct mapping, add `totalPixels` field (calculate on migration)

2. **Pixel Table (Composite Key) → `pixels` Collection**
   - Convert composite key `(canvasId, x, y)` to document ID: `{canvasId}_{x}_{y}`
   - All other fields map directly

3. **User Table → `users` Collection**
   - Direct mapping, UUID becomes document ID

4. **PixelHistory Table → `pixelHistory` Collection**
   - Direct mapping, auto-increment ID becomes auto-generated document ID
   - All other fields map directly

---

## Firestore-Specific Considerations

### Document Size Limits
- Maximum document size: 1MB
- For large canvases (e.g., 1000x1000), individual pixels as separate documents is the right approach
- Avoid storing entire pixel arrays in a single document

### Pricing Optimization
- **Reads:** Charged per document read
  - Loading full canvas: Consider caching or progressive loading
  - Use `get()` for individual pixels, `where()` queries for ranges

- **Writes:** Charged per document write
  - Pixel updates are single-document writes (efficient)
  - History entries are append-only (efficient)

- **Storage:** Charged per GB stored
  - Consider data retention policies for `pixelHistory`
  - Archive old history data if needed

### Real-time Capabilities
Firestore supports real-time listeners:
```typescript
// Listen to canvas pixel changes
db.collection('pixels')
  .where('canvasId', '==', 'main-canvas')
  .onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'modified') {
        // Update UI with new pixel
      }
    });
  });
```

### Security Rules
Implement Firestore Security Rules to control access:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Canvases are readable by all, writable by admins only
    match /canvases/{canvasId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }

    // Pixels are readable by all, writable by authenticated users
    match /pixels/{pixelId} {
      allow read: if true;
      allow create, update: if request.auth != null;
      allow delete: if false;  // Never allow deletion
    }

    // Users can read all user data, but only write their own
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // History is readable by all, writable only by system
    match /pixelHistory/{historyId} {
      allow read: if true;
      allow write: if request.auth != null;  // Through backend only
    }
  }
}
```

---

## Performance Optimization

### Indexing Strategy
1. **Composite Indexes** (created automatically or manually):
   - `pixels`: `(canvasId, updatedAt DESC)`
   - `pixels`: `(userId, updatedAt DESC)`
   - `pixelHistory`: `(canvasId, createdAt DESC)`
   - `pixelHistory`: `(canvasId, x, y, createdAt DESC)`

2. **Single Field Indexes** (automatic):
   - `users.username`

### Caching Strategy
1. **Client-side caching:**
   - Cache full canvas data locally
   - Use real-time listeners for updates only

2. **Server-side caching:**
   - Use Firestore automatic caching
   - Consider Redis for high-frequency reads

### Query Optimization
1. **Pagination:**
   ```typescript
   // Get pixels with pagination
   const query = db.collection('pixels')
     .where('canvasId', '==', canvasId)
     .orderBy('updatedAt', 'desc')
     .limit(100)
     .startAfter(lastDoc);
   ```

2. **Batch Operations:**
   ```typescript
   // Batch write for multiple pixels
   const batch = db.batch();
   pixels.forEach(pixel => {
     const ref = db.collection('pixels').doc(`${canvasId}_${pixel.x}_${pixel.y}`);
     batch.set(ref, pixel);
   });
   await batch.commit();  // Single network round-trip
   ```

---

## Comparison: PostgreSQL vs Firestore

| Aspect | PostgreSQL (Cloud SQL) | Firestore |
|--------|------------------------|-----------|
| **Data Model** | Relational tables with foreign keys | NoSQL document collections |
| **Queries** | SQL with JOINs | NoSQL queries (no JOINs) |
| **Scalability** | Vertical scaling (upgrade instance) | Automatic horizontal scaling |
| **Cost** | Fixed instance cost (~$10-500/month) | Pay-per-usage ($0.18/GB storage, $0.06/100K reads) |
| **Real-time** | Requires additional setup (WebSockets) | Built-in real-time listeners |
| **Transactions** | ACID transactions | ACID transactions (limited) |
| **Composite Keys** | Native support | Workaround with document IDs |
| **Schema** | Rigid schema (migrations required) | Flexible schema (schemaless) |
| **Backup** | Automated backups, PITR | Automated daily backups |
| **Best For** | Complex relational data, strong consistency | Real-time apps, flexible schema, auto-scaling |

---

## Conclusion

The Firestore data model maintains the same logical structure as the PostgreSQL schema but adapts it for NoSQL best practices:
- Uses collections instead of tables
- Leverages document IDs for composite keys
- Optimizes for read/write patterns
- Enables real-time capabilities
- Provides automatic scaling

This design supports the r/place use case efficiently while taking advantage of Firestore's strengths.
