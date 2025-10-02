# Technology Stack

## Frontend Technologies

- **HTML5**: Semantic structure with modern web standards
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Vanilla JavaScript**: Pure JavaScript for application logic and DOM manipulation
- **CSS Grid & Flexbox**: Layout systems for responsive design
- **SVG Icons**: Vector graphics for UI elements

## Backend/System Dependencies

- **yt-dlp**: Primary tool for downloading YouTube/Vimeo videos (local binary)
- **ffmpeg**: Video conversion and processing engine (local binary)
- **Node.js/Electron**: For system integration and subprocess management
- **Local Binary Management**: Both yt-dlp and ffmpeg must be bundled with the app, not system-wide

## Styling & Design System

- **Tailwind CSS**: Primary styling framework
- **Custom CSS Variables**: Exact color values from Figma design system
- **Dark Theme**: Professional dark UI with specific color palette
- **Responsive Design**: Mobile-first approach with breakpoints

## Key Design Variables

```css
/* Primary Colors */
--primary-blue: #155dfc
--success-green: #00a63e
--error-red: #e7000b

/* Background Colors */
--bg-dark: #1d293d
--header-dark: #0f172b
--card-bg: #314158
--border-color: #45556c

/* Text Colors */
--text-primary: #ffffff
--text-secondary: #cad5e2
--text-muted: #90a1b9
--text-disabled: #62748e
```

## Architecture Patterns

- **Component-Based Structure**: Modular components (Header, InputSection, VideoList, ControlPanel)
- **State Management**: Centralized application state with JavaScript objects
- **Event-Driven**: DOM event handling for user interactions
- **Progressive Enhancement**: Core functionality works without JavaScript

## Data Models

- **Video Object**: Structured data for video items with properties like id, url, title, status, progress
- **App State**: Global application state management for videos array and configuration

## URL Parsing Requirements

- **Multi-line Text Processing**: Parse pasted text containing multiple URLs mixed with other content
- **URL Extraction**: Regex patterns to identify YouTube and Vimeo URLs from text blocks
- **Supported URL Formats**:
  - YouTube: `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/playlist?list=`
  - Vimeo: `vimeo.com/[video-id]`, `player.vimeo.com/video/[video-id]`
- **Text Cleaning**: Remove non-URL content and extract only valid video links

## Cookie File Integration

- **Age-Restricted Content**: Cookie files enable downloading of age-restricted YouTube videos
- **Authentication**: Use browser cookies to authenticate with YouTube/Vimeo accounts
- **File Selection**: "Select File" button allows users to choose cookie files (.txt format)
- **Cookie Formats**: Support Netscape cookie format (exported from browsers)
- **Security**: Store cookie file path securely, validate file format before use

## Local Binary Management

### Binary Distribution Strategy
- **Portable Binaries**: Include yt-dlp and ffmpeg executables in app directory
- **Platform-Specific**: Bundle appropriate binaries for Windows, macOS, Linux
- **Version Management**: Track current versions and check for updates
- **Auto-Update**: "Update Dependencies" button downloads latest versions

### Directory Structure for Binaries
```
/
├── binaries/
│   ├── yt-dlp          # or yt-dlp.exe on Windows
│   ├── ffmpeg          # or ffmpeg.exe on Windows
│   └── versions.json   # Track current binary versions
```

### Version Checking
```bash
# Check yt-dlp version (local binary)
./binaries/yt-dlp --version

# Check ffmpeg version (local binary)  
./binaries/ffmpeg -version

# Compare with latest releases via GitHub API
# yt-dlp: https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest
# ffmpeg: https://api.github.com/repos/FFmpeg/FFmpeg/releases/latest
```

## Development Commands

```bash
# Serve locally (using Python's built-in server)
python3 -m http.server 8000

# Or using Node.js http-server (if installed)
npx http-server

# Open in browser
open http://localhost:8000

# Test yt-dlp installation
yt-dlp --version

# Test ffmpeg installation
ffmpeg -version
```

## Key Integration Commands (Local Binaries)

