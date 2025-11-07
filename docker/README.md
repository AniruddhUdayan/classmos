# Docker Setup for Classmos

This directory contains Docker configurations for running the Classmos educational platform with production-ready features including health checks, resource limits, and security best practices.

## 📦 Services

- **API Service** (`api.Dockerfile`): Express.js API server running on port 4000
- **Socket Service** (`socket.Dockerfile`): Socket.io real-time server running on port 4001
- **Web Service** (`web.Dockerfile`): Next.js frontend application running on port 3000

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB of available RAM

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

## 🔍 Health Checks

All services include built-in health checks that run every 30 seconds:

- **API**: `GET http://localhost:4000/health`
- **Socket**: `GET http://localhost:4001/`
- **Web**: `GET http://localhost:3000/`

Check service health status:
```bash
docker-compose ps
docker inspect classmos-api | grep -A 10 Health
```

## 📊 Resource Limits

Each service has resource limits configured to prevent excessive resource usage:

**API & Socket Services:**
- CPU Limit: 1 core
- Memory Limit: 512MB
- CPU Reservation: 0.5 core
- Memory Reservation: 256MB

**Web Service:**
- CPU Limit: 1 core
- Memory Limit: 1GB
- CPU Reservation: 0.5 core
- Memory Reservation: 512MB

## 🔒 Security Features

All Docker images include:
- ✅ Non-root user execution (nodejs user with UID 1001)
- ✅ Alpine Linux base for minimal attack surface
- ✅ Multi-stage builds for smaller images
- ✅ Health checks for container monitoring
- ✅ Resource limits to prevent DoS
- ✅ Log rotation configured

## 🐳 Docker Hub Images

Pre-built images can be pushed to Docker Hub using the CI/CD pipeline. See the CI/CD section below.

## 🔄 CI/CD Pipeline

The project includes a GitHub Actions workflow (`.github/workflows/docker-publish.yml`) that automatically builds and pushes Docker images to Docker Hub.

### Setting Up Docker Hub Integration

1. **Create Docker Hub Access Token:**
   - Go to [Docker Hub](https://hub.docker.com/) → Account Settings → Security
   - Click "New Access Token"
   - Name it "github-actions" and copy the token

2. **Add GitHub Secrets:**
   - Go to your GitHub repository → Settings → Secrets and variables → Actions
   - Click "New repository secret" and add:
     - Name: `DOCKER_HUB_USERNAME`, Value: Your Docker Hub username
     - Name: `DOCKER_HUB_ACCESS_TOKEN`, Value: The access token you created

3. **Trigger the Workflow:**
   - Push to `main` branch: Automatic build and push
   - Create a version tag: `git tag v1.0.0 && git push origin v1.0.0`
   - Manual trigger: Go to Actions tab → Build and Push Docker Images → Run workflow

### Docker Image Tags

The CI/CD pipeline automatically creates the following tags:

- `latest` - Latest build from main branch
- `main` - All builds from main branch
- `v1.0.0` - Semantic version tags (from git tags)
- `v1.0` - Major.minor version tags
- `v1` - Major version tags
- `main-abc123` - Branch name with commit SHA

### Using Pre-built Images from Docker Hub

```bash
# Pull images
docker pull <your-dockerhub-username>/classmos-api:latest
docker pull <your-dockerhub-username>/classmos-socket:latest
docker pull <your-dockerhub-username>/classmos-web:latest

# Run images
docker run -p 4000:4000 <your-dockerhub-username>/classmos-api:latest
```

## 🧹 Cleanup

Remove all Classmos containers, images, and networks:
```bash
docker-compose down --rmi all
docker system prune -a
```

## 📝 Troubleshooting

### Build Issues

**Port conflicts**: Make sure ports 3000, 4000, and 4001 are not in use
```bash
# Check what's using the ports
netstat -ano | findstr :3000
netstat -ano | findstr :4000
netstat -ano | findstr :4001
```

**Build failures**: Clear Docker cache and rebuild
```bash
docker builder prune -a
docker-compose build --no-cache
```

**Out of memory**: Increase Docker memory limit in Docker Desktop settings or adjust resource limits in `docker-compose.yml`

### Runtime Issues

**MongoDB connection**: The application uses MongoDB Atlas, ensure network access is configured and the connection string is correct

**Health check failing**: Check service logs
```bash
docker-compose logs api
docker-compose logs socket
docker-compose logs web
```

**Services can't communicate**: Restart networking
```bash
docker-compose down
docker network prune
docker-compose up
```

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
