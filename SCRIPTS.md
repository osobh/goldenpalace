# Golden Palace Scripts Documentation

## Quick Start

The Golden Palace platform includes several convenience scripts to manage your development environment:

### 🚀 launch.sh
**Purpose**: Start the entire Golden Palace stack with a single command

```bash
./launch.sh
```

This script will:
- ✅ Check prerequisites (Docker, Node.js, npm)
- ✅ Create all necessary .env files with correct database credentials
- ✅ Start PostgreSQL and Redis containers
- ✅ Wait for services to be healthy
- ✅ Install dependencies if needed
- ✅ Run database migrations
- ✅ Start both API and Web servers
- ✅ Display all service URLs

**Features**:
- Idempotent - safe to run multiple times
- Automatic environment setup
- Health checks for all services
- Color-coded output for clarity
- Graceful shutdown with Ctrl+C

### 🛑 stop.sh
**Purpose**: Gracefully stop all platform services

```bash
./stop.sh
```

This script will:
- Stop all Node.js services
- Optionally stop Docker containers
- Clean up temporary files
- Show restart instructions

### 🔧 dev.sh
**Purpose**: Development helper with common commands

```bash
./dev.sh [command]
```

Available commands:

| Command | Description |
|---------|-------------|
| `start` | Start all services (same as ./launch.sh) |
| `stop` | Stop all services (same as ./stop.sh) |
| `restart` | Restart all services |
| `status` | Show status of all services |
| `logs [service]` | Show logs (api\|web\|postgres\|redis\|all) |
| `test [scope]` | Run tests (all\|api\|web\|unit\|integration) |
| `lint` | Run linting on all packages |
| `typecheck` | Run type checking on all packages |
| `migrate` | Run database migrations |
| `migrate:reset` | Reset database and run migrations |
| `seed` | Seed database with sample data |
| `studio` | Open Prisma Studio for database management |
| `build` | Build all packages for production |
| `clean` | Clean all node_modules and dist folders |
| `setup` | Initial setup (install deps, build, migrate) |
| `psql` | Connect to PostgreSQL CLI |
| `redis-cli` | Connect to Redis CLI |
| `help` | Show help information |

## Environment Configuration

The scripts automatically configure the following services:

### PostgreSQL Database
- **User**: `dev_user`
- **Password**: `dev_password`
- **Database**: `golden_palace_dev`
- **Port**: `5432`

### Redis Cache
- **Port**: `6379`

### API Server
- **Port**: `3002`
- **URL**: `http://localhost:3002`

### Web Interface
- **Port**: `3000`
- **URL**: `http://localhost:3000`

### Admin Tools
- **Adminer** (Database UI): `http://localhost:8080`
- **Redis Commander**: `http://localhost:8081` (admin/admin)

## Common Development Workflows

### First Time Setup
```bash
# Clone the repository
git clone <repo-url>
cd goldenpalace

# Run initial setup
./dev.sh setup

# Start the platform
./launch.sh
```

### Daily Development
```bash
# Start everything
./launch.sh

# Check status
./dev.sh status

# Watch logs
./dev.sh logs api  # API logs
./dev.sh logs web  # Web logs

# Run tests
./dev.sh test all

# Stop everything
./stop.sh
```

### Database Management
```bash
# Open visual database editor
./dev.sh studio

# Connect to PostgreSQL CLI
./dev.sh psql

# Reset database
./dev.sh migrate:reset

# Seed with test data
./dev.sh seed
```

### Troubleshooting

#### Port Already in Use
If you see errors about ports being in use:
```bash
# Stop all services
./stop.sh

# Check what's using the ports
lsof -i :3000  # Web port
lsof -i :3002  # API port
lsof -i :5432  # PostgreSQL port

# Kill specific processes if needed
kill -9 <PID>
```

#### Database Connection Issues
If you can't connect to the database:
```bash
# Check Docker containers
docker ps

# Restart database
docker compose -f docker-compose.dev.yml restart postgres

# Check database logs
./dev.sh logs postgres
```

#### Clean Restart
For a completely fresh start:
```bash
# Stop everything
./stop.sh

# Clean project
./dev.sh clean

# Remove Docker volumes (WARNING: deletes all data)
docker compose -f docker-compose.dev.yml down -v

# Setup and start fresh
./dev.sh setup
./launch.sh
```

## Production Deployment

For production deployment, you should:
1. Update all JWT secrets in .env files
2. Use proper database credentials
3. Configure SSL/TLS
4. Use `npm run build` instead of dev mode
5. Set up proper process management (PM2, systemd, etc.)
6. Configure reverse proxy (nginx, caddy, etc.)

## Script Customization

All scripts are designed to be easily customizable. Key variables are defined at the top of each script:

```bash
# In launch.sh, stop.sh, and dev.sh:
DB_USER="dev_user"
DB_PASSWORD="dev_password"
DB_NAME="golden_palace_dev"
DB_PORT="5432"
REDIS_PORT="6379"
API_PORT="3002"
WEB_PORT="3000"
```

Modify these values if you need different configurations.

## Support

If you encounter issues:
1. Check `./dev.sh status` to see which services are running
2. Review logs with `./dev.sh logs all`
3. Try a clean restart with `./stop.sh` then `./launch.sh`
4. Check the [troubleshooting](#troubleshooting) section above

Happy coding! 🚀