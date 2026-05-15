# Asset Manager

A full-stack account management application built with React, Express, and MongoDB.

## Project Structure

```
├── artifacts/
│   ├── api-server/          # Express backend API
│   ├── dev-account-manager/ # React frontend
│   └── mockup-sandbox/      # UI mockup sandbox
├── lib/
│   ├── api-spec/           # OpenAPI specification
│   ├── api-client-react/   # Generated API client
│   ├── api-zod/            # Generated Zod schemas
│   └── db/                 # Database models
└── public/                 # Build output
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- pnpm package manager
- MongoDB Atlas account

### Installation

```bash
pnpm install
```

### Environment Setup

1. **Backend** - Copy `.env.example` to `.env`:

```bash
cp artifacts/api-server/.env.example artifacts/api-server/.env
```

Edit `.env` with your MongoDB connection string:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=Cluster0
PORT=8080
```

### Running Locally

**Terminal 1 - Start Backend:**

```bash
$env:PORT=8080
$env:MONGODB_URI="your-connection-string"
pnpm --filter @workspace/api-server run dev
```

**Terminal 2 - Start Frontend:**

```bash
cd artifacts/dev-account-manager
npm run dev --port 3001
```

The application will be available at:

- Frontend: http://localhost:3001
- Backend API: http://localhost:8080

## Features

- 👥 Account management dashboard
- 🔐 User authentication
- 📊 Account statistics
- 🎨 Modern UI with Tailwind CSS and Radix UI
- ⚡ Real-time updates with React Query

## Building

```bash
pnpm run build
```

## Deployment

The application is configured for deployment on Vercel:

- Frontend builds to `public/` directory
- Backend API runs as a serverless function
- MongoDB connection configured via environment variables

## License

MIT
