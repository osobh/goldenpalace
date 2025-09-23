# Common Error Patterns & Solutions

## Overview
This document catalogs recurring error patterns encountered in the Golden Palace project, their root causes, and proven solutions. Use this as a quick reference guide during debugging sessions.

## Frontend-Backend Communication Issues

### Pattern: API Response Parsing Errors
**Symptoms:**
- Frontend receives undefined data despite backend success logs
- Error: "Cannot read property 'data' of undefined"
- Network tab shows 200 status but frontend throws errors

**Root Causes:**
1. **Double-wrapped response access** - Frontend expects nested structure
2. **Inconsistent response format** - API endpoints return different structures
3. **Missing error handling** - No validation of response shape

**Solutions:**
```typescript
// ✅ Correct pattern for Golden Palace APIs
if (!response.success || !response.data) {
  throw new Error(response.error || 'API call failed');
}
return response.data;

// ❌ Avoid double-wrapped access
// if (!response.data.success || !response.data.data)
```

**Prevention:**
- Use consistent API response interface across all endpoints
- Add runtime response validation
- Test API contracts with actual response data

---

## Database & Prisma Issues

### Pattern: Property Access on Undefined Models
**Symptoms:**
- Error: "Cannot read property 'X' of undefined"
- TypeScript errors about missing properties
- Database queries return null unexpectedly

**Root Causes:**
1. **Property name mismatches** - Code uses old property names
2. **Missing model relationships** - Forgotten includes in queries
3. **Schema changes** - Properties renamed/removed in migrations

**Solutions:**
```typescript
// ✅ Always check Prisma schema for correct property names
const portfolio = await prisma.portfolio.findUnique({
  where: { id },
  include: { assets: true } // Include relationships if needed
});

if (!portfolio) {
  throw new Error('Portfolio not found');
}

// Use portfolio.currentValue (not portfolio.totalValue)
```

**Prevention:**
- Compare code with current Prisma schema regularly
- Use TypeScript strict mode to catch property errors
- Generate types from Prisma schema

### Pattern: Missing Database Tables/Models
**Symptoms:**
- Error: "Table 'X' does not exist in current database"
- Prisma queries fail with unknown model errors
- `prisma db pull` overwrites custom schema

**Root Causes:**
1. **Accidental schema overwrite** - Running `db pull` without backup
2. **Missing migrations** - New models not pushed to database
3. **Environment mismatch** - Wrong database connection

**Solutions:**
```bash
# Restore schema from git
git checkout HEAD~1 -- packages/database/prisma/schema.prisma

# Push schema to database
cd packages/database && pnpm db:push

# Regenerate Prisma client
pnpm db:generate
```

**Prevention:**
- Never run `prisma db pull` without backing up schema
- Use migrations for schema changes
- Verify database connection before schema operations

---

## Import & Type Issues

### Pattern: Module Import Failures
**Symptoms:**
- Error: "Module not found" or "Export 'X' does not exist"
- TypeScript compilation fails on imports
- Runtime errors about undefined types

**Root Causes:**
1. **Export name changes** - Shared package exports renamed
2. **Missing package builds** - Shared packages not compiled
3. **Circular dependencies** - Packages importing each other

**Solutions:**
```typescript
// ✅ Check shared package exports
// packages/shared/src/index.ts
export type { RiskAnalyticsLevel } from './types/risk';

// ✅ Use correct import names
import type { RiskAnalyticsLevel } from '@golden-palace/shared';

// ❌ Avoid outdated imports
// import type { RiskLevel } from '@golden-palace/shared';
```

**Prevention:**
- Maintain up-to-date export index files
- Use IDE auto-import features
- Build shared packages before dependent packages

---

## Development Environment Issues

### Pattern: Port Conflicts & Server Startup
**Symptoms:**
- Error: "Port 3000 is already in use"
- Services fail to start in development
- Hot reload not working

**Root Causes:**
1. **Multiple server instances** - Previous servers not properly stopped
2. **Port conflicts** - Other applications using same ports
3. **File watching limits** - Too many files for hot reload

