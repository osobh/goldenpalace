# Technical Context

## Technology Stack
- **Language**: TypeScript 5.7+ (strict mode enabled)
- **Frontend**: Next.js 15 + React 19 + TailwindCSS 3.4
- **Backend**: Node.js 20+ LTS + Express 5 + Socket.IO v4
- **Database**: PostgreSQL 17 + Prisma 6 (Rust-free) + Redis 7
- **Testing**: Vitest 3 + React Testing Library + Playwright
- **Build System**: Turborepo + pnpm workspaces
- **Code Quality**: Biome (linting/formatting) + TypeScript strict mode
- **State Management**: Zustand + TanStack Query v5
- **Styling**: TailwindCSS + Headless UI
- **Real-time**: Socket.IO for chat and live features

## Development Setup
```bash
# Prerequisites: Node.js 20+, pnpm 9+, Docker
# Clone and install
git clone <repo> golden-palace && cd golden-palace
pnpm install

# Start development services
pnpm docker:dev

# Setup database
pnpm db:generate && pnpm db:migrate

# Start development
pnpm dev
```

## Key Dependencies
- **Express 5**: Latest Express for high-performance API
- **Prisma 6**: Modern ORM with type safety and performance
- **Socket.IO v4**: Real-time bidirectional communication
- **Zod**: Runtime type validation for API inputs
- **bcrypt**: Secure password hashing
- **jsonwebtoken**: JWT token management
- **Vitest 3**: Fast unit and integration testing
- **Turborepo**: Monorepo build system with caching
- **Biome**: Fast linting and formatting (Prettier + ESLint replacement)

## Technical Constraints
- **File Size Limits**: 300 lines for components, 500 for services, 900 for complex modules
- **Test Coverage**: Minimum 80% overall, 90% for business logic
- **TypeScript Strict Mode**: All code must pass strict type checking
- **No console.log**: Production code must use proper logging
- **TDD Required**: All new features must follow red-green-refactor
- **Monorepo Structure**: Shared packages for types, UI, and utilities

## Development Patterns
- **Test-Driven Development**: Write failing tests first, implement, refactor
- **Repository Pattern**: Data access abstraction for all database operations
- **Service Layer**: Business logic separation from controllers
- **Type-First Development**: Shared types between frontend and backend
- **Error-First Design**: Comprehensive error handling with proper HTTP codes
- **Middleware Chains**: Authentication, validation, rate limiting
- **Event-Driven Architecture**: Socket.IO for real-time features

## Architecture Decisions
- **Monorepo**: Enables shared types and coordinated builds
- **PostgreSQL**: ACID compliance for financial data integrity
- **JWT + Refresh Tokens**: Secure stateless authentication
- **Socket.IO**: Proven real-time messaging solution
- **Prisma**: Type-safe database access with excellent DevX
- **TailwindCSS**: Utility-first CSS for rapid UI development