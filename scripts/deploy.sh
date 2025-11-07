#!/bin/bash

# Deployment script for Classmos on EC2
# This script pulls the latest images from Docker Hub and restarts the services

set -e  # Exit on error

echo "=========================================="
echo "   Classmos Deployment Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

print_success "Docker and Docker Compose are installed"

# Set Docker Hub username (update this or use environment variable)
export DOCKER_HUB_USERNAME=${DOCKER_HUB_USERNAME:-"your-dockerhub-username"}

print_info "Docker Hub Username: $DOCKER_HUB_USERNAME"

# Stop existing containers
print_info "Stopping existing containers..."
if docker-compose -f docker-compose.prod.yml down 2>/dev/null || docker compose -f docker-compose.prod.yml down 2>/dev/null; then
    print_success "Existing containers stopped"
else
    print_info "No existing containers to stop"
fi

# Pull latest images from Docker Hub
print_info "Pulling latest images from Docker Hub..."
docker pull $DOCKER_HUB_USERNAME/classmos-api:latest
docker pull $DOCKER_HUB_USERNAME/classmos-socket:latest
docker pull $DOCKER_HUB_USERNAME/classmos-web:latest
print_success "Latest images pulled successfully"

# Remove old images (optional - saves disk space)
print_info "Cleaning up old images..."
docker image prune -f
print_success "Old images cleaned up"

# Start containers with docker-compose
print_info "Starting containers..."
if docker-compose -f docker-compose.prod.yml up -d 2>/dev/null; then
    print_success "Containers started with docker-compose"
elif docker compose -f docker-compose.prod.yml up -d 2>/dev/null; then
    print_success "Containers started with docker compose"
else
    print_error "Failed to start containers"
    exit 1
fi

# Wait for services to be healthy
print_info "Waiting for services to be healthy..."
sleep 10

# Check container status
print_info "Container Status:"
if docker-compose -f docker-compose.prod.yml ps 2>/dev/null; then
    docker-compose -f docker-compose.prod.yml ps
elif docker compose -f docker-compose.prod.yml ps 2>/dev/null; then
    docker compose -f docker-compose.prod.yml ps
else
    docker ps
fi

echo ""
print_info "Checking service health..."

# Check API health
if curl -f http://localhost:4000/health &> /dev/null; then
    print_success "API is healthy (Port 4000)"
else
    print_error "API health check failed (Port 4000)"
fi

# Check Socket health
if curl -f http://localhost:4001/ &> /dev/null; then
    print_success "Socket server is healthy (Port 4001)"
else
    print_error "Socket server health check failed (Port 4001)"
fi

# Check Web health
if curl -f http://localhost:3000/ &> /dev/null; then
    print_success "Web frontend is healthy (Port 3000)"
else
    print_error "Web frontend health check failed (Port 3000)"
fi

echo ""
echo "=========================================="
print_success "Deployment completed!"
echo "=========================================="
echo ""
print_info "Access your application at:"
echo "  Frontend: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000"
echo "  API:      http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):4000"
echo "  Socket:   http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):4001"
echo ""
print_info "To view logs, run: docker-compose -f docker-compose.prod.yml logs -f"
echo ""
