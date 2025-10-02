# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GrabZilla 2.1 is an Electron-based desktop application for downloading YouTube and Vimeo videos with professional video management. It features smart URL parsing, cookie file support for age-restricted content, and local binary management (yt-dlp and ffmpeg) for reliable video downloading and conversion.

## CRITICAL RULES (Must Follow)

### Binary Management (MANDATORY)
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

## Available MCP Servers

This project has several MCP (Model Context Protocol) servers configured to enhance development capabilities:

### 1. **Context7 MCP** (Auto-approved)
**Purpose:** Documentation lookup for libraries and APIs

**Available Tools:**
- `resolve-library-id` - Find library IDs for documentation
- `get-library-docs` - Get comprehensive documentation for libraries

**When to use:**
- Before implementing binary execution patterns (`child_process.spawn`, `execFile`)
- Looking up Electron IPC security patterns
- Understanding yt-dlp/ffmpeg command options
- Researching Node.js core module APIs (fs, path, url, stream)

**Example queries:**
- "electron contextIsolation preload security"
- "child_process spawn stdio error handling node"
- "yt-dlp format selection quality options"
- "ffmpeg mp4 conversion parameters"

### 2. **Sequential Thinking MCP** (Auto-approved)
**Purpose:** Structured reasoning for complex technical decisions

**Available Tools:**
- `sequentialthinking` - Multi-step reasoning with explicit thought process

**Mandatory use for:**
- Binary management decisions (local vs system, cross-platform paths)
- Electron security architecture design
- Video processing workflow design
- Code organization decisions (file splitting at 300-line limit)
- Performance optimization strategies
- State management architecture

**Decision frameworks:**
- Binary execution security (5-thought pattern)
- File organization analysis
- Error handling strategy design

### 3. **Memory MCP** (Auto-approved)
**Purpose:** Persistent context and learning across sessions

**Available Tools:**
- `search_nodes` - Search stored context and relationships
- `create_entities` - Store important project information
- `add_observations` - Record decisions and patterns

**Use for:**
- Tracking architecture decisions and rationale
- Recording code patterns and preferences
- Storing bug solutions and lessons learned
- Maintaining project-specific conventions

### 4. **Figma MCP** (Auto-approved: get_metadata)
**Purpose:** Extract design specifications and generate implementation code

**Available Tools:**
- `get_metadata` - Get design structure and node IDs (auto-approved)
- `get_code` - Generate implementation code from designs
- `get_variable_defs` - Extract design tokens (colors, spacing, typography)
- `get_screenshot` - Visual reference for validation

**Project Figma Reference:**
- Main Frame: Node ID `5:461` (GrabZilla2.0_UI)
- Header: `5:463`
- Input Section: `5:483`
- Video List: `5:537`
- Control Panel: `5:825`

**When to use:**
- Implementing new UI components
- Extracting exact color values and spacing
- Validating implementation against design
- Ensuring design-code consistency

### 5. **Browser MCP**
**Purpose:** Automated browser testing and validation

**Available Tools:**
- `navigate` - Open URLs in automated browser
- `screenshot` - Capture visual states
- `click` - Simulate user interactions
- `get_clickable_elements` - Identify interactive elements
- `get_markdown` / `get_text` - Extract content

