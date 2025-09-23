#!/bin/bash

# Golden Palace Trading Platform - Development Helper Script
# Provides useful commands for development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_USER="dev_user"
DB_PASSWORD="dev_password"
DB_NAME="golden_palace_dev"
DB_PORT="5432"  # Default PostgreSQL port
REDIS_PORT="6379"  # Default Redis port

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

print_command() {
    echo -e "${CYAN}[RUNNING]${NC} $1"
}

# Show help
show_help() {
    echo "Golden Palace Development Helper"
    echo "================================"
    echo
    echo "Usage: ./dev.sh [command]"
    echo
    echo "Commands:"
    echo "  start         - Start all services (same as ./launch.sh)"
    echo "  stop          - Stop all services (same as ./stop.sh)"
    echo "  restart       - Restart all services"
    echo "  status        - Show status of all services"
    echo "  logs [service] - Show logs (api|web|postgres|redis|all)"
    echo "  test [scope]  - Run tests (all|api|web|unit|integration)"
    echo "  lint          - Run linting on all packages"
    echo "  typecheck     - Run type checking on all packages"
    echo "  migrate       - Run database migrations"
    echo "  migrate:reset - Reset database and run migrations"
    echo "  seed          - Seed database with sample data"
    echo "  studio        - Open Prisma Studio"
    echo "  build         - Build all packages for production"
    echo "  clean         - Clean all node_modules and dist folders"
    echo "  setup         - Initial setup (install deps, build, migrate)"
    echo "  psql          - Connect to PostgreSQL CLI"
    echo "  redis-cli     - Connect to Redis CLI"
    echo
}

# Check service status
check_status() {
    print_status "Checking service status..."
    echo

    # Check Docker services
    echo "Docker Services:"
    docker compose -f docker-compose.dev.yml ps 2>/dev/null || echo "  No Docker services running"
    echo

    # Check Node services
    echo "Node Services:"

    # Check API
    if lsof -Pi :3002 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "  ${GREEN}●${NC} API Server: Running on port 3002"
    else
        echo -e "  ${RED}●${NC} API Server: Not running"
    fi

    # Check Web
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "  ${GREEN}●${NC} Web Server: Running on port 3000"
    else
        echo -e "  ${RED}●${NC} Web Server: Not running"
    fi

    echo
}

# Show logs
show_logs() {
    local service="$1"

    case "$service" in
        api)
            print_status "Showing API logs..."
            cd "$PROJECT_ROOT/apps/api"
            npm run dev
            ;;
        web)
            print_status "Showing Web logs..."
            cd "$PROJECT_ROOT/apps/web"
            npm run dev
            ;;
        postgres)
            print_status "Showing PostgreSQL logs..."
            docker logs -f golden-palace-postgres
            ;;
        redis)
            print_status "Showing Redis logs..."
            docker logs -f golden-palace-redis
            ;;
        all)
            print_status "Showing all Docker logs..."
            docker compose -f "$PROJECT_ROOT/docker-compose.dev.yml" logs -f
            ;;
        *)
            print_error "Unknown service: $service"
            echo "Available services: api, web, postgres, redis, all"
            exit 1
            ;;
    esac
}

# Run tests
run_tests() {
    local scope="$1"

    case "$scope" in
        all)
            print_status "Running all tests..."
            cd "$PROJECT_ROOT"
            pnpm test
            ;;
        api)
            print_status "Running API tests..."
            cd "$PROJECT_ROOT/apps/api"
            pnpm test
            ;;
        web)
            print_status "Running Web tests..."
            cd "$PROJECT_ROOT/apps/web"
            pnpm test
            ;;
        unit)
            print_status "Running unit tests..."
            cd "$PROJECT_ROOT"
            pnpm test -- --grep "unit"
            ;;
        integration)
            print_status "Running integration tests..."
            cd "$PROJECT_ROOT"
            pnpm test -- --grep "integration"
            ;;
        *)
            print_error "Unknown test scope: $scope"
            echo "Available scopes: all, api, web, unit, integration"
            exit 1
            ;;
    esac
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    cd "$PROJECT_ROOT/packages/database"
    pnpm exec prisma migrate deploy
    print_success "Migrations complete"
}

# Reset database
reset_database() {
    print_warning "This will delete all data in the database!"
    read -p "Are you sure? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Resetting database..."
        cd "$PROJECT_ROOT/packages/database"
        pnpm exec prisma migrate reset --force
        print_success "Database reset complete"
    fi
}

