# @memory-bank/ - Project Knowledge Repository

## Overview
The @memory-bank/ directory serves as the institutional memory for the Golden Palace project, capturing debugging sessions, solutions, and accumulated knowledge to accelerate future development and troubleshooting.

## Directory Structure

```
@memory-bank/
├── README.md                          # This file
├── troubleshooting/
│   ├── risk-analytics-debugging.md    # Complete Risk Analytics debugging session
│   ├── common-patterns.md             # Recurring error patterns and solutions
│   └── database-issues.md             # Database-specific troubleshooting
├── architecture/
│   ├── api-patterns.md                # Backend API patterns and conventions
│   ├── frontend-patterns.md           # Frontend service patterns
│   └── database-schema.md             # Prisma schema design decisions
├── solutions/
│   ├── response-parsing-fix.md        # Frontend API response parsing fixes
│   ├── synthetic-data-generation.md   # Fallback data strategies
│   └── logging-strategies.md          # Debugging logging approaches
└── lessons-learned/
    ├── 2025-01-debugging-session.md   # Today's debugging session insights
    └── best-practices.md              # Accumulated development best practices
```

## Key Documents

### 🔍 Troubleshooting
- **[Risk Analytics Debugging](troubleshooting/risk-analytics-debugging.md)** - Complete chronicle of resolving 500 errors in Risk Analytics feature
- **[Common Patterns](troubleshooting/common-patterns.md)** - Quick reference for recurring issues and solutions

### 💡 Solutions
- **[Response Parsing Fix](solutions/response-parsing-fix.md)** - Detailed solution for frontend-backend API response mismatches

## How to Use This Repository

### For Debugging
1. **Check common patterns first** - Look in `troubleshooting/common-patterns.md` for similar issues
2. **Search for specific errors** - Use file search across the memory bank
3. **Follow established workflows** - Reference `@.ai/workflows/debugging-workflow.md`

### For New Issues
1. **Document the problem** - Create new file in appropriate subdirectory
2. **Include complete context** - Error logs, code snippets, environment details
3. **Document the solution** - Step-by-step resolution process
4. **Update patterns** - Add new patterns to `common-patterns.md`

### For Team Knowledge
1. **Review before starting complex tasks** - Check for existing solutions
2. **Document architectural decisions** - Add to `architecture/` directory
3. **Share insights** - Update relevant documents with new learnings

## Documentation Standards

### File Naming
- Use kebab-case for file names: `risk-analytics-debugging.md`
- Include dates for session-specific files: `2025-01-debugging-session.md`
- Use descriptive names that indicate content purpose

### Content Structure
```markdown
# Title

## Overview
Brief description of the issue/topic

## Problem/Context
Detailed problem description

## Solution/Analysis
Step-by-step solution or analysis

## Code Examples
Relevant code snippets with before/after

## Prevention
How to avoid this issue in the future

## Related Issues
Links to related documentation
```

### Code Snippets
- Always include language specification: ```typescript
- Show both incorrect and correct patterns when applicable
- Include file paths for context: `// apps/api/src/routes/example.ts`

## Contributing Guidelines

### Adding New Documentation
1. Choose appropriate subdirectory based on content type
2. Follow naming conventions and content structure
3. Include cross-references to related documents
4. Update this README if adding new categories

### Updating Existing Documentation
1. Keep historical accuracy - don't remove debugging steps that worked
2. Add new insights without removing context
3. Update timestamps and version information when relevant

## Integration with @.ai/

The memory bank works in conjunction with the `@.ai/` directory:
- **@memory-bank/** - Historical knowledge and solutions
- **@.ai/** - Active AI assistance workflows and prompts

Reference both when:
- Debugging complex issues
- Seeking AI assistance with context
- Planning development approaches

## Maintenance

### Regular Updates
- Add new patterns as they're discovered
- Update solutions when project architecture changes
- Archive outdated information with clear deprecation notes

### Quality Assurance
- Verify code examples still work with current project state
- Update file paths if project structure changes
- Maintain links between related documents

## Quick Access

### Most Useful Documents
1. [Common Patterns](troubleshooting/common-patterns.md) - First stop for any debugging
2. [Risk Analytics Debug](troubleshooting/risk-analytics-debugging.md) - Example of thorough debugging
3. [Response Parsing Fix](solutions/response-parsing-fix.md) - Critical frontend-backend fix

### Emergency Commands
See `troubleshooting/common-patterns.md` for emergency debugging commands and system reset procedures.

---

This memory bank grows with the project - contribute your debugging experiences and solutions to help the entire team work more efficiently.