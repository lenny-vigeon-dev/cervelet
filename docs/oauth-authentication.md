# OAuth Authentication Documentation

This document describes the Discord OAuth2 authentication implementation in the Pixelhub frontend application and how it integrates with the serverless API Gateway backend.

## Architecture Overview

The authentication flow follows a **delegated OAuth pattern** where:

1. **Frontend** (Next.js): Initiates OAuth flow and manages session state
2. **API Gateway** (Backend): Handles OAuth callbacks, token exchange, and session management
3. **Discord OAuth2**: Third-party authentication provider

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Frontend  │─────▶│ API Gateway  │─────▶│   Discord   │
│  (Next.js)  │      │  (Serverless)│      │   OAuth2    │
└─────────────┘      └──────────────┘      └─────────────┘
       │                    │                      │
       │                    │◀─────────────────────┘
       │◀───────────────────┘
       │  (Session Cookie)
```

## Environment Configuration

### Frontend Configuration

Add to `.env.local`:

```bash
# API Gateway base URL (without trailing slash)
NEXT_PUBLIC_API_URL=https://your-api-gateway-url.com
```

### Backend Configuration

The API Gateway must be configured with:

```bash
# Discord OAuth2 Application Credentials
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret

# OAuth Callback URL
DISCORD_REDIRECT_URI=https://your-api-gateway-url.com/auth/discord/callback

# Session Configuration
SESSION_SECRET=your_secure_random_secret_key
SESSION_COOKIE_NAME=pixless_session  # or your preferred name
```

## OAuth Flow Implementation

### Step 1: User Initiates Login

User clicks the "Connect with Discord" button on the frontend:

**Frontend Component** ([app/page.tsx](../frontend/app/page.tsx)):
```tsx
<Link
  href="/auth/discord"
  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand to-brand-strong px-5 py-2.5 text-sm font-semibold text-black shadow-brand transition hover:opacity-95"
>
  {isAuthenticated
    ? `Connecté en tant que ${session.user.username}`
    : "Se connecter avec Discord"}
</Link>
```

### Step 2: Frontend Redirects to API Gateway

**Route Handler** ([app/auth/discord/route.ts](../frontend/app/auth/discord/route.ts)):
```typescript
export async function GET() {
  const authUrl = `${API_URL}/auth/discord`;
  return NextResponse.redirect(authUrl, { status: 307 });
}
```

**Endpoint**: `GET /auth/discord`

This route redirects the user to the API Gateway's Discord OAuth initiation endpoint.

### Step 3: API Gateway Redirects to Discord

The API Gateway should:
1. Generate a secure state parameter (CSRF protection)
2. Store the state in a temporary session/cache
3. Redirect to Discord's OAuth authorization URL

**Discord Authorization URL**:
```
https://discord.com/api/oauth2/authorize?
  client_id={DISCORD_CLIENT_ID}&
  redirect_uri={DISCORD_REDIRECT_URI}&
  response_type=code&
  scope=identify email&
  state={random_state_string}
```

**Required Scopes**:
- `identify`: Get user ID, username, avatar
- `email` (optional): Get user email address

### Step 4: Discord Callback to API Gateway

After user authorizes, Discord redirects to:
```
https://your-api-gateway-url.com/auth/discord/callback?code={auth_code}&state={state}
```

**API Gateway Callback Handler** must:

1. **Verify State Parameter** (CSRF protection)
2. **Exchange Code for Access Token**:
   ```http
   POST https://discord.com/api/oauth2/token
   Content-Type: application/x-www-form-urlencoded

   client_id={DISCORD_CLIENT_ID}&
   client_secret={DISCORD_CLIENT_SECRET}&
   grant_type=authorization_code&
   code={auth_code}&
   redirect_uri={DISCORD_REDIRECT_URI}
   ```

3. **Fetch User Profile**:
   ```http
   GET https://discord.com/api/users/@me
   Authorization: Bearer {access_token}
   ```

4. **Create Session**:
   - Store user data in session storage (Redis, database, etc.)
   - Generate session ID
   - Set httpOnly session cookie

5. **Redirect to Frontend**:
   ```http
   HTTP/1.1 302 Found
   Location: https://your-frontend-url.com/
   Set-Cookie: pixless_session={session_id}; HttpOnly; Secure; SameSite=Lax; Path=/
   ```

### Step 5: Session Management on Frontend

The frontend checks authentication status using the session endpoint.

## Frontend Implementation Details

### Session Fetching

**Module**: [lib/session.ts](../frontend/lib/session.ts)

```typescript
export async function fetchSession(): Promise<SessionState> {
  try {
    const payload = await serverApiRequest<SessionState>('/auth/session');
    return SessionStateSchema.parse(payload);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { user: null, isAuthenticated: false };
    }
    return { user: null, isAuthenticated: false };
  }
}
```

**Session Endpoint**: `GET /auth/session`

**Response Format**:
```json
{
  "isAuthenticated": true,
  "user": {
    "id": "123456789",
    "username": "JohnDoe",
    "avatarUrl": "https://cdn.discordapp.com/avatars/...",
    "accentColor": "#5865F2",
    "discriminator": "0"
  }
}
```

Or when not authenticated:
```json
{
  "isAuthenticated": false,
  "user": null
}
```

### Server-Side API Requests

**Module**: [lib/server-api.ts](../frontend/lib/server-api.ts)

The `serverApiRequest` function automatically forwards cookies from the incoming request to the API Gateway:

```typescript
export async function serverApiRequest<T>(
  path: string,
  { method = "GET", ...options }: ApiRequestOptions = {}
): Promise<T> {
  const headers = await enrichHeaders(method, options.headers);
  return apiRequest<T>(path, {
    ...options,
    method,
    headers,
    cache: options.cache ?? "no-store",
  });
}
```

**Key Features**:
- Forwards `Cookie` header with session cookie
- Adds `User-Agent`, `X-Forwarded-For`, `Referer` for logging
- Sets `X-Requested-With: Next.js App Router`
- Automatically includes `credentials: include` for cookie handling

### Client-Side API Requests

**Module**: [lib/api.ts](../frontend/lib/api.ts)

Client-side API calls also include credentials:

```typescript
export async function apiRequest<T>(
  path: string,
  { method = "GET", query, parseAs = "json", ...init }: ApiRequestOptions = {}
): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",  // Include cookies in requests
    ...init,
    method,
    headers,
  });
  // ... error handling
}
```

### Type Definitions

**Module**: [types/session.ts](../frontend/types/session.ts)

```typescript
export interface UserProfile {
  id: string;
  username: string;
  avatarUrl?: string;
  accentColor?: string;
  discriminator?: string;
}

