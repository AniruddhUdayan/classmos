# Docker Setup for Classmos

This directory contains Docker configurations for running the Classmos application locally using Docker Compose.

## Services

- **API Service** (`api.Dockerfile`): Express.js API server running on port 4000
- **Socket Service** (`socket.Dockerfile`): Socket.io server running on port 4001  
- **Web Service** (`web.Dockerfile`): Next.js frontend application running on port 3000

## Prerequisites

- Docker
- Docker Compose

## Environment Variables

All environment variables are hardcoded in the `docker-compose.yml` file. The current configuration includes:

- **MongoDB URI**: Pre-configured for the Classmos database
- **Clerk Authentication**: Test keys for development
- **Gemini API Key**: Set to placeholder - replace with your actual key if needed

**Important**: If you need to use your own Gemini API key for chat functionality, edit the `GEMINI_API_KEY` value in `docker-compose.yml` under the `api` service environment section.

## Running the Application

1. **Build and start all services:**
   ```bash
   docker-compose up --build
   ```

2. **Run in detached mode:**
   ```bash
   docker-compose up -d --build
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f
   ```

4. **Stop all services:**
   ```bash
   docker-compose down
   ```

5. **Clean up (remove containers, networks, and volumes):**
   ```bash
   docker-compose down -v
   ```

## Accessing the Application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:4000
- **Socket Server**: http://localhost:4001

## Development

For development with hot reloading, it's recommended to run the services individually:

```bash
# Terminal 1 - API
cd apps/api && npm run dev

# Terminal 2 - Socket
cd apps/socket && npm run dev

# Terminal 3 - Web
cd apps/web && npm run dev
```

## Troubleshooting

1. **Port conflicts**: Make sure ports 3000, 4000, and 4001 are not in use
2. **Build failures**: Check that all dependencies are properly installed
3. **Environment variables**: Ensure all required environment variables are set
4. **MongoDB connection**: The application uses MongoDB Atlas, ensure network access is configured

## Docker Commands

```bash
# Build specific service
docker-compose build api
docker-compose build socket
docker-compose build web

# View service status
docker-compose ps

# View service logs
docker-compose logs api
docker-compose logs socket
docker-compose logs web

# Execute commands in running container
docker-compose exec api sh
docker-compose exec socket sh
docker-compose exec web sh
```
