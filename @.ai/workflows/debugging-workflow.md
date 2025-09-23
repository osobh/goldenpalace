# AI-Assisted Debugging Workflow

## Overview
This document outlines the systematic debugging workflow used successfully to resolve the Risk Analytics 500 error issue. This workflow can be applied to similar complex debugging scenarios in the Golden Palace project.

## Phase 1: Initial Assessment and Logging

### 1.1 Problem Definition
- **Gather exact error symptoms** from user reports
- **Identify affected components** (frontend, backend, database)
- **Collect initial error logs** and HTTP status codes
- **Determine user impact** and urgency level

### 1.2 Enhanced Logging Implementation
When the issue isn't immediately clear, add comprehensive logging:

#### Backend Route Logging
```typescript
// Add to route handlers
console.log('[ModuleName Route] ENDPOINT - Start');
console.log('[ModuleName Route] Request body:', JSON.stringify(req.body, null, 2));
console.log('[ModuleName Route] User context:', { userId: req.user?.id });
console.log('[ModuleName Route] Calling service with:', input);
```

#### Service Layer Logging
```typescript
// Add to service methods
console.log('[ModuleName Service] Method start with:', params);
console.log('[ModuleName Service] Database query result:', result);
console.log('[ModuleName Service] Calculated result keys:', Object.keys(result || {}));
```

#### Repository Logging
```typescript
// Add to data access methods
console.log('[ModuleName Repository] Query parameters:', params);
console.log('[ModuleName Repository] Generated synthetic data:', data.length, 'items');
```

### 1.3 Log Analysis Strategy
1. **Trace request flow** from frontend to backend
2. **Identify the exact failure point** using timestamp correlation
3. **Look for undefined/null access patterns** in stack traces
4. **Check database query patterns** for missing tables/columns

## Phase 2: Systematic Error Resolution

### 2.1 Type and Import Issues (First Priority)
Address compile-time errors first:

#### Check Import Statements
```bash
# Search for import issues
grep -r "import.*RiskLevel" apps/api/src/
grep -r "from '@golden-palace/shared'" apps/
```

#### Verify Shared Package Exports
```typescript
// Check packages/shared/src/index.ts
export type { RiskAnalyticsLevel } from './types/risk';
// Not: export type { RiskLevel }
```

#### Fix Import Mismatches
```typescript
// ❌ BEFORE
import type { RiskLevel } from '@golden-palace/shared';

// ✅ AFTER
import type { RiskAnalyticsLevel } from '@golden-palace/shared';
```

### 2.2 Property Access Issues (Second Priority)
Fix runtime property access errors:

#### Compare with Prisma Schema
```bash
# Check actual model properties
cat packages/database/prisma/schema.prisma | grep -A 10 "model Portfolio"
```

#### Update Property References
```typescript
// ❌ BEFORE
portfolio.totalValue

// ✅ AFTER (check Prisma schema)
portfolio.currentValue
```

### 2.3 Database Schema Issues (Third Priority)
Handle missing tables/models:

#### Verify Database State
```bash
cd packages/database
pnpm db:studio  # Check actual database tables
```

#### Restore Missing Models
```bash
# If schema was overwritten
git diff HEAD~1 -- prisma/schema.prisma
git checkout HEAD~1 -- prisma/schema.prisma
pnpm db:push && pnpm db:generate
```

#### Implement Fallback Data
```typescript
// For missing historical models
async getReturns(portfolioId: string): Promise<number[]> {
  // Temporarily generate synthetic data
  const returns: number[] = [];
  for (let i = 0; i < days; i++) {
    returns.push((Math.random() - 0.48) * 0.04);
  }
  return returns;
}
```

### 2.4 Frontend-Backend Communication (Fourth Priority)
Fix API response parsing issues:

#### Verify Response Structure
```typescript
// Add debugging in frontend service
console.log('API Response:', JSON.stringify(response, null, 2));
console.log('Response keys:', Object.keys(response));
```