export type SessionState =
  | { isAuthenticated: true; user: UserProfile }
  | { isAuthenticated: false; user: null };
```

**Validation Schema**: [lib/schemas.ts](../frontend/lib/schemas.ts)

```typescript
export const UserProfileSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatarUrl: z.string().url().optional(),
  accentColor: z.string().optional(),
  discriminator: z.string().optional(),
});

export const SessionStateSchema = z.discriminatedUnion("isAuthenticated", [
  z.object({
    isAuthenticated: z.literal(true),
    user: UserProfileSchema,
  }),
  z.object({
    isAuthenticated: z.literal(false),
    user: z.null(),
  }),
]);
```

## API Gateway Endpoints Required

The frontend expects the following endpoints from the API Gateway:

### 1. OAuth Initiation

```http
GET /auth/discord
```

**Behavior**:
- Generates secure state parameter
- Redirects to Discord OAuth authorization URL
- Returns `302 Found` with `Location` header

### 2. OAuth Callback

```http
GET /auth/discord/callback?code={code}&state={state}
```

**Behavior**:
- Validates state parameter
- Exchanges code for access token
- Fetches user profile from Discord
- Creates session and sets cookie
- Redirects to frontend URL

**Success Response**:
```http
HTTP/1.1 302 Found
Location: https://your-frontend-url.com/
Set-Cookie: pixless_session={session_id}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000
```

**Error Response**:
```http
HTTP/1.1 302 Found
Location: https://your-frontend-url.com/?error=oauth_failed
```

### 3. Session Status

```http
GET /auth/session
Cookie: pixless_session={session_id}
```

**Success Response** (200 OK):
```json
{
  "isAuthenticated": true,
  "user": {
    "id": "123456789",
    "username": "JohnDoe",
    "avatarUrl": "https://cdn.discordapp.com/avatars/...",
    "accentColor": "#5865F2",
    "discriminator": "0"
  }
}
```

**Unauthenticated Response** (401 Unauthorized):
```json
{
  "isAuthenticated": false,
  "user": null
}
```

### 4. Logout (Optional)

```http
POST /auth/logout
Cookie: pixless_session={session_id}
```

**Behavior**:
- Invalidates session
- Clears session cookie
- Returns success response

**Response**:
```json
{
  "success": true
}
```

## Security Considerations

### 1. Cookie Configuration

The session cookie **MUST** have the following attributes:

```
Set-Cookie: pixless_session={session_id};
  HttpOnly;           // Prevents JavaScript access (XSS protection)
  Secure;             // Only sent over HTTPS
  SameSite=Lax;       // CSRF protection
  Path=/;             // Available for all routes
  Max-Age=2592000     // 30 days expiration
```

### 2. CSRF Protection

- Use `state` parameter in OAuth flow
- Generate cryptographically random state values
- Store state temporarily and validate on callback
- Consider using signed cookies for additional security

### 3. Session Storage

Recommended session storage options:
- **Redis**: Fast, scalable, built-in expiration
- **DynamoDB**: Serverless-friendly, TTL support
- **Firestore**: Real-time capabilities
- **JWT**: Stateless (but requires careful key management)

### 4. CORS Configuration

If frontend and backend are on different domains, configure CORS on API Gateway:

```http
Access-Control-Allow-Origin: https://your-frontend-url.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### 5. Rate Limiting

