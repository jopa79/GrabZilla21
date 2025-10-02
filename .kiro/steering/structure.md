# Project Structure

## Directory Organization

```
/
├── .kiro/                      # Kiro configuration and specs
│   ├── specs/                  # Feature specifications
│   │   └── youtube-downloader-app/
│   │       ├── requirements.md # User stories and acceptance criteria
│   │       ├── design.md      # Architecture and component design
│   │       └── tasks.md       # Implementation tasks breakdown
│   └── steering/              # AI assistant guidance documents
├── src/                       # Electron main process files
│   ├── main.js               # Electron main process
│   └── preload.js            # Preload script for secure IPC
├── binaries/                  # Local executable binaries
│   ├── yt-dlp                # YouTube downloader binary (macOS/Linux)
│   ├── yt-dlp.exe            # YouTube downloader binary (Windows)
│   ├── ffmpeg                # Video conversion binary (macOS/Linux)
│   ├── ffmpeg.exe            # Video conversion binary (Windows)
│   └── README.md             # Binary installation instructions
├── index.html                # Main application entry point
├── styles/                   # CSS and styling files
│   └── main.css             # Custom styles and Tailwind overrides
├── scripts/                  # JavaScript application logic
│   └── app.js               # Main application JavaScript (renderer process)
├── assets/                   # Static assets
│   └── icons/               # SVG icons and images
├── tests/                    # Test files
├── package.json              # Node.js dependencies and scripts
└── vitest.config.js          # Test configuration
```

## Component Architecture

### Main Application Components

1. **Header Component**
   - App branding and title
   - Window control buttons (minimize, maximize, close)
   - Dark header styling with blue accent

2. **InputSection Component**
   - URL textarea for YouTube/Vimeo links
   - Action buttons (Add Video, Import URLs)
   - Configuration controls (save path, quality, format)
   - Filename pattern input

3. **VideoList Component**
   - Grid-based table layout
   - Video items with thumbnails, titles, duration
   - Interactive dropdowns for quality/format selection
   - Status badges and progress indicators
   - Drag-and-drop reordering

4. **ControlPanel Component**
   - Bulk action buttons (Clear List, Cancel Downloads)
   - Primary download action button
   - Status message area

## File Naming Conventions

- **HTML**: Use semantic, descriptive names (index.html)
- **CSS**: Kebab-case for files (main.css, components.css)
- **JavaScript**: Camel-case for files (app.js, videoManager.js)
- **Assets**: Descriptive names with format (logo.svg, download-icon.svg)

## Code Organization Patterns

### HTML Structure
- Semantic HTML5 elements (header, main, section, article)
- BEM-style class naming for custom components
- Tailwind utility classes for styling
- Proper ARIA labels for accessibility

### CSS Organization
- Custom CSS variables for Figma design tokens
- Component-specific styles grouped together
- Responsive design with mobile-first approach
- Tailwind utility classes preferred over custom CSS

### JavaScript Structure
- Modular functions for different features
- State management with plain JavaScript objects
- Event-driven architecture with proper event delegation
- Clear separation of concerns (data, UI, business logic)

## Development Workflow

1. **Specs First**: All features defined in `.kiro/specs/` before implementation
2. **Component-Based**: Build individual components before integration
3. **Design System**: Use exact Figma variables and measurements
4. **Progressive Enhancement**: Core functionality works without JavaScript
5. **Testing**: Manual testing in multiple browsers and screen sizes

## Configuration Files

- **`.vscode/settings.json`**: VSCode workspace configuration
- **`.kiro/specs/`**: Feature specifications and requirements
- **`.kiro/steering/`**: AI assistant guidance documents