#!/bin/bash

# Golden Palace Trading Platform - Stop Script
# This script gracefully stops all platform services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

# Main script
main() {
    echo "========================================="
    echo " Stopping Golden Palace Trading Platform"
    echo "========================================="
    echo

    # Step 1: Kill Node.js processes
    print_status "Stopping Node.js services..."

    # Find and kill processes running on our ports
    for port in 3000 3001 3002; do
        pids=$(lsof -ti:$port 2>/dev/null)
        if [ ! -z "$pids" ]; then
            for pid in $pids; do
                print_status "Stopping service on port $port (PID: $pid)..."
                kill -9 $pid 2>/dev/null || true
            done
        fi
    done

    # Kill any remaining node/pnpm processes related to Golden Palace
    # More specific patterns to target our project
    pkill -f "node.*goldenpalace" 2>/dev/null || true
    pkill -f "pnpm.*goldenpalace" 2>/dev/null || true
    pkill -f "vite.*goldenpalace" 2>/dev/null || true
    pkill -f "tsx.*goldenpalace" 2>/dev/null || true
    pkill -f "turbo.*goldenpalace" 2>/dev/null || true
    pkill -f "tsx.*server.ts" 2>/dev/null || true
    pkill -f "node.*apps/api" 2>/dev/null || true
    pkill -f "node.*apps/web" 2>/dev/null || true

    # Kill processes by their exact command patterns
    pkill -f "tsx watch --clear-screen=false src/server.ts" 2>/dev/null || true

    # Find and kill any orphaned tsx processes from our project directory
    pgrep -f "$PROJECT_ROOT" | while read pid; do
        if ps -p $pid -o comm= | grep -E "(node|tsx|pnpm|vite)" >/dev/null 2>&1; then
            print_status "Killing orphaned process from project directory (PID: $pid)"
            kill -9 $pid 2>/dev/null || true
        fi
    done

    print_success "Node.js services stopped"

    # Step 2: Ask about Docker containers
    read -p "Stop Docker containers? (y/n) [y]: " -n 1 -r STOP_DOCKER
    STOP_DOCKER=${STOP_DOCKER:-y}
    echo

    if [[ $STOP_DOCKER =~ ^[Yy]$ ]]; then
        print_status "Stopping Docker containers..."
        cd "$PROJECT_ROOT"
        docker compose -f docker-compose.dev.yml down
        print_success "Docker containers stopped"

        # Clean up docker-compose.override.yml if it exists
        if [ -f "$PROJECT_ROOT/docker-compose.override.yml" ]; then
            rm "$PROJECT_ROOT/docker-compose.override.yml"
            print_status "Cleaned up docker-compose.override.yml"
        fi
    else
        print_warning "Docker containers are still running"
        echo "  • PostgreSQL: port 5432"
        echo "  • Redis: port 6379"
        echo "  • Adminer: http://localhost:8080"
        echo "  • Redis Commander: http://localhost:8081"
    fi

    # Step 3: Optional cleanup
    read -p "Remove generated .env files? (y/n) [n]: " -n 1 -r CLEAN_ENV
    CLEAN_ENV=${CLEAN_ENV:-n}
    echo

    if [[ $CLEAN_ENV =~ ^[Yy]$ ]]; then
        print_warning "Removing .env files..."
        rm -f "$PROJECT_ROOT/.env"
        rm -f "$PROJECT_ROOT/apps/api/.env"
        rm -f "$PROJECT_ROOT/apps/web/.env"
        rm -f "$PROJECT_ROOT/packages/database/.env"
        print_success ".env files removed"
    fi

    echo
    print_success "Golden Palace has been stopped successfully!"
    echo

    # Show status
    echo "To restart the platform, run:"
    echo "  ./launch.sh"
    echo
}

# Run main function
main "$@"