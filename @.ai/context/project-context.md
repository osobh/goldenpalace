# Golden Palace Project Context

## Project Overview
Golden Palace is a P2P Financial Collaboration Platform with Real-time Chat and Advanced Trading Features. It's built as a modern monorepo using cutting-edge web technologies and focuses on providing comprehensive risk analytics and portfolio management tools.

## Architecture
- **Type**: Turborepo monorepo
- **Frontend**: React 19, Next.js 15, TailwindCSS 3.4, Zustand, TanStack Query v5
- **Backend**: Node.js 20+ LTS, Express 5, Socket.io v4, TypeScript 5.7+
- **Database**: PostgreSQL 17, Prisma 6 (Rust-free), Redis 7
- **Testing**: Vitest 3, React Testing Library, Playwright
- **Tooling**: Turborepo, pnpm, Biome (linting/formatting), TypeScript strict mode

## Project Structure
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
├── @memory-bank/            # Project knowledge and troubleshooting
├── @.ai/                    # AI assistance and workflows
├── infrastructure/          # Docker, K8s configs
└── tooling/                 # Development tools
```

## Core Features

### 1. Risk Analytics Engine
- **VaR (Value at Risk)** calculations with configurable confidence levels
- **CVaR (Conditional Value at Risk)** for tail risk assessment
- **Sharpe Ratio** and **Sortino Ratio** for risk-adjusted returns
- **Maximum Drawdown** analysis
- **Monte Carlo simulations** for portfolio stress testing
- **Liquidity risk** assessment
- **Position-level risk** breakdown

### 2. Portfolio Management
- Multi-portfolio support per user
- Real-time portfolio valuation
- Asset allocation tracking
- Performance analytics
- Historical snapshots (planned)

### 3. Real-time Features
- Live portfolio updates
- Real-time chat (planned)
- Socket.io integration for real-time data

### 4. Trading & Competition
- Paper trading simulation
- Trading competitions with leaderboards
- P&L tracking
- Trade idea sharing

## Database Schema Key Models

### Core Entities
- **User**: Authentication, profiles, trading preferences
- **Portfolio**: User portfolios with current values and allocations
- **PortfolioAsset**: Individual assets within portfolios
- **RiskMetrics**: Risk analytics results storage
- **Groups**: Chat rooms with role-based permissions (planned)
- **Messages**: Real-time messaging with attachments (planned)

### Risk Analytics
- **RiskMetrics**: Stores calculated risk metrics (VaR, CVaR, Sharpe, etc.)
- **RiskAnalyticsLevel**: Enum for risk severity (LOW, MEDIUM, HIGH, CRITICAL)

## Development Environment

### Database Setup
- **Development DB**: PostgreSQL on localhost:5434
- **Database Name**: golden_palace_dev
- **Connection**: Via Prisma client

### Development Servers
- **API**: http://localhost:3000 (Express server)
- **Web**: http://localhost:3001 (Next.js frontend)
- **Database Studio**: Via `pnpm db:studio`

### Key Scripts
```bash
pnpm dev                    # Start all apps
pnpm db:push                # Push Prisma schema
pnpm db:generate            # Generate Prisma client
./launch.sh                 # Start API and Web in parallel
```

## Current Development Phase

### Recently Completed
- ✅ Risk Analytics feature implementation
- ✅ Frontend-backend API integration
- ✅ Database schema with Prisma 6
- ✅ Comprehensive error handling and logging
- ✅ Response parsing fixes for API communication

### In Progress
- 📝 Documentation and knowledge management system
- 📝 AI assistance workflows and prompts

### Planned Features
- 🔄 Real-time chat implementation
- 🔄 Portfolio snapshot tracking
- 🔄 Advanced technical analysis tools
- 🔄 Mobile app foundation

## Known Technical Patterns

### API Response Format
All API endpoints follow consistent response structure:
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### Error Handling
- Comprehensive logging with context markers (e.g., `[RiskAnalytics Route]`)
- Graceful degradation with synthetic data when models missing
- Type-safe error propagation from backend to frontend

### Database Patterns
- Prisma for type-safe database operations
- Synthetic data generation for missing historical models
- Decimal fields for financial precision

## Development Best Practices

### Code Quality
- TypeScript strict mode enforced
- 80% minimum test coverage requirement
- Biome for linting and formatting
- No console.log in production code

### Git Workflow
- Feature branches from main
- Test-driven development (TDD)
- Clear commit messages
- PR reviews required

### Debugging Approach
1. Add comprehensive logging at key points
2. Verify database schema and model availability
3. Check frontend-backend response contracts
4. Use synthetic data for missing dependencies
5. Test end-to-end data flow

## Security Considerations
- JWT authentication with refresh tokens
- Input validation with Zod schemas
- SQL injection prevention via Prisma
- XSS protection and CORS configuration
- Rate limiting and request validation

## Performance Optimizations
- Turborepo caching for faster builds
- Vite 6 for lightning-fast development
- pnpm for efficient package management
- Parallel processing for risk calculations

This context should inform all AI assistance and development decisions for the Golden Palace project.