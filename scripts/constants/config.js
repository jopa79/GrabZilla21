/**
 * @fileoverview Application configuration constants
 * @author GrabZilla Development Team
 * @version 2.1.0
 * @since 2024-01-01
 */

/**
 * Application Configuration Constants
 * 
 * Centralized configuration values for the GrabZilla application
 * All magic numbers and default values should be defined here
 */

// Application defaults
export const APP_CONFIG = {
    DEFAULT_QUALITY: '1080p',
    DEFAULT_FORMAT: 'None',
    DEFAULT_FILENAME_PATTERN: '%(title)s.%(ext)s',
    STATUS_AUTO_CLEAR_DELAY: 5000,
    INPUT_DEBOUNCE_DELAY: 300,
    SUPPORTED_QUALITIES: ['720p', '1080p', '1440p', '4K'],
    SUPPORTED_FORMATS: ['None', 'H264', 'ProRes', 'DNxHR', 'Audio only']
};

// Network and performance constants
export const NETWORK_CONFIG = {
    METADATA_FETCH_TIMEOUT: 10000,
    THUMBNAIL_FETCH_TIMEOUT: 5000,
    VERSION_CHECK_TIMEOUT: 5000,
    MAX_CONCURRENT_DOWNLOADS: 3,
    PROGRESS_UPDATE_INTERVAL: 500
};

// UI timing constants
export const UI_CONFIG = {
    ANIMATION_DURATION_FAST: 150,
    ANIMATION_DURATION_NORMAL: 300,
    DEBOUNCE_DELAY: 300,
    TOAST_DISPLAY_DURATION: 5000,
    LOADING_SPINNER_DELAY: 200
};

// File system constants
export const FILE_CONFIG = {
    MAX_FILENAME_LENGTH: 255,
    INVALID_FILENAME_CHARS: /[<>:"|?*]/g,
    DEFAULT_DOWNLOAD_FOLDER: 'GrabZilla_Videos',
    SUPPORTED_COOKIE_EXTENSIONS: ['.txt', '.json']
};

// Platform-specific paths
export const PLATFORM_PATHS = {
    darwin: '~/Downloads/GrabZilla_Videos',
    win32: 'C:\\Users\\Admin\\Desktop\\GrabZilla_Videos',
    linux: '~/Downloads/GrabZilla_Videos'
};

// Video status constants
export const VIDEO_STATUS = {
    READY: 'ready',
    DOWNLOADING: 'downloading',
    CONVERTING: 'converting',
    COMPLETED: 'completed',
    ERROR: 'error',
    PAUSED: 'paused'
};

// Error types
export const ERROR_TYPES = {
    INVALID_URL: 'INVALID_URL',
    NETWORK_ERROR: 'NETWORK_ERROR',
    BINARY_NOT_FOUND: 'BINARY_NOT_FOUND',
    PERMISSION_ERROR: 'PERMISSION_ERROR',
    DISK_SPACE_ERROR: 'DISK_SPACE_ERROR'
};

// Event names for state management
export const EVENTS = {
    VIDEO_ADDED: 'videoAdded',
    VIDEO_REMOVED: 'videoRemoved',
    VIDEO_UPDATED: 'videoUpdated',
    VIDEOS_CLEARED: 'videosCleared',
    CONFIG_UPDATED: 'configUpdated',
    UI_UPDATED: 'uiUpdated',
    STATE_IMPORTED: 'stateImported',
    DOWNLOAD_PROGRESS: 'downloadProgress',
    DOWNLOAD_COMPLETE: 'downloadComplete',
    DOWNLOAD_ERROR: 'downloadError'
};