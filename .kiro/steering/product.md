---
inclusion: always
---

# GrabZilla 2.1 - Product Conventions

Electron-based YouTube/Vimeo downloader with professional video management interface.

## CRITICAL RULES (Must Follow)

### Binary Management
- **ALWAYS use relative paths**: `./binaries/yt-dlp` and `./binaries/ffmpeg`
- **NEVER use system binaries**: No global `yt-dlp` or `ffmpeg` commands
- **Platform detection**: Append `.exe` on Windows: `process.platform === 'win32' ? '.exe' : ''`
- **Existence check**: Verify binary files exist before spawning processes
- **Error handling**: Graceful fallback when binaries are missing

### Security Requirements
- **URL validation**: Regex validation before passing URLs to yt-dlp
- **Command injection prevention**: Sanitize all user inputs and file paths
- **Cookie file validation**: Check file format and permissions
- **Path sanitization**: Validate download paths and prevent directory traversal

### Performance Standards
- **Non-blocking startup**: UI interactive immediately, background tasks async
- **Network timeouts**: 5-second maximum for API calls and version checks
- **Offline functionality**: Core features work without internet
- **UI responsiveness**: Progress updates every 500ms maximum
- **Memory efficiency**: Handle large video queues without memory leaks

## Architecture Patterns

### Component Structure
```
App (scripts/app.js)
├── Header Component (branding, window controls)
├── InputSection Component (URL input, configuration)
├── VideoList Component (queue display, status management)
└── ControlPanel Component (bulk actions, download controls)
```

### Required State Management
```javascript
// Mandatory state structure - do not deviate
const appState = {
  videos: [],              // Array of video objects with id, url, title, status
  config: {
    quality: '720p',       // Default quality setting
    format: 'mp4',         // Default output format
    savePath: '',          // User-selected download directory
    cookieFile: null       // Path to cookie file for auth
  },
  ui: {
    isDownloading: false,  // Global download state
    selectedVideos: [],    // Currently selected video IDs
    updateAvailable: false // Binary update status
  }
};
```

### Code Style Enforcement
- **Vanilla JavaScript ONLY**: No React, Vue, or other frameworks
- **Event delegation**: Use `addEventListener` on parent elements
- **Async/await pattern**: For all Promise-based operations
- **Error boundaries**: Try-catch blocks around all async operations
- **Function modularity**: Single responsibility, pure functions when possible
- **ES6+ syntax**: Use modern JavaScript features (const/let, arrow functions, destructuring)

## Binary Execution Standards
```javascript
// REQUIRED pattern for all binary execution
const getBinaryPath = (name) => {
  const ext = process.platform === 'win32' ? '.exe' : '';
  return `./binaries/${name}${ext}`;
};

// Always use this pattern for spawning processes
const { spawn } = require('child_process');
const process = spawn(getBinaryPath('yt-dlp'), args, {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: process.cwd() // Ensure correct working directory
});
```

## URL Processing Rules
- **Supported sources**: YouTube, Vimeo (primary), YouTube playlists
- **URL patterns**: Use regex validation before processing
- **Multi-line parsing**: Extract URLs from pasted text blocks
- **Deduplication**: Remove duplicate URLs automatically
- **Metadata fetching**: Get title, duration, thumbnail via yt-dlp --dump-json

## Quality & Format Standards
- **Default quality**: 720p (best balance of size/quality)
- **Quality options**: 480p, 720p, 1080p, 4K with intelligent fallback
- **Default format**: MP4 (H.264 codec for compatibility)
- **Format options**: MP4, M4A (audio only), MP3 (converted audio)
- **Fallback strategy**: If requested quality unavailable, use best available

## UI/UX Requirements
- **Design system**: Dark theme with exact Figma color variables
- **Responsive layout**: CSS Grid and Flexbox, mobile-first approach
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **Visual feedback**: Loading spinners, progress bars, status badges
- **Error handling**: User-friendly error messages with actionable solutions
- **Drag & drop**: Reorder videos in queue, drop URLs to add

## Performance Benchmarks
- **Startup time**: UI interactive within 2 seconds
- **UI responsiveness**: All interactions respond within 100ms
- **Memory management**: Efficient handling of 100+ video queues
- **Download optimization**: Parallel downloads with configurable concurrency
- **Background tasks**: Version checks and updates run asynchronously