**Use for:**
- Testing local development server (http://localhost:8000)
- Validating responsive design behavior
- Debugging UI issues in browser environment
- Testing drag-and-drop functionality
- Accessibility validation

## Common Development Commands

```bash
# Setup and dependencies
npm install                  # Install dependencies
npm run setup               # Download required binaries (yt-dlp and ffmpeg)

# Development
npm run dev                 # Run in development mode (with DevTools)
npm start                   # Run in production mode

# Testing
npm test                    # Run all tests sequentially
npm run test:ui             # Run tests with Vitest UI
npm run test:unit           # Run unit tests only
npm run test:validation     # Run URL validation tests
npm run test:components     # Run component tests

# Building
npm run build               # Build for current platform
npm run build:mac           # Build macOS DMG
npm run build:win           # Build Windows NSIS installer
npm run build:linux         # Build Linux AppImage
```

## Architecture Overview

### Multi-Process Architecture

GrabZilla follows Electron's standard multi-process architecture:

- **Main Process** (`src/main.js`): System integration, IPC handlers, binary execution, file system operations
- **Preload Script** (`src/preload.js`): Secure bridge using `contextBridge` to expose limited APIs to renderer
- **Renderer Process** (`scripts/app.js`): UI logic, state management, user interactions

### Critical Binary Management Pattern

**ALWAYS use local binaries** - never rely on system PATH binaries:

```javascript
// ✅ CORRECT: Use local binaries with platform detection
const getBinaryPath = (name) => {
  const ext = process.platform === 'win32' ? '.exe' : '';
  return `./binaries/${name}${ext}`;
};

const ytdlp = spawn(getBinaryPath('yt-dlp'), args);

// ❌ WRONG: Never use system PATH binaries
const ytdlp = spawn('yt-dlp', args);
```

All binary execution must:
1. Use `getBinaryPath()` helper for platform-specific paths
2. Check binary existence before execution
3. Handle errors gracefully with user-friendly messages

### State Management

The application uses a centralized state management pattern in `scripts/utils/state-manager.js`:

```javascript
const app = {
  videos: [],              // Array of video objects
  config: {                // User preferences
    quality: '720p',
    format: 'mp4',
    savePath: '',
    cookieFile: null
  },
  ui: {                    // UI state
    isDownloading: false,
    selectedVideos: []
  }
};
```

Video objects follow a specific model structure defined in `scripts/models/Video.js` with status states: `ready`, `downloading`, `converting`, `completed`, `error`.

### IPC Communication Flow

The main process handles all system operations via IPC channels defined in `src/preload.js`:

- **File Operations**: `select-save-directory`, `select-cookie-file`
- **Binary Management**: `check-binary-dependencies`, `check-binary-versions`
- **Video Operations**: `download-video`, `get-video-metadata`
- **Format Conversion**: `cancel-conversion`, `cancel-all-conversions`, `get-active-conversions`
- **Notifications**: `show-notification`, `show-error-dialog`, `show-info-dialog`
- **Progress Events**: `download-progress` (via `ipcRenderer.on`)

### Download and Conversion Pipeline

Video downloads follow a two-stage pipeline when format conversion is required:

1. **Download Stage (0-70% progress)**: yt-dlp downloads video to temporary location
2. **Conversion Stage (70-100% progress)**: ffmpeg converts to target format

The conversion logic is in `scripts/utils/ffmpeg-converter.js` and integrates with the download handler in `src/main.js:downloadWithYtDlp()` and `convertVideoFormat()`.

## Security Requirements

### Input Validation

All user inputs must be validated before passing to binaries to prevent command injection:

- **URL Validation**: Use regex patterns in `scripts/utils/url-validator.js` before passing to yt-dlp
- **Path Sanitization**: Validate all file paths for downloads and cookie files
- **Cookie File Validation**: Verify file exists, is readable, and not empty

### Context Isolation

The app uses Electron security best practices:
- `nodeIntegration: false`
- `contextIsolation: true`
- `enableRemoteModule: false`
- Secure IPC communication via `contextBridge`

## Performance Requirements

### Non-Blocking Startup

- App UI must load immediately (< 2 seconds to interactive)
- Background tasks (binary version checks) run async with 5-second timeout
- App must function fully offline or when network/updates fail

### Progress Updates

- Update UI every 500ms maximum during operations
- Download progress events sent via `download-progress` IPC channel
- Progress data structure: `{ url, progress, status, stage, message }`

## Design System

The app follows Apple's Human Interface Guidelines with a dark theme. All styling uses CSS custom properties defined in `styles/main.css`:

### Key Color Variables
```css
/* Primary Colors */
--primary-blue: #155dfc;
--success-green: #00a63e;
--error-red: #e7000b;

/* Backgrounds */
--bg-dark: #1d293d;
--header-dark: #0f172b;
--card-bg: #314158;
--border-color: #45556c;

/* Text */
--text-primary: #ffffff;
--text-secondary: #cad5e2;
--text-muted: #90a1b9;
--text-disabled: #62748e;
```

### Layout Standards
- **Header**: 41px height (exact Figma spec), dark background (#0f172b)
- **Input Section**: 161px height with 4px gap between elements
- **Control Panel**: 93px height with proper button arrangement
- **Spacing**: 16px base unit, 8px tight, 4px component gaps
- **Grid**: CSS Grid for layout, Flexbox for alignment
- **Minimum width**: 800px with responsive breakpoints
- **Border radius**: 8px buttons, 6px inputs

### Component Specifications
- **Buttons**: 36px height, proper padding, rounded corners
- **Form Elements**: Card background (#314158), border (#45556c), 6px radius
- **Status Indicators**: Color-coded badges with proper contrast ratios
- **Progress Bars**: Animated with percentage display and proper ARIA attributes
- **Typography**: 14px base, Inter font family, proper weight hierarchy (400/500/600)
- **Video Items**: 64px height with 16x12 thumbnails and proper spacing

### CSS Code Style
- Use custom properties for all colors and spacing - never hardcode
- Mobile-first responsive design
- BEM naming for custom components
- Tailwind utilities preferred over custom CSS
- Exact Figma measurements for all components

### Accessibility
- 4.5:1 color contrast minimum
- Visible focus indicators
- Logical tab order
- ARIA labels for complex elements
- Keyboard navigation support (Enter, Space, Escape, Arrows)

### Animation Standards
- **Micro-interactions**: 100-150ms (hover, focus)
- **Transitions**: 200-300ms (modals, dropdowns)
- **Ease-out**: For entrances and hovers
- **Ease-in**: For exits and dismissals

## Testing Strategy

Tests are organized into suites run sequentially to avoid memory issues:

- **Unit Tests**: Video model, state management, IPC integration
- **Component Tests**: Status components, FFmpeg conversion
- **Validation Tests**: URL validation for YouTube/Vimeo
- **System Tests**: Cross-platform compatibility, error handling
- **Accessibility Tests**: WCAG 2.1 AA compliance

The custom test runner (`run-tests.js`) runs test suites sequentially with memory cleanup between runs.

## URL Processing

Supported video sources:
- **YouTube**: `youtube.com/watch?v=*`, `youtu.be/*`, `youtube.com/playlist?list=*`
- **Vimeo**: `vimeo.com/[id]`, `player.vimeo.com/video/[id]`

### URL Parsing Strategy
1. **Split by lines**: Process pasted content line by line
2. **Extract URLs**: Use regex to find all video URLs in each line
3. **Validate URLs**: Ensure extracted URLs are accessible via yt-dlp
4. **Deduplicate**: Remove duplicate URLs from the list
5. **Metadata Fetch**: Use yt-dlp to get video title, duration, thumbnail

URL validation regex patterns are in `scripts/utils/url-validator.js`. The app extracts URLs from multi-line pasted text with deduplication.

### Regex Patterns
```javascript
// YouTube URL patterns
const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;

// Vimeo URL patterns
const vimeoRegex = /(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/g;

// Playlist patterns
const playlistRegex = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/g;
```

## Error Handling

Error handling is centralized in `scripts/utils/error-handler.js` and provides user-friendly messages:

- Network errors → "Network connection error - check your internet connection"
- Video unavailable → "Video is unavailable, private, or has been removed"
- Age-restricted → "Age-restricted video - authentication required"
- Format errors → "Requested video quality/format not available"
- Permission errors → "Permission denied - cannot write to download directory"

The main process function `parseDownloadError()` in `src/main.js` maps yt-dlp error output to specific error types with actionable suggestions.

## Cross-Platform Considerations

The app supports macOS, Windows, and Linux:

- Binary paths use platform detection (`.exe` on Windows)
- Window controls adapt to platform (macOS uses `titleBarStyle: 'hiddenInset'`)
- File dialogs use native system dialogs via Electron's `dialog` module
- Notifications use native Electron `Notification` API with fallback to `node-notifier`

## Build Configuration

The electron-builder configuration in `package.json` includes:
- Output directory: `dist/`
- Bundled files: `src/`, `assets/`, `binaries/`, `styles/`, `scripts/`, `index.html`
- Platform-specific builds with appropriate installers (DMG, NSIS, AppImage)

## Code Style

- **Vanilla JavaScript only** - no external frameworks
- **Event delegation** for DOM event handling
- **Async/await** for all asynchronous operations
- **Error boundaries** throughout
- **Single responsibility** functions
- **ES6+ syntax**: Use modern JavaScript features (const/let, arrow functions, destructuring)

## Code Organization Standards

### File Size Limits
- **Hard limit**: 300 lines of code per file (excluding comments and whitespace)
- **Recommended**: 200 lines or fewer for optimal maintainability
- **Exception**: Configuration files and data structures may exceed this limit

### Module Structure
When a file exceeds 300 lines, split into logical modules:
```javascript
scripts/
├── app.js              // Main application entry (< 100 lines)
├── components/         // UI component logic
├── utils/              // Utility functions
├── models/             // Data models
└── constants/          // Configuration constants
```

### Documentation Requirements
Every function MUST include JSDoc comments:
```javascript
/**
 * Downloads a video using yt-dlp binary with specified quality and format
 * @param {Object} video - Video object containing url, quality, format
 * @param {string} savePath - Directory path for downloaded file
 * @param {Function} progressCallback - Called with download progress (0-100)
 * @returns {Promise<Object>} Download result with success status and file path
 * @throws {Error} When binary not found or download fails
 */
```

### Naming Conventions
- **Functions**: camelCase with descriptive verbs (`downloadVideo`, `validateUrl`)
- **Variables**: camelCase with descriptive nouns (`videoQueue`, `downloadProgress`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_CONCURRENT_DOWNLOADS`, `DEFAULT_QUALITY`)
- **Classes**: PascalCase (`VideoManager`, `DownloadQueue`)
- **Files**: kebab-case (`video-manager.js`, `url-parser.js`)

## Required State Structure

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