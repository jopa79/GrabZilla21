---
inclusion: always
---

# Code Organization and Documentation Standards

## File Size and Modularity Rules

### Maximum File Length
- **Hard limit**: 300 lines of code per file (excluding comments and whitespace)
- **Recommended**: 200 lines or fewer for optimal maintainability
- **Exception**: Configuration files and data structures may exceed this limit

### File Splitting Strategy
When a file exceeds 300 lines, split using these patterns:

#### JavaScript Files
```javascript
// Original: scripts/app.js (400+ lines)
// Split into:
scripts/
├── app.js              // Main application entry (< 100 lines)
├── components/
│   ├── header.js       // Header component logic
│   ├── inputSection.js // URL input and configuration
│   ├── videoList.js    // Video queue management
│   └── controlPanel.js // Download controls
├── utils/
│   ├── urlParser.js    // URL validation and extraction
│   ├── binaryManager.js // yt-dlp/ffmpeg execution
│   └── stateManager.js // Application state management
└── constants/
    └── config.js       // Application constants
```

#### CSS Files
```css
/* Original: styles/main.css (500+ lines) */
/* Split into: */
styles/
├── main.css           // Import all other files
├── variables.css      // CSS custom properties
├── components/
│   ├── header.css     // Header component styles
│   ├── input.css      // Input section styles
│   └── video-list.css // Video list styles
└── utilities/
    └── helpers.css    // Utility classes
```

### Module Export Patterns
```javascript
// Use consistent export patterns for split modules
// utils/urlParser.js
export const validateYouTubeUrl = (url) => { /* ... */ };
export const extractVideoId = (url) => { /* ... */ };
export default { validateYouTubeUrl, extractVideoId };

// Import in main file
import urlParser, { validateYouTubeUrl } from './utils/urlParser.js';
```

## Documentation Requirements

### Function Documentation
Every function MUST include JSDoc comments:

```javascript
/**
 * Downloads a video using yt-dlp binary with specified quality and format
 * @param {Object} video - Video object containing url, quality, format
 * @param {string} video.url - YouTube/Vimeo URL to download
 * @param {string} video.quality - Video quality (480p, 720p, 1080p, 4K)
 * @param {string} video.format - Output format (mp4, m4a, mp3)
 * @param {string} savePath - Directory path for downloaded file
 * @param {Function} progressCallback - Called with download progress (0-100)
 * @returns {Promise<Object>} Download result with success status and file path
 * @throws {Error} When binary not found or download fails
 */
async function downloadVideo(video, savePath, progressCallback) {
  // Implementation...
}
```

### Class Documentation
```javascript
/**
 * Manages video download queue and state
 * Handles adding, removing, and processing video downloads
 */
class VideoManager {
  /**
   * Creates new VideoManager instance
   * @param {Object} config - Configuration object
   * @param {string} config.defaultQuality - Default video quality
   * @param {string} config.defaultFormat - Default output format
   */
  constructor(config) {
    // Implementation...
  }
}
```

### Component Documentation
Each UI component must have header documentation:

```javascript
/**
 * INPUT SECTION COMPONENT
 * 
 * Handles URL input, configuration settings, and file selection
 * 
 * Features:
 * - Multi-line URL textarea with validation
 * - Quality/format dropdown selectors
 * - Save path selection with file browser
 * - Cookie file selection for authentication
 * 
 * Dependencies:
 * - urlParser.js for URL validation
 * - binaryManager.js for yt-dlp integration
 * 
 * State Management:
 * - Updates appState.config on setting changes
 * - Validates URLs before adding to queue
 */
```

### File Header Documentation
Every JavaScript file must start with:

```javascript
/**
 * @fileoverview Brief description of file purpose
 * @author GrabZilla Development Team
 * @version 2.1.0
 * @since 2024-01-01
 */
```

## Code Quality Standards

### Naming Conventions
- **Functions**: camelCase with descriptive verbs (`downloadVideo`, `validateUrl`)
- **Variables**: camelCase with descriptive nouns (`videoQueue`, `downloadProgress`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_CONCURRENT_DOWNLOADS`, `DEFAULT_QUALITY`)
- **Classes**: PascalCase (`VideoManager`, `DownloadQueue`)
- **Files**: kebab-case (`video-manager.js`, `url-parser.js`)

### Error Handling Documentation
```javascript
/**
 * Error handling strategy for binary execution
 * 
 * @throws {BinaryNotFoundError} When yt-dlp/ffmpeg binary missing
 * @throws {InvalidUrlError} When URL format is invalid
 * @throws {NetworkError} When download fails due to network issues
 * @throws {PermissionError} When insufficient file system permissions
 */
```

### Performance Documentation
Include performance considerations:

```javascript
/**
 * Processes video queue with configurable concurrency
 * 
 * Performance Notes:
 * - Maximum 3 concurrent downloads to prevent system overload
 * - Uses streaming for large file downloads
 * - Implements exponential backoff for failed downloads
 * - Memory usage scales linearly with queue size
 */
```

## Architecture Documentation

### State Management Documentation
```javascript
/**
 * APPLICATION STATE STRUCTURE
 * 
 * Central state object managing all application data
 * 
 * Structure:
 * - videos: Array of video objects in download queue
 * - config: User preferences and settings
 * - ui: Interface state and user interactions
 * 
 * Mutation Rules:
 * - Only modify state through designated functions
 * - Emit events on state changes for UI updates
 * - Validate all state changes before applying
 */
```

### Component Interaction Documentation
```javascript
/**
 * COMPONENT COMMUNICATION PATTERN
 * 
 * Event-driven architecture using custom events:
 * 
 * Events Emitted:
 * - 'video-added': When new video added to queue
 * - 'download-progress': Progress updates during download
 * - 'download-complete': When video download finishes
 * 
 * Events Listened:
 * - 'config-changed': Update component when settings change
 * - 'queue-updated': Refresh display when queue modified
 */
```

## Implementation Checklist

When adding new code, ensure:

- [ ] Function has complete JSDoc documentation
- [ ] File size remains under 300 lines
- [ ] Error handling is documented and implemented
- [ ] Performance implications are considered
- [ ] Component interactions are documented
- [ ] Naming conventions are followed
- [ ] Code is split into logical modules
- [ ] Dependencies are clearly documented