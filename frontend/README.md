<div align="center">
  <img src="public/logo.png" alt="Pixelhub Logo" width="120" />

  # Pixelhub Frontend

  **A collaborative real-time pixel canvas application**

  Built with Next.js 16, React 19, and Tailwind CSS v4

  [![Live Demo](https://img.shields.io/badge/demo-pixelhub.now-blue?style=for-the-badge)](https://pixelhub.now)
  [![Cloud Run](https://img.shields.io/badge/Google_Cloud-Run-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)](https://cloud.google.com/run)
  [![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)

</div>

---

## Features

- **Collaborative Pixel Canvas**: Real-time pixel placement with multiple users
- **Discord Authentication**: OAuth2 integration via Cloud Run API Gateway
- **Server-Side Rendering**: Canvas data fetched server-side with 30s revalidation
- **Modern Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Security**: Comprehensive security headers via middleware (CSP, XSS protection, etc.)
- **Cloud Native**: Deployed on Google Cloud Run with custom domain and automatic SSL

## Tech Stack

- **Framework**: Next.js 16 (App Router) with Turbopack
- **UI**: React 19, Tailwind CSS v4, PostCSS
- **Language**: TypeScript (strict mode)
- **Validation**: Zod for schema validation
- **Linting**: ESLint with Next.js config
- **Infrastructure**: Google Cloud Run, Docker, Cloud Build

## Project Structure

```
frontend/
├── app/                  # Next.js App Router pages
│   ├── actions/         # Server actions
│   ├── auth/           # Authentication routes
│   ├── page.tsx        # Main canvas page
│   └── layout.tsx      # Root layout
├── components/          # React components
│   ├── pixel-canvas.tsx
│   └── toolbar.tsx
├── lib/                # Utility functions
│   ├── api.ts         # API client
│   ├── canvas.ts      # Canvas data fetching
│   └── session.ts     # Session management
├── types/              # TypeScript type definitions
├── proxy.ts           # Security middleware
├── Dockerfile         # Multi-stage Docker build
└── deploy-frontend.sh # Cloud Run deployment script
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm
- Docker (for deployment)
- Google Cloud SDK (for production deployment)

### Environment Variables

Create a `.env.local` file for development:

```bash
NEXT_PUBLIC_API_URL=https://cf-proxy-343984406897.europe-west1.run.app
```

For production, environment variables are set via Cloud Run deployment scripts.

### Installation

```bash
pnpm install
```

### Development

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

The page will auto-reload when you edit files in the `app/` directory.

### Build

Build for production:

```bash
pnpm build
pnpm start
```

Or build Docker image locally:

```bash
docker build -t frontend .
docker run -p 3000:3000 frontend
```

## Deployment

### Production Deployment (Google Cloud Run)

The frontend is deployed on Google Cloud Run with a custom domain (`pixelhub.now`) and automatic SSL certificate management.

**Deploy to Cloud Run:**

```bash
./deploy-frontend.sh
```

This script:
1. Builds a Docker image using Cloud Build
2. Deploys to Cloud Run in `europe-west1`
3. Configures environment variables
4. Sets up authentication and security policies

**Manual deployment:**

```bash
gcloud builds submit --tag gcr.io/serverless-tek89/frontend
gcloud run deploy frontend \
  --image gcr.io/serverless-tek89/frontend \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated
```

### Custom Domain Setup

The application is accessible via `https://pixelhub.now` with automatic SSL certificate provisioning.

**To configure a custom domain:**

1. Verify domain ownership in [Google Search Console](https://search.google.com/search-console)
2. Run the domain setup script:
   ```bash
   ./setup-domain.sh
   ```
3. Add DNS records (A and AAAA) provided by the script to your domain registrar
4. Wait 15-60 minutes for DNS propagation and SSL certificate provisioning

**Check domain status:**

```bash
gcloud beta run domain-mappings describe --domain=pixelhub.now --region=europe-west1
```

**Verify DNS propagation:**

```bash
./check-dns.sh pixelhub.now
```

For detailed setup instructions, see [DNS Configuration Guide](../docs/DNS-SETUP-GUIDE.md).

## API Integration

The frontend communicates with a Cloud Run API Gateway for:

- **Canvas Operations**: Fetch canvas snapshot and summary via `/canvas/snapshot`
- **Pixel Placement**: Place pixels with cooldown management via `/canvas/write-pixels`
- **Authentication**: Discord OAuth2 flow via `/auth/discord`
- **Real-time Updates**: Server-Sent Events via `/canvas/stream`

All API calls are centralized in `lib/api.ts` with:
- Automatic cookie handling for authentication
- Error handling and retry logic
- TypeScript type safety with Zod validation

## Security

Security headers are configured in [proxy.ts](proxy.ts):

- **Content Security Policy (CSP)**: Restricts resource loading
- **XSS Protection**: Prevents cross-site scripting attacks
- **Frame Options**: Prevents clickjacking (DENY)
- **HSTS**: Forces HTTPS connections
- **Referrer Policy**: Controls referrer information
- **Permissions Policy**: Restricts browser features (camera, microphone, etc.)

Additional security measures:
- All cookies are `httpOnly`, `secure`, and `sameSite=lax`
- API requests include CORS headers
- Environment variables are validated at build time

## Performance

- **Server-Side Rendering**: Initial canvas data is fetched server-side
- **Incremental Static Regeneration**: Canvas revalidates every 30 seconds
- **Optimized Docker Build**: Multi-stage build reduces image size
- **Edge Caching**: Static assets served with cache headers
- **Code Splitting**: Automatic code splitting via Next.js

## Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build production bundle
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `./deploy-frontend.sh` - Deploy to Cloud Run
- `./setup-domain.sh` - Configure custom domain
- `./check-dns.sh [domain]` - Check DNS configuration

## Architecture

```
┌─────────────────┐
│   User Browser  │
└────────┬────────┘
         │ HTTPS (pixelhub.now)
         ↓
┌─────────────────────────────┐
│  Google Cloud Run (Frontend)│
│  - Next.js 16 SSR           │
│  - Automatic SSL            │
│  - Custom Domain            │
└────────┬────────────────────┘
         │ API Requests
         ↓
┌─────────────────────────────┐
│  Cloud Run (API Gateway)    │
│  - cf-proxy service         │
│  - Discord OAuth2           │
│  - Canvas operations        │
└────────┬────────────────────┘
         │
         ↓
┌─────────────────────────────┐
│  Backend Services           │
│  - Firestore                │
│  - Cloud Functions          │
│  - write-pixels-worker      │
└─────────────────────────────┘
```

## Environment

- **Development**: `http://localhost:3000`
- **Production**: `https://pixelhub.now` (or `https://frontend-343984406897.europe-west1.run.app`)
- **API Gateway**: `https://cf-proxy-343984406897.europe-west1.run.app`

## Monitoring

View logs and metrics:

```bash
# View Cloud Run logs
gcloud run services logs read frontend --region=europe-west1

# View deployment status
gcloud run services describe frontend --region=europe-west1

# Monitor domain mapping status
gcloud beta run domain-mappings describe --domain=pixelhub.now --region=europe-west1
```

## Troubleshooting

### Domain not accessible
- Check DNS propagation: `./check-dns.sh pixelhub.now`
- Verify SSL certificate status: `gcloud beta run domain-mappings describe --domain=pixelhub.now --region=europe-west1`
- Wait up to 60 minutes for initial SSL provisioning

### API connection errors
- Verify `NEXT_PUBLIC_API_URL` environment variable is set
- Check API Gateway service is running: `gcloud run services list`
- Review Cloud Run logs for detailed error messages

### Build failures
- Ensure all environment variables are set in Cloud Build
- Check Docker build logs: `gcloud builds list`
- Verify Node.js version matches Dockerfile specification

## Contributing

1. Create a feature branch
2. Make changes and test locally
3. Run linter: `pnpm lint`
4. Build production bundle: `pnpm build`
5. Test Docker build: `docker build -t frontend .`
6. Deploy to staging environment
7. Submit pull request

## License

This project is part of the Cervelet collaborative canvas platform.
