# @.ai/ - AI Assistance & Workflows

## Overview
The @.ai/ directory contains structured prompts, workflows, and context specifically designed to enhance AI assistance for the Golden Palace project. This system enables more effective collaboration between developers and AI assistants.

## Directory Structure

```
@.ai/
├── README.md                           # This file
├── prompts/
│   ├── debugging-prompts.md            # AI prompts for debugging scenarios
│   ├── code-review-prompts.md          # Code review assistance prompts
│   └── architecture-prompts.md         # Architecture decision prompts
├── context/
│   ├── project-context.md              # Golden Palace project overview
│   ├── tech-stack-context.md           # Technology stack details
│   └── current-issues.md               # Active issues and concerns
├── workflows/
│   ├── debugging-workflow.md           # AI-assisted debugging process
│   ├── development-workflow.md         # Development process with AI
│   └── testing-workflow.md             # Testing approaches with AI
└── configurations/
    ├── claude-code-config.md           # Claude Code specific settings
    └── ai-assistants-config.md         # General AI assistant configurations
```

## Key Features

### 🤖 Context-Rich AI Interactions
- **Project Context** - Complete Golden Palace project overview for AI understanding
- **Technical Stack** - Detailed technology information for accurate assistance
- **Current State** - Active issues and development priorities

### 🔄 Systematic Workflows
- **Debugging Workflow** - Step-by-step AI-assisted debugging process
- **Development Workflow** - AI integration in development lifecycle
- **Testing Workflow** - AI-enhanced testing strategies

### 💡 Curated Prompts
- **Debugging Prompts** - Effective prompts for troubleshooting
- **Code Review Prompts** - AI assistance for code quality
- **Architecture Prompts** - Decision-making support for system design

## How to Use This System

### For Debugging Issues
1. **Start with context** - Reference `context/project-context.md`
2. **Follow the workflow** - Use `workflows/debugging-workflow.md`
3. **Use effective prompts** - Apply templates from `prompts/debugging-prompts.md`

### For Development Tasks
1. **Check current priorities** - Review `context/current-issues.md`
2. **Apply development workflow** - Follow `workflows/development-workflow.md`
3. **Get architecture guidance** - Use `prompts/architecture-prompts.md`

### For Code Reviews
1. **Prepare context** - Include relevant project information
2. **Use review prompts** - Apply templates from `prompts/code-review-prompts.md`
3. **Reference standards** - Check against project conventions

## Integration with @memory-bank/

The AI system works in conjunction with the memory bank:
- **@.ai/** - Active workflows and AI assistance
- **@memory-bank/** - Historical knowledge and solutions

### Combined Usage
```
When debugging:
1. Check @memory-bank/troubleshooting/ for similar issues
2. Use @.ai/workflows/debugging-workflow.md for systematic approach
3. Apply @.ai/prompts/debugging-prompts.md for AI assistance
4. Document results in @memory-bank/ for future reference
```

## AI Assistant Configuration

### Context Loading
Before starting any AI assistance session, provide:
1. **Project Overview** from `context/project-context.md`
2. **Current Issue Context** from relevant memory bank documents
3. **Specific Task Details** with clear objectives

### Prompt Templates
Use structured prompts that include:
- **Background Context** - Project and technical details
- **Specific Problem** - Clear problem statement
- **Expected Outcome** - What you want to achieve
- **Constraints** - Technical or business limitations

### Example AI Session Setup
```
Context: Golden Palace project (see @.ai/context/project-context.md)
Issue: Similar to the risk analytics debugging in @memory-bank/troubleshooting/
Current Task: [Specific task description]
Expected Outcome: [Clear outcome description]
```

## Workflow Guidelines

### Debugging Sessions
1. **Load project context** - Ensure AI understands the codebase
2. **Provide error context** - Include logs, stack traces, recent changes
3. **Follow systematic approach** - Use the debugging workflow
4. **Document results** - Update memory bank with findings

### Development Planning
1. **Reference architecture context** - Include system design information
2. **Consider existing patterns** - Check memory bank for established patterns
3. **Plan incrementally** - Break complex tasks into smaller chunks
4. **Validate against conventions** - Ensure adherence to project standards

### Code Review Process
1. **Prepare comprehensive context** - Include related files and functionality
2. **Focus on specific areas** - Target review on critical sections
3. **Check against standards** - Verify compliance with project conventions
4. **Document insights** - Add learnings to memory bank

## Maintenance

### Regular Updates
- **Update context files** when project architecture changes
- **Refine prompts** based on AI interaction effectiveness
- **Add new workflows** as development processes evolve
- **Archive outdated configurations** with clear deprecation notes

### Quality Assurance
- **Test prompt effectiveness** with actual AI interactions
- **Validate context accuracy** against current project state
- **Update cross-references** between @.ai/ and @memory-bank/
- **Maintain consistency** across all documentation

## Best Practices

### Effective AI Collaboration
1. **Provide rich context** - More context leads to better assistance
2. **Be specific** - Clear, specific questions get better answers
3. **Iterate systematically** - Build solutions incrementally
4. **Document everything** - Capture insights for future use

### Context Management
1. **Keep context current** - Update files as project evolves
2. **Reference specific documents** - Link to exact memory bank entries
3. **Include version information** - Note when context was last updated
4. **Cross-reference liberally** - Connect related information

### Workflow Adherence
1. **Follow established processes** - Use documented workflows consistently
2. **Adapt as needed** - Modify workflows based on experience
3. **Share improvements** - Update workflows with new insights
4. **Train team members** - Ensure consistent AI assistance usage

## Integration Examples

### Example 1: Debugging Session
```
I'm debugging a similar issue to the Risk Analytics problem documented in
@memory-bank/troubleshooting/risk-analytics-debugging.md.

Current context:
- Project: Golden Palace (details in @.ai/context/project-context.md)
- Issue: [Specific error description]
- Environment: [Development/staging/production]
- Recent changes: [Git commits or changes made]

Following the workflow in @.ai/workflows/debugging-workflow.md, I need help with:
[Specific assistance needed]
```

### Example 2: Architecture Decision
```
I need help making an architecture decision for the Golden Palace project.

Context:
- Project overview: @.ai/context/project-context.md
- Current architecture: [Relevant architecture details]
- New requirement: [Specific requirement description]

Using the prompts in @.ai/prompts/architecture-prompts.md, please help me evaluate:
[Specific options or concerns]
```

---

This AI assistance system is designed to evolve with the project. Contribute improvements and new insights to enhance the effectiveness of AI collaboration in Golden Palace development.