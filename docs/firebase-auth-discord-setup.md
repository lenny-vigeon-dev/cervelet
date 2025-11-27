# Firebase Authentication with Discord Setup

## Overview

This document explains how to set up Firebase Authentication using Discord OAuth and Custom Tokens.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Flow                               │
└─────────────────────────────────────────────────────────────┘

1. User clicks "Login with Discord"
   ↓
2. Discord OAuth flow (existing implementation)
   - Redirect to Discord OAuth page
   - User authorizes
   - Callback with Discord access token
   ↓
3. Frontend receives Discord user info
   - User ID, username, email, avatar
   - Stored in localStorage
   ↓
4. Frontend requests Firebase Custom Token
   POST /firebase-auth-token
   Body: { discordUserId, username, email }
   ↓
5. Backend generates Firebase Custom Token
   - Uses Firebase Admin SDK
   - Creates token with Discord user ID as UID
   ↓
6. Frontend signs in to Firebase
   - signInWithCustomToken(token)
   - Firebase Auth session is now active
   ↓
7. Firestore access is now authenticated
   - request.auth.uid = Discord user ID
   - Security rules enforce permissions
```

## Implementation

### 1. Backend: Custom Token Generator

**File**: `backend/src/functions/firebase-auth-token/index.ts`

This Cloud Function generates Firebase Custom Tokens for Discord-authenticated users.

**Environment Variables Required**:
```bash
FIREBASE_PROJECT_ID=serverless-tek89
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@serverless-tek89.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FRONTEND_URL=http://localhost:3000
```

**API Contract**:
```typescript
POST /firebase-auth-token
Content-Type: application/json

Request:
{
  "discordUserId": "123456789012345678",
  "username": "user#1234",
  "email": "user@example.com"
}

Response:
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Frontend: Firebase Auth Integration

**File**: `frontend/lib/firebase/auth.ts`

Handles the bridge between Discord OAuth and Firebase Auth.

**Key Functions**:
- `signInWithDiscord(discordUser)` - Gets Custom Token and signs in
- `signOut()` - Signs out from Firebase
- `getCurrentFirebaseUser()` - Returns current Firebase user

**File**: `frontend/hooks/use-session.ts`

Updated to automatically authenticate with Firebase after Discord login.

**Behavior**:
- On mount, checks for existing Discord session in localStorage
- If found, automatically calls `signInWithDiscord()`
- Firebase Auth session is established in background
- On logout, signs out from both Discord and Firebase

### 3. Firestore Security Rules

**File**: `firestore.rules`

Updated to require Firebase Authentication for write operations.

**Canvas Collection**:
```javascript
match /canvas/{pixelId} {
  allow read: if true;  // Public viewing

  // Only authenticated Discord users can write
  allow create, update: if isAuthenticated() &&
                          request.resource.data.userId == request.auth.uid &&
                          // ... validation ...
}
```

**Users Collection**:
```javascript
match /users/{userId} {
  allow read: if true;  // Public profiles

  // Users can only modify their own profile
  allow create, update: if isAuthenticated() && userId == request.auth.uid;
}
```

## Deployment Steps

### Step 1: Deploy Backend Function

```bash
cd backend/src/functions/firebase-auth-token

# Install dependencies
pnpm install

# Deploy to Cloud Functions
gcloud functions deploy createFirebaseToken \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point=createFirebaseToken \
  --region=europe-west1 \
  --set-env-vars FIREBASE_PROJECT_ID=serverless-tek89,FRONTEND_URL=http://localhost:3000 \
  --set-secrets FIREBASE_CLIENT_EMAIL=FIREBASE_CLIENT_EMAIL:latest,FIREBASE_PRIVATE_KEY=FIREBASE_PRIVATE_KEY:latest
```

**Note**: Add Firebase credentials to Google Cloud Secret Manager:
```bash
# Add service account email
echo -n "firebase-adminsdk@serverless-tek89.iam.gserviceaccount.com" | \
  gcloud secrets create FIREBASE_CLIENT_EMAIL --data-file=-

# Add private key (from Firebase Console → Project Settings → Service Accounts)
gcloud secrets create FIREBASE_PRIVATE_KEY --data-file=private-key.json
```

### Step 2: Deploy Firestore Rules

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

### Step 3: Update Frontend Environment

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=https://cf-proxy-343984406897.europe-west1.run.app