#### Fix Response Parsing
```typescript
// ❌ BEFORE (double-wrapped)
if (!response.data.success || !response.data.data) {
  throw new Error(response.data.error);
}
return response.data.data;

// ✅ AFTER (single-wrapped)
if (!response.success || !response.data) {
  throw new Error(response.error);
}
return response.data;
```

## Phase 3: Verification and Testing

### 3.1 End-to-End Testing
1. **Test the complete user flow** from UI interaction to data persistence
2. **Verify database writes** using Prisma Studio or direct queries
3. **Check console logs** for any remaining warnings or errors
4. **Test error scenarios** (invalid input, network issues)

### 3.2 Performance Validation
1. **Monitor response times** for the fixed endpoints
2. **Check database query efficiency** in logs
3. **Verify memory usage** doesn't spike with synthetic data

## AI Prompting Strategies

### 3.1 Context-Rich Prompts
When asking for AI assistance, provide:

```
I'm debugging a 500 error in our Risk Analytics feature. Here's the context:

**Project**: Golden Palace (Turborepo monorepo with Next.js 15 + Express API + Prisma 6)
**Issue**: 500 errors when clicking "Run Analysis" button
**Backend logs**: [paste relevant logs]
**Error location**: apps/api/src/routes/riskAnalytics.routes.ts:78
**Stack trace**: [paste stack trace]
**Current hypothesis**: Missing database model or incorrect property access

Can you help identify the root cause and suggest a fix?
```

### 3.2 Incremental Problem Solving
Break large problems into smaller chunks:

```
"Let's focus on just the type import issue first. I have this error:
[paste specific error]

After we fix this, we'll move to the next issue."
```

### 3.3 Code Context Sharing
Share relevant code sections with clear labels:

```
Here's the failing service method:
```typescript
// apps/api/src/services/riskAnalytics.service.ts:150-170
[paste code block]
```

And here's the Prisma model:
```prisma
// packages/database/prisma/schema.prisma
model Portfolio {
  // ... model definition
}
```
```

## Tools and Commands

### Debugging Commands
```bash
# Backend logs with timestamps
cd apps/api && pnpm dev 2>&1 | ts '%Y-%m-%d %H:%M:%S'

# Frontend logs
cd apps/web && pnpm dev

# Database inspection
cd packages/database && pnpm db:studio

# Schema comparison
git diff HEAD~1 -- packages/database/prisma/schema.prisma

# Parallel development servers
./launch.sh
```

### Search and Analysis
```bash
# Find import usage
grep -r "import.*RiskLevel" .

# Find property usage
grep -r "\.totalValue" apps/api/src/

# Check for missing models
grep -r "portfolioSnapshot" packages/database/prisma/
```

## Common Patterns and Solutions

### Pattern 1: Import Not Found
- **Symptom**: "Module not found" or "Export not found"
- **Solution**: Check shared package exports, verify exact export names
- **Prevention**: Use IDE auto-import, maintain export index files

### Pattern 2: Property Undefined
- **Symptom**: "Cannot read property 'X' of undefined"
- **Solution**: Compare with Prisma schema, use correct property names
- **Prevention**: Generate TypeScript types from Prisma, use strict mode

### Pattern 3: Missing Database Table
- **Symptom**: "Table 'X' doesn't exist in database"
- **Solution**: Restore schema from git, create missing models
- **Prevention**: Backup schema before db:pull, use migrations

### Pattern 4: Response Structure Mismatch
- **Symptom**: Frontend gets undefined data despite backend success
- **Solution**: Align response parsing with actual API structure
- **Prevention**: Use TypeScript interfaces, test API contracts

## Success Metrics

### Debugging Session Success
- ✅ Error eliminated completely
- ✅ Full end-to-end functionality restored
- ✅ No performance degradation
- ✅ Logging retained for future debugging
- ✅ Root cause documented for future reference

### Knowledge Capture
- ✅ Debugging steps documented in @memory-bank/
- ✅ Solution patterns added to knowledge base
- ✅ AI prompts refined for similar issues
- ✅ Prevention measures identified and implemented

This workflow provides a systematic approach to complex debugging scenarios and ensures knowledge is captured for future AI assistance.