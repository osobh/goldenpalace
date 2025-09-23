#!/bin/bash

# Golden Palace Trading Platform - Launch Script
# This script starts all necessary services and ensures the platform is ready to use

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Host configuration - can be overridden by environment variable or command line argument
HOST="${HOST:-192.168.1.4}"  # Default to IP address, can use "localhost" if needed
DB_USER="dev_user"
DB_PASSWORD="dev_password"
DB_NAME="golden_palace_dev"
DB_PORT="5432"  # Default PostgreSQL port
REDIS_PORT="6379"  # Default Redis port
API_PORT="3002"
WEB_PORT="3001"  # Changed from 3000 to 3001 to match your setup

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for a service to be ready
wait_for_service() {
    local host="$1"
    local port="$2"
    local service_name="$3"
    local max_attempts=30
    local attempt=1

    print_status "Waiting for $service_name to be ready..."

    while [ $attempt -le $max_attempts ]; do
        if nc -z "$host" "$port" 2>/dev/null; then
            print_success "$service_name is ready!"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done

    print_error "$service_name failed to start after $max_attempts attempts"
    return 1
}

# Function to create .env file
create_env_file() {
    local env_path="$1"
    local env_content="$2"

    if [ ! -f "$env_path" ]; then
        print_status "Creating $env_path..."
        echo "$env_content" > "$env_path"
        print_success "Created $env_path"
    else
        print_status "$env_path already exists"
    fi
}