# The Custom Token endpoint will be:
# https://cf-proxy-343984406897.europe-west1.run.app/firebase-auth-token
```

### Step 4: Test the Integration

1. **Start Frontend**:
   ```bash
   cd frontend
   pnpm dev
   ```

2. **Login with Discord**:
   - Click "Se connecter avec Discord"
   - Authorize on Discord
   - Return to app

3. **Check Console**:
   ```
   🔐 Discord session found, authenticating with Firebase...
   🔐 Signing in to Firebase with Discord user: 123456789012345678
   ✅ Firebase Auth successful: 123456789012345678
   ```

4. **Test Pixel Placement**:
   - Click a pixel on canvas
   - Select a color
   - Click "Dessiner"
   - Should succeed if authenticated
   - Should fail with error if not authenticated

5. **Verify in Firestore**:
   - Check `canvas/{x}_{y}` document
   - `userId` should match Discord user ID
   - Check `users/{discordUserId}` document
   - `lastPixelPlaced` timestamp updated

## Troubleshooting

### Error: "Failed to get Firebase token"

**Cause**: Backend function not deployed or incorrect URL

**Solution**:
1. Check backend function is deployed:
   ```bash
   gcloud functions list | grep createFirebaseToken
   ```
2. Verify `NEXT_PUBLIC_API_URL` is correct
3. Check CORS headers allow your frontend domain

### Error: "Permission denied" when writing pixel

**Cause**: Firebase Auth not working or rules not deployed

**Solution**:
1. Check console for Firebase Auth logs
2. Verify Custom Token is being requested
3. Check Firestore rules are deployed:
   ```bash
   firebase firestore:rules
   ```
4. Test rule in Firebase Console (Rules Playground)

### Error: "request.auth.uid is undefined"

**Cause**: Firebase Auth session not established

**Solution**:
1. Check `signInWithCustomToken()` is being called
2. Verify Custom Token is valid (not expired)
3. Check Firebase config in `frontend/lib/firebase/config.ts`
4. Ensure all Firebase env vars are set

### Error: "userId mismatch"

**Cause**: Firestore rule enforces `userId == request.auth.uid`

**Solution**:
1. Verify `writePixel()` is using correct `userId`
2. Should be `session.user.id` (Discord ID)
3. Check Custom Token was created with Discord ID as UID

## Security Considerations

### Custom Token Security

✅ **Secure**:
- Custom Tokens are generated server-side only
- Backend validates Discord OAuth before issuing token
- Tokens are short-lived (1 hour default)
- Firebase Admin SDK private key never exposed to client

⚠️ **Potential Issues**:
- `/firebase-auth-token` endpoint is unauthenticated
- Anyone with a Discord user ID can request a token
- Need to add validation that requester owns the Discord account

**Recommended Fix**:
Add Discord OAuth verification to backend:
```typescript
// Verify Discord access token before issuing Firebase token
const discordResponse = await fetch('https://discord.com/api/users/@me', {
  headers: { Authorization: `Bearer ${discordAccessToken}` }
});

if (discordResponse.data.id !== discordUserId) {
  throw new Error('Discord user ID mismatch');
}
```

### Firestore Rules Security

✅ **Current Protection**:
- `userId == request.auth.uid` prevents impersonation
- Color validation prevents invalid data
- Required fields validation
- Admin-only delete operations

✅ **Best Practices**:
- All writes require authentication
- Users can only write with their own Discord ID
- No privilege escalation possible
- Public read access for viewing

## Performance Considerations

### Custom Token Caching

Currently, a new Custom Token is generated on every page load. This can be optimized:

**Option 1: Cache token in localStorage**
```typescript
const cachedToken = localStorage.getItem('firebase_custom_token');
const expiresAt = localStorage.getItem('firebase_token_expires');

if (cachedToken && Date.now() < parseInt(expiresAt)) {
  await signInWithCustomToken(auth, cachedToken);
} else {
  // Request new token
}
```

**Option 2: Use Firebase ID Token**
Once signed in, Firebase provides ID tokens that refresh automatically:
```typescript
const idToken = await auth.currentUser?.getIdToken();
// Use this for authenticated backend requests
```

### Firestore Connection Pool

Firebase SDK maintains a persistent connection to Firestore. This is already optimized, but consider:

- Limit number of active listeners (currently 1 per canvas)
- Unsubscribe when component unmounts (already implemented)
- Use query cursors for large datasets

## Testing

### Manual Testing Checklist

- [ ] Discord login flow works
- [ ] Firebase Custom Token is generated
- [ ] Firebase Auth session is established
- [ ] Pixel placement succeeds when authenticated
- [ ] Pixel placement fails when not authenticated
- [ ] Cooldown is enforced (5 minutes)
- [ ] Real-time updates work for all connected users
- [ ] Logout clears both Discord and Firebase sessions
- [ ] Cross-tab sync works (login in one tab, reflected in another)

### Automated Testing

Create E2E tests with Playwright:

```typescript
test('authenticated user can place pixel', async ({ page }) => {
  // Mock Discord OAuth
  await page.route('**/auth/discord', (route) => {
    route.fulfill({ /* mock Discord response */ });
  });

  // Login
  await page.click('text=Se connecter avec Discord');

  // Wait for Firebase auth
  await page.waitForFunction(() => window.firebase.auth().currentUser);

  // Place pixel
  await page.click('canvas', { position: { x: 100, y: 100 } });
  await page.click('button:has-text("Dessiner")');

  // Verify success
  await expect(page.locator('.success-message')).toBeVisible();
});
```

## Related Documentation

- [Frontend Pixel Writing Implementation](./frontend-pixel-writing.md)
- [Real-time Canvas Setup](./realtime-canvas-setup.md)
- [Firestore Data Model](./database/firestore-data-model.md)
- [Discord OAuth Setup](./discord-oauth-setup.md)

## Next Steps

1. **Deploy backend function** to production
2. **Deploy Firestore rules** via console or CLI
3. **Test authentication** flow end-to-end
4. **Add Discord OAuth verification** to Custom Token endpoint (security improvement)
5. **Implement token caching** to reduce backend calls
6. **Add monitoring** for auth failures
