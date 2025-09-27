# Classmos - Educational Platform

A modern educational platform built with turborepo, featuring real-time communication and AI-powered features.

## 🏗️ Architecture

This monorepo contains:

- **`apps/web`** - Next.js frontend application
- **`apps/api`** - Express.js REST API server  
- **`apps/socket`** - Socket.io WebSocket server for real-time features
- **`packages/types`** - Shared TypeScript types and interfaces
- **`packages/ui`** - Shared React components
- **`packages/eslint-config`** - Shared ESLint configuration
- **`packages/typescript-config`** - Shared TypeScript configuration

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- pnpm >= 9.0.0

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd classmos
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual API keys and database URLs
   ```

3. **Start development servers:**
   ```bash
   # Start all services in development mode
   pnpm dev
   
   # Or start individual services:
   pnpm --filter web dev       # Frontend (port 3000)
   pnpm --filter api dev       # API server (port 4000)  
   pnpm --filter socket dev    # Socket server (port 4001)
   ```

## 📦 Package Scripts

### Root Commands
- `pnpm dev` - Start all apps in development mode
- `pnpm build` - Build all apps for production
- `pnpm lint` - Lint all packages
- `pnpm format` - Format code with Prettier
- `pnpm check-types` - Type check all packages
- `pnpm clean` - Clean all build artifacts

### Individual Apps
- `pnpm --filter web <script>` - Run script in web app
- `pnpm --filter api <script>` - Run script in API app
- `pnpm --filter socket <script>` - Run script in socket app

## 🔧 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Clerk Authentication
CLERK_API_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# AI Integration (Google Gemini)
GEMINI_API_KEY=your_gemini_api_key

# Database
MONGODB_URI=mongodb://localhost:27017/classmos

# Server Configuration
PORT=4000                    # API server port
SOCKET_PORT=4001            # Socket server port
FRONTEND_URL=http://localhost:3000

# Development
NODE_ENV=development
```

## 🏢 Application Details

### Frontend (`apps/web`)
- **Framework:** Next.js 15 with App Router
- **Authentication:** Clerk
- **Real-time:** Socket.io client
- **Styling:** CSS Modules + Global CSS
- **Port:** 3000

### API Server (`apps/api`)
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** Clerk Express middleware
- **Port:** 4000

**Key endpoints:**
- `GET /health` - Health check
- `GET /api/users` - User management

### Socket Server (`apps/socket`)
- **Framework:** Socket.io
- **Authentication:** Clerk integration
- **Port:** 4001

**Supported events:**
- `user:join/leave` - User presence
- `room:join/leave` - Room management  
- `chat:message` - Real-time messaging
- `chat:typing` - Typing indicators

## 📚 Shared Packages

### `@repo/types`
Shared TypeScript interfaces and types used across all applications:
- User and authentication types
- API response structures
- Chat and messaging types
- Class and education types

### `@repo/ui`
Shared React components and UI elements.

### `@repo/eslint-config`
Shared ESLint configurations for consistent code style.

### `@repo/typescript-config`
Shared TypeScript configurations with sensible defaults.

## 🛠️ Development Workflow

### Adding Dependencies

```bash
# Add to specific app
pnpm --filter web add <package>
pnpm --filter api add <package>

# Add to workspace root
pnpm add -w <package>

# Add to shared package
pnpm --filter @repo/types add <package>
```

### Creating New Packages

1. Create directory in `packages/` or `apps/`
2. Add `package.json` with appropriate workspace dependencies
3. Update `pnpm-workspace.yaml` if needed (usually automatic)

### Database Setup

1. **Install MongoDB locally or use MongoDB Atlas**
2. **Update MONGODB_URI in .env**
3. **Start the API server** - it will auto-connect to MongoDB

## 🔍 Troubleshooting

### Common Issues

1. **Port conflicts:** Check if ports 3000, 4000, 4001 are available
2. **MongoDB connection:** Ensure MongoDB is running and URI is correct
3. **Dependencies:** Run `pnpm install` at root to sync all packages

### Logs

- **Frontend:** Check browser console and terminal
- **API:** Check terminal for Express server logs
- **Socket:** Check terminal for Socket.io connection logs

## 📁 Project Structure

```
classmos/
├── apps/
│   ├── web/              # Next.js frontend
│   ├── api/              # Express.js API
│   └── socket/           # Socket.io server
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── ui/               # Shared React components
│   ├── eslint-config/    # ESLint configurations
│   └── typescript-config/ # TypeScript configurations
├── .env.example          # Environment variables template
├── turbo.json           # Turborepo configuration
├── pnpm-workspace.yaml  # pnpm workspace configuration
└── package.json         # Root package configuration
```

## 🤝 Contributing

1. Follow the established patterns in each app
2. Use shared types from `@repo/types`
3. Run `pnpm lint` and `pnpm check-types` before committing
4. Use `pnpm format` to maintain consistent code style

## 🎯 Next Steps

1. Set up your environment variables
2. Configure Clerk authentication keys
3. Set up MongoDB database
4. Add your Google Gemini API key for AI features
5. Start developing! 🚀