# Cleanup function
cleanup() {
    print_warning "Shutting down services..."

    # Kill node processes
    pkill -f "node.*golden" || true

    # Optionally stop Docker containers
    read -p "Stop Docker containers? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd "$PROJECT_ROOT"
        docker compose -f docker-compose.dev.yml down
    fi

    print_success "Cleanup complete"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT

# Main script
main() {
    echo "========================================="
    echo " Golden Palace Trading Platform Launcher"
    echo "========================================="
    echo

    # Step 1: Check prerequisites
    print_status "Checking prerequisites..."

    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi

    if ! command_exists pnpm; then
        print_error "pnpm is not installed. Please install pnpm first."
        print_status "You can install it with: npm install -g pnpm"
        exit 1
    fi

    print_success "All prerequisites are installed"

    # Kill processes on our ports to ensure clean startup
    print_status "Clearing ports for services..."

    # Function to kill process on a port
    kill_port() {
        local port=$1
        local service=$2
        local pids=$(lsof -ti:$port 2>/dev/null)

        if [ ! -z "$pids" ]; then
            # Special handling for PostgreSQL port - check if it's our container
            if [ "$port" = "$DB_PORT" ]; then
                if docker ps --format '{{.Names}}' | grep -q "golden-palace-postgres"; then
                    print_status "PostgreSQL container already running on port $port"
                    return 0
                fi
            fi

            print_warning "Killing process on port $port for $service..."
            for pid in $pids; do
                kill -9 $pid 2>/dev/null || true
            done
            sleep 1
            print_success "Port $port cleared"
        else
            print_status "Port $port is available for $service"
        fi
    }

    # Kill any lingering Node/Vite/tsx processes first
    print_status "Cleaning up any lingering Node processes..."
    pkill -f "node.*vite" 2>/dev/null || true
    pkill -f "tsx.*server.ts" 2>/dev/null || true
    pkill -f "node.*golden" 2>/dev/null || true
    sleep 1

    # Kill processes on our application ports (not Docker ports)
    kill_port $API_PORT "API Server"
    kill_port $WEB_PORT "Web Server"

    # For Redis and PostgreSQL ports, only kill if not our containers
    if ! docker ps --format '{{.Names}}' | grep -q "golden-palace-postgres"; then
        kill_port $DB_PORT "PostgreSQL"
    fi

    if ! docker ps --format '{{.Names}}' | grep -q "golden-palace-redis"; then
        kill_port $REDIS_PORT "Redis"
    fi

    # Step 2: Setup environment files
    print_status "Setting up environment files..."

    # Create root .env if needed
    ROOT_ENV="DATABASE_URL=\"postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}\"
REDIS_URL=\"redis://localhost:${REDIS_PORT}\"
NODE_ENV=\"development\""
    create_env_file "$PROJECT_ROOT/.env" "$ROOT_ENV"

    # Create API .env
    API_ENV="# Database Configuration
DATABASE_URL=\"postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}\"

# Redis Configuration
REDIS_URL=\"redis://localhost:${REDIS_PORT}\"

# Authentication
JWT_ACCESS_SECRET=\"your-super-secret-jwt-access-key-change-in-production\"
JWT_REFRESH_SECRET=\"your-super-secret-jwt-refresh-key-change-in-production\"

# Environment
NODE_ENV=\"development\"
PORT=${API_PORT}

# Client URL for CORS
CLIENT_URL=\"http://${HOST}:${WEB_PORT}\"

# Optional: Email Configuration (for email verification later)
# SMTP_HOST=\"smtp.gmail.com\"
# SMTP_PORT=587
# SMTP_USER=\"your-email@gmail.com\"
# SMTP_PASS=\"your-app-password\""
    create_env_file "$PROJECT_ROOT/apps/api/.env" "$API_ENV"

    # Create Web .env
    WEB_ENV="VITE_API_URL=http://${HOST}:${API_PORT}
VITE_WS_URL=ws://${HOST}:${API_PORT}"
    create_env_file "$PROJECT_ROOT/apps/web/.env" "$WEB_ENV"

    # Create Database .env
    DB_ENV="DATABASE_URL=\"postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}\""
    create_env_file "$PROJECT_ROOT/packages/database/.env" "$DB_ENV"

    # Step 3: Update docker-compose to use our credentials
    print_status "Updating Docker configuration..."

    # Create a temporary docker-compose override (only for environment variables)
    cat > "$PROJECT_ROOT/docker-compose.override.yml" <<EOF
services:
  postgres:
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
EOF

    # Step 4: Start Docker services
    print_status "Starting Docker services..."
    cd "$PROJECT_ROOT"

    # Check if containers are already running
    if docker compose -f docker-compose.dev.yml ps | grep -q "golden-palace-postgres.*Up"; then
        print_warning "PostgreSQL container is already running"
    else
        docker compose -f docker-compose.dev.yml up -d postgres redis
    fi

    # Wait for PostgreSQL to be ready
    wait_for_service localhost $DB_PORT "PostgreSQL"

    # Wait for Redis to be ready
    wait_for_service localhost $REDIS_PORT "Redis"

    # Step 5: Install dependencies
    print_status "Installing dependencies..."

    if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
        cd "$PROJECT_ROOT"
        pnpm install
        print_success "Dependencies installed"
    else
        print_status "Dependencies already installed"
    fi

    # Step 6: Build packages
    print_status "Building packages..."
    cd "$PROJECT_ROOT"

    # Build shared packages first
    pnpm --filter @golden-palace/shared build 2>/dev/null || print_warning "Shared package build skipped or not configured"
    pnpm --filter @golden-palace/config build 2>/dev/null || print_warning "Config package build skipped or not configured"

    # Step 7: Setup database
    print_status "Setting up database..."
    cd "$PROJECT_ROOT/packages/database"

    # Generate Prisma client
    print_status "Generating Prisma client..."
    pnpm exec prisma generate

    # Run migrations
    print_status "Running database migrations..."
    pnpm exec prisma migrate deploy 2>/dev/null || {
        print_warning "Migrations failed or already applied, trying to push schema..."
        pnpm exec prisma db push --accept-data-loss || {
            print_error "Database schema push failed"
            exit 1
        }
    }

    print_success "Database setup complete"

    # Step 8: Build database package
    pnpm build 2>/dev/null || print_warning "Database package build skipped"

    # Step 9: Start services
    print_status "Starting application services..."

    # Start API server
    cd "$PROJECT_ROOT/apps/api"
    print_status "Starting API server on port $API_PORT..."
    pnpm dev &
    API_PID=$!

    # Wait for API to be ready
    wait_for_service localhost $API_PORT "API Server"

    # Start Web server
    cd "$PROJECT_ROOT/apps/web"
    print_status "Starting Web server on port $WEB_PORT..."
    pnpm dev &
    WEB_PID=$!

    # Wait for Web to be ready
    sleep 5

    # Step 10: Display success message
    echo
    echo "========================================="
    echo -e "${GREEN} Golden Palace is ready!${NC}"
    echo "========================================="
    echo
    echo "Services running (using HOST: $HOST):"
    echo "  • PostgreSQL:      http://localhost:$DB_PORT"
    echo "  • Redis:           http://localhost:$REDIS_PORT"
    echo "  • Adminer:         http://localhost:8080"
    echo "  • Redis Commander: http://localhost:8081"
    echo "  • API Server:      http://$HOST:$API_PORT"
    echo "  • Web Interface:   http://$HOST:$WEB_PORT"
    echo
    echo "Database credentials:"
    echo "  • User:     $DB_USER"
    echo "  • Password: $DB_PASSWORD"
    echo "  • Database: $DB_NAME"
    echo
    echo "Press Ctrl+C to stop all services"
    echo

    # Keep script running
    wait $API_PID $WEB_PID
}

# Run main function
main "$@"