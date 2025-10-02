---
inclusion: always
---

# Sequential Thinking MCP Integration Guide

## Mandatory Use Cases for GrabZilla 2.1

**ALWAYS use sequential thinking for:**

### Binary Management Decisions
- Local vs system binary execution patterns
- Cross-platform binary path resolution (`./binaries/yt-dlp` vs `./binaries/yt-dlp.exe`)
- Binary existence validation and fallback strategies
- Command injection prevention in subprocess execution

### Electron Security Architecture
- IPC channel design between main and renderer processes
- Preload script security patterns (`contextIsolation`, `nodeIntegration: false`)
- File system access restrictions and sandboxing
- User input sanitization before binary execution

### Video Processing Workflows
- yt-dlp + ffmpeg integration patterns
- Quality/format selection logic with intelligent fallbacks
- Progress monitoring and error handling for long-running processes
- Concurrent download management (max 3 parallel)

### Code Organization Decisions
- File splitting when approaching 300-line limit
- Module dependency resolution and circular dependency prevention
- Component communication patterns (event-driven vs direct calls)
- State management architecture for video queue

## Decision Frameworks

### Binary Execution Security Pattern
```
Thought 1: Analyze user input and identify potential injection vectors
Thought 2: Design sanitization strategy for URLs, paths, and arguments
Thought 3: Evaluate subprocess execution options (spawn vs execFile)
Thought 4: Plan error handling for binary failures and timeouts
Thought 5: Implement validation and testing strategy
```

### Performance Optimization Strategy
```
Thought 1: Identify performance bottlenecks (UI blocking, memory usage)
Thought 2: Analyze async/await patterns and Promise handling
Thought 3: Design non-blocking startup sequence
Thought 4: Plan progress feedback and UI responsiveness
Thought 5: Validate against performance benchmarks (2s startup, 100ms response)
```

### File Organization Analysis
```
Thought 1: Assess current file size and complexity
Thought 2: Identify logical separation boundaries
Thought 3: Design module export/import patterns
Thought 4: Plan dependency injection and testing
Thought 5: Validate against 300-line limit and maintainability
```

## Project-Specific Thought Patterns

### URL Validation Architecture
- Start with regex pattern analysis for YouTube/Vimeo URLs
- Consider edge cases (playlists, age-restricted content, private videos)
- Design validation pipeline with yt-dlp metadata fetching
- Plan error handling for invalid/inaccessible URLs
- End with testable validation functions

### State Management Design
- Begin with data flow analysis (user input → processing → UI updates)
- Evaluate centralized vs distributed state patterns
- Consider event-driven updates vs direct state mutation
- Plan persistence and recovery strategies
- Conclude with implementation and testing approach

### Error Handling Strategy
- Start with error categorization (network, binary, user input, system)
- Design user-friendly error message mapping
- Plan graceful degradation when dependencies unavailable
- Consider retry strategies and exponential backoff
- End with comprehensive error boundary implementation

## Quality Gates

### Security Validation
- All user inputs sanitized before subprocess execution
- File paths validated against directory traversal attacks
- Binary execution uses relative paths only (`./binaries/`)
- IPC channels implement proper privilege separation

### Performance Standards
- UI remains interactive during all operations
- Background tasks use async patterns with proper error handling
- Memory usage scales linearly with video queue size
- Network operations timeout within 5 seconds

### Code Quality Metrics
- Functions under 50 lines with single responsibility
- Files under 300 lines with logical module boundaries
- All async operations wrapped in try-catch blocks
- JSDoc documentation for all public functions

## Integration with Development Workflow

### Before Implementation
1. Use sequential thinking to analyze requirements
2. Design architecture with security and performance considerations
3. Plan testing strategy and edge case handling
4. Validate against project conventions and file size limits

### During Development
- Question assumptions about binary availability and permissions
- Consider cross-platform compatibility at each step
- Validate error handling paths and user experience
- Ensure code organization follows modular patterns

### After Implementation
- Review solution against original problem requirements
- Test edge cases and failure scenarios
- Validate performance against benchmarks
- Document decisions and rationale for future reference