```bash
# yt-dlp: Download video with specific quality (using local binary)
./binaries/yt-dlp -f "best[height<=720]" [URL]

# yt-dlp: Download with cookie file for age-restricted content
./binaries/yt-dlp --cookies [COOKIE_FILE_PATH] -f "best[height<=720]" [URL]

# yt-dlp: Get video info without downloading
./binaries/yt-dlp --dump-json [URL]

# yt-dlp: Get video info with cookies
./binaries/yt-dlp --cookies [COOKIE_FILE_PATH] --dump-json [URL]

# ffmpeg: Convert video format (using local binary)
./binaries/ffmpeg -i input.mp4 -c:v libx264 output.mp4

# ffmpeg: Extract audio only
./binaries/ffmpeg -i input.mp4 -vn -acodec copy output.m4a
```

## Dependency Update System

### Startup Version Check (Non-Blocking)
- **Background Check**: Automatically check for updates on app startup
- **Async Operation**: Version checking runs in background without blocking UI
- **Graceful Fallback**: App remains fully functional even if version check fails
- **Cache Strategy**: Use cached version info if network is unavailable
- **Timeout Handling**: 5-second timeout for version check requests

### Update Dependencies Button Behavior
- **Visual Indicator**: Highlight button when updates are available
- **Manual Updates**: User-initiated download and replacement of binaries
- **Update Process**: Download and replace binaries when user clicks update
- **Progress Feedback**: Show download progress for binary updates

### Version Tracking
```json
// versions.json example
{
  "yt-dlp": {
    "current": "2023.12.30",
    "latest": "2024.01.15",
    "updateAvailable": true,
    "lastChecked": "2024-01-16T10:30:00Z"
  },
  "ffmpeg": {
    "current": "6.0",
    "latest": "6.1", 
    "updateAvailable": true,
    "lastChecked": "2024-01-16T10:30:00Z"
  },
  "checkFrequency": "daily"
}
```

### Implementation Strategy
```javascript
// Non-blocking startup check
async function checkVersionsOnStartup() {
  try {
    // Don't await - let it run in background
    checkForUpdates().then(updateUI).catch(handleError);
    
    // App continues loading immediately
    initializeApp();
  } catch (error) {
    // App works normally even if version check fails
    console.warn('Version check failed:', error);
    initializeApp();
  }
}
```

## File Structure

```
/
├── index.html          # Main application file
├── styles/
│   └── main.css       # Custom CSS and Tailwind overrides
├── scripts/
│   └── app.js         # Main application JavaScript
├── assets/
│   └── icons/         # SVG icons and images
├── binaries/          # Local executable binaries
│   ├── yt-dlp         # YouTube downloader binary
│   ├── ffmpeg         # Video conversion binary
│   └── versions.json  # Version tracking file
└── downloads/         # Default download directory
```

## URL Parsing Implementation

### Regex Patterns for URL Extraction

```javascript
// YouTube URL patterns
const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;

// Vimeo URL patterns  
const vimeoRegex = /(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/g;

// Playlist patterns
const playlistRegex = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/g;
```

### Text Processing Strategy

1. **Split by lines**: Process pasted content line by line
2. **Extract URLs**: Use regex to find all video URLs in each line
3. **Validate URLs**: Ensure extracted URLs are accessible via yt-dlp
4. **Deduplicate**: Remove duplicate URLs from the list
5. **Metadata Fetch**: Use yt-dlp to get video title, duration, thumbnail

## Browser Support

- Modern browsers with ES6+ support
- Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Application Startup Behavior

### Non-Blocking Initialization
1. **Immediate UI Load**: App interface loads and becomes interactive immediately
2. **Background Tasks**: Version checking runs asynchronously in background
3. **Progressive Enhancement**: Update notifications appear when background check completes
4. **Offline Resilience**: App works fully even without internet connection
5. **Error Tolerance**: Network failures don't prevent app from starting

### Startup Sequence
```javascript
// App startup flow
1. Load UI components → User can interact immediately
2. Initialize local binaries → Check if yt-dlp/ffmpeg exist
3. Background version check → Async API calls (with timeout)
4. Update UI indicators → Show update button if needed
5. Cache results → Store version info for next startup
```

## System Integration Notes

- **Desktop App**: Consider Electron wrapper for better system integration
- **Web App**: Use backend API to interface with yt-dlp and ffmpeg
- **Security**: Validate all URLs before processing to prevent command injection
- **Performance**: Prioritize UI responsiveness over background operations