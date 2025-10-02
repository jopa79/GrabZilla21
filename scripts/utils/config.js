// GrabZilla 2.1 - Application Configuration
// Central configuration constants and settings

// Application constants
const APP_CONFIG = {
    DEFAULT_QUALITY: '1080p',
    DEFAULT_FORMAT: 'None',
    DEFAULT_FILENAME_PATTERN: '%(title)s.%(ext)s',
    STATUS_AUTO_CLEAR_DELAY: 5000,
    INPUT_DEBOUNCE_DELAY: 300,
    SUPPORTED_QUALITIES: ['720p', '1080p', '1440p', '4K'],
    SUPPORTED_FORMATS: ['None', 'H264', 'ProRes', 'DNxHR', 'Audio only']
};

// Platform-specific default paths
const DEFAULT_PATHS = {
    darwin: '~/Downloads/GrabZilla_Videos',
    win32: 'C:\\Users\\Admin\\Desktop\\GrabZilla_Videos',
    linux: '~/Downloads/GrabZilla_Videos'
};

// UI constants
const UI_CONFIG = {
    VIDEO_THUMBNAIL_SIZE: { width: 64, height: 48 },
    MAX_CONCURRENT_DOWNLOADS: 3,
    PROGRESS_UPDATE_INTERVAL: 500,
    STATUS_MESSAGE_TIMEOUT: 5000
};

// Validation patterns
const VALIDATION_PATTERNS = {
    YOUTUBE_URL: /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w\-_]{11}(&[\w=]*)?$/i,
    VIMEO_URL: /^(https?:\/\/)?(www\.)?vimeo\.com\/\d+/i,
    GENERIC_VIDEO_URL: /^https?:\/\/.+/i
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        APP_CONFIG,
        DEFAULT_PATHS,
        UI_CONFIG,
        VALIDATION_PATTERNS
    };
} else {
    // Browser environment - attach to window
    window.AppConfig = {
        APP_CONFIG,
        DEFAULT_PATHS,
        UI_CONFIG,
        VALIDATION_PATTERNS
    };
}