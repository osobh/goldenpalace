#!/bin/bash

# Golden Palace Trading Platform - Complete Node Cleanup Script
# This script will kill ALL Node.js processes on the system (use with caution!)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
echo "========================================="
echo " Complete Node.js Process Cleanup"
echo "========================================="
echo
print_warning "This will kill ALL Node.js processes on the system!"
echo

# Show current Node processes
print_status "Current Node.js processes:"
ps aux | grep -E "node|tsx|pnpm|vite" | grep -v grep | awk '{print $2, $11, $12}' | head -20
echo

# Ask for confirmation
read -p "Are you sure you want to kill ALL Node.js processes? (yes/no): " -r CONFIRM

if [[ ! $CONFIRM =~ ^[Yy][Ee][Ss]$ ]]; then
    print_warning "Cleanup cancelled"
    exit 0
fi

print_status "Killing all Node.js related processes..."

# Kill all node processes
pkill -f node 2>/dev/null || true
pkill -f tsx 2>/dev/null || true
pkill -f pnpm 2>/dev/null || true
pkill -f npm 2>/dev/null || true
pkill -f yarn 2>/dev/null || true
pkill -f vite 2>/dev/null || true
pkill -f turbo 2>/dev/null || true
pkill -f expo 2>/dev/null || true
pkill -f jest-worker 2>/dev/null || true

# Kill processes on common development ports
for port in 3000 3001 3002 4000 5000 5173 8000 8080 8081 8085 19000 19001 19002; do
    pids=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pids" ]; then
        for pid in $pids; do
            print_status "Killing process on port $port (PID: $pid)"
            kill -9 $pid 2>/dev/null || true
        done
    fi
done

# Final cleanup - force kill any remaining node processes
remaining=$(pgrep -f "node|tsx|pnpm|npm|yarn|vite" 2>/dev/null | wc -l)
if [ "$remaining" -gt 0 ]; then
    print_warning "Force killing $remaining remaining processes..."
    pgrep -f "node|tsx|pnpm|npm|yarn|vite" | xargs -r kill -9 2>/dev/null || true
fi

sleep 1

# Check if any processes remain
remaining=$(pgrep -f "node|tsx|pnpm|npm|yarn|vite" 2>/dev/null | wc -l)
if [ "$remaining" -eq 0 ]; then
    print_success "All Node.js processes have been terminated!"
else
    print_warning "Some processes may still be running:"
    ps aux | grep -E "node|tsx|pnpm|vite" | grep -v grep
fi

echo
echo "To restart Golden Palace, run: ./launch.sh"
echo