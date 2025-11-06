# Pixless Frontend

A collaborative real-time pixel canvas application built with Next.js 16, React 19, and Tailwind CSS v4. This frontend connects to a serverless API Gateway for real-time canvas synchronization and Discord OAuth2 authentication.

## Features

- **Collaborative Pixel Canvas**: Real-time pixel placement with multiple users
- **Discord Authentication**: OAuth2 integration via API Gateway
- **Server-Side Rendering**: Canvas data fetched server-side with 30s revalidation
- **Modern Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Security**: Comprehensive security headers via middleware (CSP, XSS protection, etc.)
- **API Integration**: Centralized API client in `lib/api.ts` with error handling

## Tech Stack

- **Framework**: Next.js 16 (App Router) with Turbopack
- **UI**: React 19, Tailwind CSS v4, PostCSS
- **Language**: TypeScript (strict mode)
- **Validation**: Zod for schema validation
- **Linting**: ESLint with Next.js config

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
└── proxy.ts           # Security middleware
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm

### Environment Variables

Create a `.env.local` file:

```bash
NEXT_PUBLIC_API_URL=https://your-api-gateway-url.com
```

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

```bash
pnpm build
pnpm start
```

## API Integration

The frontend communicates with a serverless API Gateway for:

- **Canvas Operations**: Fetch canvas snapshot and summary
- **Pixel Placement**: Place pixels with cooldown management
- **Authentication**: Discord OAuth2 flow
- **Real-time Updates**: Polling or SSE via `/canvas/stream`

All API calls are centralized in `lib/api.ts` with automatic cookie handling and error management.

## Security

Security headers are configured in [proxy.ts](proxy.ts):
- Content Security Policy (CSP)
- XSS Protection
- Frame Options (DENY)
- Referrer Policy
- Permissions Policy

## Next Steps

- Implement pixel placement mutations
- Add color palette to toolbar
- Display connected users list
- Implement Server-Sent Events for real-time updates
- Add pixel history and undo functionality