# Seed database
seed_database() {
    print_status "Seeding database..."
    cd "$PROJECT_ROOT/packages/database"

    if [ -f "prisma/seed.ts" ]; then
        pnpm exec tsx prisma/seed.ts
        print_success "Database seeded"
    else
        print_warning "No seed file found at prisma/seed.ts"
        print_status "Creating sample seed file..."
        mkdir -p prisma
        cat > prisma/seed.ts <<'EOF'
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Add your seed data here
  console.log('Seeding database...');

  // Example: Create a test user
  // const user = await prisma.user.create({
  //   data: {
  //     email: 'test@example.com',
  //     username: 'testuser',
  //     passwordHash: 'hashed_password_here',
  //   }
  // });

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
EOF
        print_success "Created sample seed file at packages/database/prisma/seed.ts"
        echo "Edit this file and run './dev.sh seed' again to seed the database"
    fi
}

# Open Prisma Studio
open_studio() {
    print_status "Opening Prisma Studio..."
    cd "$PROJECT_ROOT/packages/database"
    pnpm exec prisma studio
}

# Build for production
build_all() {
    print_status "Building all packages..."
    cd "$PROJECT_ROOT"
    pnpm build
    print_success "Build complete"
}

# Clean project
clean_project() {
    print_warning "This will remove all node_modules and dist folders!"
    read -p "Are you sure? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Cleaning project..."
        find "$PROJECT_ROOT" -name "node_modules" -type d -prune -exec rm -rf '{}' +
        find "$PROJECT_ROOT" -name "dist" -type d -prune -exec rm -rf '{}' +
        find "$PROJECT_ROOT" -name ".turbo" -type d -prune -exec rm -rf '{}' +
        print_success "Project cleaned"
    fi
}

# Initial setup
initial_setup() {
    print_status "Running initial setup..."

    # Install dependencies
    print_status "Installing dependencies..."
    cd "$PROJECT_ROOT"
    pnpm install

    # Build packages
    print_status "Building packages..."
    pnpm --filter @golden-palace/shared build 2>/dev/null || true
    pnpm --filter @golden-palace/config build 2>/dev/null || true
    pnpm --filter @golden-palace/database build 2>/dev/null || true

    # Setup database
    print_status "Setting up database..."
    cd "$PROJECT_ROOT/packages/database"
    pnpm exec prisma generate
    pnpm exec prisma migrate deploy || pnpm exec prisma db push

    print_success "Initial setup complete"
}

# Connect to PostgreSQL
connect_psql() {
    print_status "Connecting to PostgreSQL..."
    docker exec -it golden-palace-postgres psql -U ${DB_USER} -d ${DB_NAME}
}

# Connect to Redis
connect_redis() {
    print_status "Connecting to Redis..."
    docker exec -it golden-palace-redis redis-cli
}

# Run linting
run_lint() {
    print_status "Running linting..."
    cd "$PROJECT_ROOT"

    # Try to run lint in each workspace
    pnpm --filter @golden-palace/api lint 2>/dev/null || print_warning "API lint not configured"
    pnpm --filter @golden-palace/web lint 2>/dev/null || print_warning "Web lint not configured"

    print_success "Linting complete"
}

# Run type checking
run_typecheck() {
    print_status "Running type checking..."
    cd "$PROJECT_ROOT"

    # Run type-check in each workspace
    pnpm --filter @golden-palace/api type-check 2>/dev/null || print_warning "API type-check failed"
    pnpm --filter @golden-palace/web type-check 2>/dev/null || print_warning "Web type-check failed"
    pnpm --filter @golden-palace/database type-check 2>/dev/null || true

    print_success "Type checking complete"
}

# Main command handler
case "$1" in
    start)
        "$PROJECT_ROOT/launch.sh"
        ;;
    stop)
        "$PROJECT_ROOT/stop.sh"
        ;;
    restart)
        "$PROJECT_ROOT/stop.sh"
        sleep 2
        "$PROJECT_ROOT/launch.sh"
        ;;
    status)
        check_status
        ;;
    logs)
        show_logs "$2"
        ;;
    test)
        run_tests "${2:-all}"
        ;;
    lint)
        run_lint
        ;;
    typecheck)
        run_typecheck
        ;;
    migrate)
        run_migrations
        ;;
    migrate:reset)
        reset_database
        ;;
    seed)
        seed_database
        ;;
    studio)
        open_studio
        ;;
    build)
        build_all
        ;;
    clean)
        clean_project
        ;;
    setup)
        initial_setup
        ;;
    psql)
        connect_psql
        ;;
    redis-cli)
        connect_redis
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo
        show_help
        exit 1
        ;;
esac