**Solutions:**
```bash
# Kill existing processes
pkill -f "pnpm dev"
pkill -f "next dev"
pkill -f "tsx watch"

# Check port usage
lsof -i :3000
lsof -i :3001

# Use launch script for coordinated startup
./launch.sh
```

**Prevention:**
- Use launch scripts for consistent startup
- Configure different ports for different environments
- Properly stop servers when switching branches

---

## Authentication & Authorization Issues

### Pattern: Development vs Production Auth
**Symptoms:**
- 401 Unauthorized errors in development
- Authentication works locally but fails in production
- User context missing in API routes

**Root Causes:**
1. **Environment-specific auth logic** - Different auth in dev/prod
2. **Missing authentication middleware** - Routes not protected
3. **Token expiration** - JWT tokens expired during development

**Solutions:**
```typescript
// ✅ Development authentication bypass
if (process.env.NODE_ENV === 'development') {
  router.use((req: any, _res: any, next: any) => {
    if (!req.user) {
      req.user = {
        id: 'dev-user-123',
        email: 'dev@goldenpalace.com',
        username: 'devuser'
      };
    }
    next();
  });
} else {
  router.use(authMiddleware.authenticate);
}
```

**Prevention:**
- Use environment variables for auth configuration
- Test authentication in both development and production modes
- Implement proper token refresh logic

---

## Performance & Memory Issues

### Pattern: Memory Leaks in Development
**Symptoms:**
- Development server becomes slow over time
- High memory usage during hot reload
- Browser tabs become unresponsive

**Root Causes:**
1. **Hot reload accumulation** - Event listeners not cleaned up
2. **Large synthetic datasets** - Generated data consuming memory
3. **Unclosed database connections** - Prisma connections leaking

**Solutions:**
```typescript
// ✅ Cleanup in development
useEffect(() => {
  // Setup logic
  return () => {
    // Cleanup logic
  };
}, []);

// ✅ Limit synthetic data size
const generateSyntheticData = (count: number = 100) => {
  // Limit to reasonable size
  const maxCount = Math.min(count, 1000);
  // Generate data
};
```

**Prevention:**
- Implement proper cleanup in React components
- Limit synthetic data generation size
- Monitor memory usage during development

---

## Build & Deployment Issues

### Pattern: TypeScript Compilation Errors
**Symptoms:**
- Build fails with type errors
- Development works but production build fails
- Inconsistent type checking results

**Root Causes:**
1. **Strict mode differences** - Dev vs prod TypeScript config
2. **Missing type definitions** - Dependencies without types
3. **Circular type references** - Types importing each other

**Solutions:**
```bash
# Run type checking manually
pnpm type-check

# Check specific package types
cd packages/shared && pnpm type-check

# Fix circular dependencies
# Move shared types to dedicated files
```

**Prevention:**
- Use consistent TypeScript config across environments
- Run type checking in CI/CD pipeline
- Regularly update type definitions

---

## Quick Debugging Checklist

### When You Encounter an Error:

1. **Categorize the Error**
   - [ ] Frontend-backend communication?
   - [ ] Database/Prisma issue?
   - [ ] Import/type problem?
   - [ ] Environment configuration?

2. **Add Logging**
   - [ ] Add console.log at error location
   - [ ] Log request/response data
   - [ ] Check database query results

3. **Verify Environment**
   - [ ] Correct database connection?
   - [ ] All services running?
   - [ ] Environment variables set?

4. **Check Recent Changes**
   - [ ] Schema modifications?
   - [ ] Package updates?
   - [ ] Configuration changes?

5. **Test Systematically**
   - [ ] Isolate the problem component
   - [ ] Test with minimal data
   - [ ] Verify fix doesn't break other features

### Emergency Commands
```bash
# Reset development environment
pkill -f "pnpm dev"
cd packages/database && pnpm db:push && pnpm db:generate
./launch.sh

# Check system status
docker ps  # Database status
lsof -i :3000  # API port
lsof -i :3001  # Web port

# Database emergency
cd packages/database
pnpm db:studio  # Visual inspection
git status  # Check for schema changes
```

This patterns document should be updated whenever new recurring issues are discovered.