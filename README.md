# Golden Palace Platform

> P2P Financial Collaboration Platform with Real-time Chat and Advanced Trading Features

## 🚀 Tech Stack (Latest 2024-2025)

- **Frontend**: React 19, Next.js 15, TailwindCSS 3.4, Zustand, TanStack Query v5
- **Backend**: Node.js 20+ LTS, Express 5, Socket.io v4, TypeScript 5.7+
- **Database**: PostgreSQL 17, Prisma 6 (Rust-free), Redis 7
- **Testing**: Vitest 3, React Testing Library, Playwright
- **Tooling**: Turborepo, pnpm, Biome (linting/formatting), TypeScript strict mode

## 📁 Project Structure

```
golden-palace/
├── apps/
│   ├── api/                 # Node.js + Express API
│   └── web/                 # Next.js 15 frontend
├── packages/
│   ├── database/            # Prisma 6 schema + client
│   ├── shared/              # Types, utilities, constants
│   ├── ui/                  # Shared React components
│   └── config/              # Shared configurations
├── infrastructure/          # Docker, K8s configs
└── tooling/                 # Development tools
```

## 🛠️ Development Setup

### Prerequisites

- Node.js 20+ LTS
- pnpm 9+
- Docker & Docker Compose
- PostgreSQL 17
- Redis 7

### Quick Start

```bash
# Clone and install dependencies
git clone <repo-url> golden-palace
cd golden-palace
pnpm install

# Start development databases
pnpm docker:dev

# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Start development servers
pnpm dev
```

## 📦 Available Scripts

```bash
# Development
pnpm dev                    # Start all apps in development
pnpm dev --filter=api       # Start only API
pnpm dev --filter=web       # Start only frontend

# Building
pnpm build                  # Build all packages
pnpm build --filter=shared  # Build specific package

# Testing
pnpm test                   # Run all tests
pnpm test:coverage          # Run tests with coverage
pnpm test --filter=api      # Test specific package

# Code Quality
pnpm lint                   # Lint all code
pnpm lint:fix               # Fix linting issues
pnpm format                 # Format code with Biome
pnpm type-check             # TypeScript type checking

# Database
pnpm db:generate            # Generate Prisma client
pnpm db:push                # Push schema changes
pnpm db:migrate             # Run migrations
pnpm db:studio              # Open Prisma Studio

# Docker
pnpm docker:dev             # Start development services
pnpm docker:down            # Stop development services
```

## 🏗️ Architecture Overview

### Monorepo Benefits
- **Shared Types**: Type-safe APIs across frontend/backend
- **Code Reuse**: Shared utilities and components
- **Coordinated Builds**: Turborepo caching and parallelization
- **Unified Tooling**: Consistent linting, formatting, testing

### Key Features Built
- ✅ Comprehensive TypeScript setup with strict mode
- ✅ Prisma 6 database schema for trading platform
- ✅ Modern build system with Turborepo
- ✅ Fast linting and formatting with Biome
- ✅ Testing setup with Vitest 3
- ✅ Docker development environment
- ✅ Shared type definitions and utilities

## 📊 Database Schema

The Prisma schema includes:
- **Users**: Authentication, profiles, trading preferences
- **Groups**: Chat rooms with role-based permissions
- **Messages**: Real-time messaging with attachments
- **Trading**: Trade ideas, paper positions, P&L tracking
- **Competitions**: Gamified trading competitions
- **Technical Analysis**: Collaborative charting tools

## 🧪 Testing Strategy

### TDD Approach (Red-Green-Refactor)
1. **Write failing tests** for new features
2. **Implement minimal code** to pass tests
3. **Refactor and optimize** while keeping tests green

### Testing Layers
- **Unit Tests**: Individual functions and components
- **Integration Tests**: API endpoints and database operations
- **E2E Tests**: Complete user workflows with Playwright

### Coverage Requirements
- **Minimum 80%** overall coverage
- **90%** for critical business logic
- Real-time test execution with watch mode

## 🚀 Deployment Ready

### Production Checklist
- ✅ TypeScript strict mode compliance
- ✅ Comprehensive error handling
- ✅ Database migrations and seeding
- ✅ Environment configuration
- ✅ Docker containerization ready
- ✅ CI/CD pipeline structure

### Performance Optimizations
- **Turborepo caching** for faster builds
- **Vite 6** for lightning-fast development
- **Biome** for sub-second linting
- **pnpm** for efficient package management

## 🔐 Security Features

- JWT authentication with refresh tokens
- Input validation with Zod schemas
- SQL injection prevention (Prisma)
- XSS protection and CORS configuration
- Rate limiting and request validation

## 📈 Next Steps

### Phase 1: Core Development (Weeks 1-4)
1. **Authentication system** with TDD
2. **Real-time chat** with Socket.io
3. **Trading features** and paper trading
4. **Basic UI components** library

### Phase 2: Advanced Features (Weeks 5-8)
1. **Competition system** with leaderboards
2. **Collaborative TA** tools
3. **Advanced analytics** dashboard
4. **Mobile app** foundation

### Phase 3: Production (Weeks 9-12)
1. **Performance optimization**
2. **Security hardening**
3. **Load testing** and scaling
4. **Deployment** and monitoring

## 🤝 Contributing

### Development Workflow
1. Create feature branch from `main`
2. Write tests first (TDD approach)
3. Implement feature with type safety
4. Ensure all tests pass and coverage ≥80%
5. Run `pnpm lint:fix` and `pnpm format`
6. Submit PR with clear description

### Code Standards
- **TypeScript strict mode** required
- **File size limits**: 300 lines for components, 500 for services
- **Test coverage**: 80% minimum
- **No console.log** in production code
- **Descriptive commit messages**

## 📝 Documentation

- API documentation with OpenAPI/Swagger
- Component library with Storybook
- Database schema documentation
- Deployment guides and runbooks

---

**Built with ❤️ using the latest web technologies**

Ready for rapid development with Test-Driven Development, modern tooling, and enterprise-grade architecture.