Implement rate limiting on authentication endpoints:
- OAuth initiation: 10 requests/minute per IP
- Session check: 60 requests/minute per session
- Callback endpoint: 5 requests/minute per IP

## Discord Application Configuration

### Required Settings in Discord Developer Portal

1. Navigate to https://discord.com/developers/applications
2. Create or select your application
3. Go to **OAuth2** section
4. Add redirect URI:
   ```
   https://your-api-gateway-url.com/auth/discord/callback
   ```
5. Copy **Client ID** and **Client Secret**
6. Select OAuth2 scopes:
   - `identify` (required)
   - `email` (optional)

### Discord API Endpoints

- **Authorization**: `https://discord.com/api/oauth2/authorize`
- **Token Exchange**: `https://discord.com/api/oauth2/token`
- **User Info**: `https://discord.com/api/users/@me`

### Discord API Rate Limits

- **Token Exchange**: 1 request per second
- **User Info**: 5 requests per second
- Implement exponential backoff for 429 responses

## Testing Authentication Flow

### Manual Testing Steps

1. **Start Frontend**:
   ```bash
   cd frontend
   pnpm dev
   ```

2. **Configure Environment**:
   - Set `NEXT_PUBLIC_API_URL` to your API Gateway URL
   - Ensure API Gateway is running and configured

3. **Test Flow**:
   - Navigate to `http://localhost:3000`
   - Click "Se connecter avec Discord"
   - Authorize on Discord
   - Verify redirect back to frontend
   - Check session state in browser DevTools

### Debug Checklist

- [ ] `NEXT_PUBLIC_API_URL` is set correctly in `.env.local`
- [ ] Discord redirect URI matches exactly in Discord Developer Portal
- [ ] API Gateway responds to `/auth/discord` and `/auth/discord/callback`
- [ ] Session cookie is set with `HttpOnly` and `Secure` flags
- [ ] CORS is configured if frontend/backend are on different domains
- [ ] State parameter is validated in callback handler
- [ ] Session endpoint returns correct format

### Common Issues

**Issue**: "Invalid Redirect URI"
- **Solution**: Ensure the redirect URI in Discord Developer Portal exactly matches `DISCORD_REDIRECT_URI` in API Gateway config (including trailing slashes)

**Issue**: Session not persisting
- **Solution**: Check cookie `SameSite` attribute. For cross-domain, use `SameSite=None; Secure`

**Issue**: CORS errors
- **Solution**: Add `Access-Control-Allow-Credentials: true` and specific origin (not `*`) in API Gateway CORS config

**Issue**: 401 Unauthorized on session endpoint
- **Solution**: Verify cookies are being forwarded. Check `credentials: include` in fetch calls and that `serverApiRequest` is forwarding cookies correctly.

## Future Enhancements

### Planned Features

- [ ] **Refresh Token Support**: Implement token refresh for long-lived sessions
- [ ] **Logout Endpoint**: Add proper session invalidation
- [ ] **Session Expiry Handling**: Auto-redirect to login on session expiry
- [ ] **Multiple OAuth Providers**: Support Google, GitHub, etc.
- [ ] **Profile Management**: Allow users to update profile settings
- [ ] **Account Linking**: Link multiple OAuth accounts to one user

### Security Improvements

- [ ] **Session Rotation**: Rotate session IDs after login
- [ ] **IP Binding**: Bind sessions to IP addresses
- [ ] **Device Tracking**: Track and display active sessions
- [ ] **Two-Factor Authentication**: Optional 2FA for accounts
- [ ] **Audit Logging**: Log all authentication events

## Troubleshooting

### Enable Debug Logging

Add debug logging in the API Gateway callback handler:

```typescript
console.log('OAuth State:', { received: state, expected: storedState });
console.log('Discord Token Response:', tokenResponse);
console.log('Discord User Profile:', userProfile);
console.log('Session Created:', { sessionId, userId: userProfile.id });
```

### Verify Cookie Settings

Check if cookies are being set correctly:

```bash
# Using curl
curl -v https://your-api-gateway-url.com/auth/session \
  -H "Cookie: pixless_session=your_session_id"
```

### Test Session Endpoint

```bash
# Should return 401 when not authenticated
curl https://your-api-gateway-url.com/auth/session

# Should return user data when authenticated
curl https://your-api-gateway-url.com/auth/session \
  -H "Cookie: pixless_session=valid_session_id"
```

## Resources

- [Discord OAuth2 Documentation](https://discord.com/developers/docs/topics/oauth2)
- [Next.js Authentication Patterns](https://nextjs.org/docs/authentication)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [Cookie Security Best Practices](https://owasp.org/www-community/controls/SecureFlag)

## Contact & Support

For questions or issues related to the frontend authentication implementation:
- Check existing GitHub issues
- Review this documentation thoroughly
- Test with the debug checklist above
- Create a new issue with detailed error logs
