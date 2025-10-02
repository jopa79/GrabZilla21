# Design Document

## Overview

The YouTube Downloader App is a standalone desktop application built with Electron that allows users to download YouTube videos with a comprehensive interface for managing multiple downloads. The application provides native system integration for file management, binary execution (yt-dlp/ffmpeg), and desktop-native user experience. The design follows a dark theme with a professional video management interface similar to GrabZilla, featuring a header, input section, video list, and control panel.

## Architecture

### Component Structure
```
VideoDownloader (Main Container)
├── Header (App branding and window controls)
├── InputSection (URL input and configuration)
├── VideoList (Table-style list of videos)
└── ControlPanel (Action buttons and status)
```

### Technology Stack
- **Desktop Framework**: Electron (main process + renderer process)
- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript
- **System Integration**: Node.js APIs for file system, process management
- **Binary Integration**: yt-dlp and ffmpeg local binaries
- **IPC**: Secure Inter-Process Communication between main and renderer
- **Styling**: Tailwind CSS with custom color variables from Figma
- **Layout**: CSS Grid and Flexbox for responsive design
- **Icons**: SVG icons as provided in Figma design

## Components and Interfaces

### 1. Header Component
- **Purpose**: App branding and window controls
- **Elements**:
  - App logo with blue background (`#155dfc`)
  - App title "GrabZilla 2.0.0" (customizable for YouTube Downloader)
  - Window control buttons (minimize, maximize, close)
- **Styling**: Dark header (`#0f172b`) with bottom border

### 2. Input Section Component
- **Purpose**: URL input and download configuration
- **Elements**:
  - Large textarea for YouTube URLs (placeholder: "Paste YouTube/Vimeo URLs here (one per line)...")
  - "Add Video" button (primary blue `#155dfc`)
  - "Import URLs" button (secondary with border)
  - Save path selector
  - Default quality dropdown (1080p, 720p, 4K options)
  - Conversion format dropdown (None, H264, ProRes, DNxHR, Audio only)
  - Filename pattern input
- **Styling**: Dark background (`#314158`) with rounded corners

### 3. Video List Component
- **Purpose**: Display and manage video queue
- **Structure**: Grid-based table layout with columns:
  - Checkbox for selection
  - Drag handle icon
  - Video thumbnail (64x48px, rounded corners)
  - Video title (truncated with ellipsis)
  - Duration
  - Quality selector dropdown
  - Conversion format dropdown
  - Status badge (Ready, Downloading, Converting, Completed, Error)
- **Interactive Elements**:
  - Dropdown menus for quality and format selection
  - Status badges with integrated progress display:
    - Ready: Green badge (`#00a63e`)
    - Downloading: Green badge with progress percentage (e.g., "Downloading 65%")
    - Converting: Blue badge (`#155dfc`) with progress percentage (e.g., "Converting 42%")
    - Completed: Gray badge (`#4a5565`)
    - Error: Red badge (`#e7000b`)

### 4. Control Panel Component
- **Purpose**: Bulk actions and download management
- **Elements**:
  - "Clear List" button (secondary)
  - "Update Dependencies" button (secondary)
  - "Cancel Downloads" button (red `#e7000b`)
  - "Download Videos" button (primary green `#00a63e`)
  - Status message area

## Data Models

### Video Object
```javascript
{
  id: string,
  url: string,
  title: string,
  thumbnail: string,
  duration: string,
  quality: string, // "720p", "1080p", "4K", etc.
  format: string, // "None", "H264", "ProRes", "DNxHR", "Audio only"
  status: string, // "ready", "downloading", "converting", "completed", "error"
  progress: number, // 0-100 for downloading/converting
  filename: string
}
```

### App State
```javascript
{
  videos: Video[],
  savePath: string,
  defaultQuality: string,
  defaultFormat: string,
  filenamePattern: string,
  isDownloading: boolean
}
```

## Design System Variables

### Colors (Exact Figma Values)
- **Primary Blue**: `#155dfc`
- **Success Green**: `#00a63e`
- **Error Red**: `#e7000b`
- **Background Dark**: `#1d293d`
- **Header Dark**: `#0f172b`
- **Card Background**: `#314158`
- **Border Color**: `#45556c`
- **Text Primary**: `#ffffff`
- **Text Secondary**: `#cad5e2`
- **Text Muted**: `#90a1b9`
- **Text Disabled**: `#62748e`

### Typography
- **Font Family**: Inter (Regular, Medium)
- **Sizes**: 
  - Headers: 16px (Medium)
  - Body: 14px (Regular)
  - Small: 12px (Regular/Medium)
- **Line Heights**: 16px, 20px, 24px
- **Letter Spacing**: -0.1504px, -0.3125px

### Spacing & Layout
- **Container Padding**: 16px
- **Component Gaps**: 8px, 12px, 16px
- **Border Radius**: 4px (small), 6px (medium), 8px (large)
- **Grid Columns**: Auto-fit layout for video list
- **Video Item Height**: 64px

## Error Handling

### URL Validation
- Validate YouTube/Vimeo URL format
- Display inline error messages for invalid URLs
- Prevent duplicate URLs in the list

### Download Errors
- Network connectivity issues
- Video unavailable/private
- Format not supported
- Insufficient storage space
- Display error badges and detailed error messages

### User Feedback
- Loading states for all async operations
- Progress indicators for downloads
- Success/error notifications
- Status messages in the bottom panel

## Testing Strategy

### Unit Tests
- URL validation functions
- Video object manipulation
- State management functions
- Format conversion utilities

### Integration Tests
- Complete download workflow
- UI component interactions
- Error handling scenarios
- Progress tracking accuracy

### User Interface Tests
- Responsive design across screen sizes
- Keyboard navigation
- Accessibility compliance (ARIA labels, focus management)
- Visual regression testing against Figma design

### Performance Tests
- Multiple simultaneous downloads
- Large video file handling
- Memory usage optimization
- UI responsiveness during operations

## Accessibility Considerations

- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Screen Readers**: Proper ARIA labels and descriptions
- **Color Contrast**: Ensure sufficient contrast ratios for all text
- **Focus Management**: Clear focus indicators and logical tab order
- **Status Announcements**: Live regions for download progress updates