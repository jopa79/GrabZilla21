/**
 * @fileoverview IPC Integration utilities for Electron desktop app functionality
 * @author GrabZilla Development Team
 * @version 2.1.0
 * @since 2024-01-01
 */

/**
 * IPC INTEGRATION MODULE
 * 
 * Provides secure communication layer between renderer and main process
 * 
 * Features:
 * - File system operations (save directory, cookie file selection)
 * - Binary version checking and management
 * - Video download operations with progress tracking
 * - Secure IPC channel management
 * 
 * Dependencies:
 * - Electron contextBridge API (exposed via preload script)
 * - Main process IPC handlers
 * 
 * Security:
 * - All IPC calls are validated and sanitized
 * - No direct access to Node.js APIs from renderer
 * - Secure contextBridge exposure pattern
 */

class IPCManager {
    constructor() {
        this.isElectronAvailable = typeof window !== 'undefined' && window.electronAPI;
        this.downloadProgressListeners = new Map();
        
        if (this.isElectronAvailable) {
            this.setupProgressListener();
        }
    }

    /**
     * Check if Electron IPC is available
     * @returns {boolean} True if running in Electron environment
     */
    isAvailable() {
        return this.isElectronAvailable;
    }

    /**
     * Set up download progress listener
     */
    setupProgressListener() {
        if (!this.isElectronAvailable) return;

        window.electronAPI.onDownloadProgress((event, progressData) => {
            const { url, progress } = progressData;
            
            // Notify all registered listeners
            this.downloadProgressListeners.forEach((callback, listenerId) => {
                try {
                    callback({ url, progress });
                } catch (error) {
                    console.error(`Error in download progress listener ${listenerId}:`, error);
                }
            });
        });
    }

    /**
     * Register download progress listener
     * @param {string} listenerId - Unique identifier for the listener
     * @param {Function} callback - Callback function to handle progress updates
     */
    onDownloadProgress(listenerId, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Progress callback must be a function');
        }
        
        this.downloadProgressListeners.set(listenerId, callback);
    }

    /**
     * Remove download progress listener
     * @param {string} listenerId - Listener identifier to remove
     */
    removeDownloadProgressListener(listenerId) {
        this.downloadProgressListeners.delete(listenerId);
    }

    /**
     * Select save directory using native file dialog
     * @returns {Promise<string|null>} Selected directory path or null if cancelled
     */
    async selectSaveDirectory() {
        if (!this.isElectronAvailable) {
            throw new Error('File selection not available in browser mode');
        }

        try {
            const directoryPath = await window.electronAPI.selectSaveDirectory();
            return directoryPath;
        } catch (error) {
            console.error('Error selecting save directory:', error);
            throw new Error('Failed to select save directory');
        }
    }

    /**
     * Select cookie file using native file dialog
     * @returns {Promise<string|null>} Selected file path or null if cancelled
     */
    async selectCookieFile() {
        if (!this.isElectronAvailable) {
            throw new Error('File selection not available in browser mode');
        }

        try {
            const filePath = await window.electronAPI.selectCookieFile();
            return filePath;
        } catch (error) {
            console.error('Error selecting cookie file:', error);
            throw new Error('Failed to select cookie file');
        }
    }

    /**
     * Check binary versions (yt-dlp, ffmpeg)
     * @returns {Promise<Object>} Binary version information
     */
    async checkBinaryVersions() {
        if (!this.isElectronAvailable) {
            throw new Error('Binary checking not available in browser mode');
        }

        try {
            const versions = await window.electronAPI.checkBinaryVersions();
            return versions;
        } catch (error) {
            console.error('Error checking binary versions:', error);
            throw new Error('Failed to check binary versions');
        }
    }

    /**
     * Get video metadata from URL
     * @param {string} url - Video URL to fetch metadata for
     * @param {string} cookieFile - Optional path to cookie file for authentication
     * @returns {Promise<Object>} Video metadata (title, duration, thumbnail, etc.)
     */
    async getVideoMetadata(url, cookieFile = null) {
        if (!this.isElectronAvailable) {
            throw new Error('Metadata fetching not available in browser mode');
        }

        if (!url || typeof url !== 'string') {
            throw new Error('Valid URL is required for metadata fetching');
        }

        try {
            const metadata = await window.electronAPI.getVideoMetadata(url, cookieFile);
            return metadata;
        } catch (error) {
            console.error('Error fetching video metadata:', error);
            throw new Error(`Failed to fetch metadata: ${error.message}`);
        }
    }

    /**
     * Get metadata for multiple URLs in a single batch request (5-10x faster)
     * @param {string[]} urls - Array of video URLs to fetch metadata for
     * @param {string} cookieFile - Optional path to cookie file for authentication
     * @returns {Promise<Object[]>} Array of video metadata objects with url property
     */
    async getBatchVideoMetadata(urls, cookieFile = null) {
        if (!this.isElectronAvailable) {
            throw new Error('Batch metadata fetching not available in browser mode');
        }

        if (!Array.isArray(urls) || urls.length === 0) {
            throw new Error('Valid URL array is required for batch metadata fetching');
        }

        try {
            const results = await window.electronAPI.getBatchVideoMetadata(urls, cookieFile);
            return results;
        } catch (error) {
            console.error('Error fetching batch video metadata:', error);
            throw new Error(`Failed to fetch batch metadata: ${error.message}`);
        }
    }

    /**
     * Download video with specified options
     * @param {Object} options - Download options
     * @param {string} options.url - Video URL to download
     * @param {string} options.quality - Video quality (720p, 1080p, etc.)
     * @param {string} options.format - Output format (None, H264, ProRes, etc.)
     * @param {string} options.savePath - Directory to save the video
     * @param {string} [options.cookieFile] - Optional cookie file path
     * @returns {Promise<Object>} Download result
     */
    async downloadVideo(options) {
        if (!this.isElectronAvailable) {
            throw new Error('Video download not available in browser mode');
        }

        // Validate required options (now includes videoId for parallel processing)
        const requiredFields = ['videoId', 'url', 'quality', 'format', 'savePath'];
        for (const field of requiredFields) {
            if (!options[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Sanitize options
        const sanitizedOptions = {
            videoId: options.videoId,
            url: options.url.trim(),
            quality: options.quality,
            format: options.format,
            savePath: options.savePath,
            cookieFile: options.cookieFile || null
        };

        try {
            const result = await window.electronAPI.downloadVideo(sanitizedOptions);
            return result;
        } catch (error) {
            console.error('Error downloading video:', error);
            throw new Error(`Download failed: ${error.message}`);
        }
    }

    /**
     * Get download manager statistics
     * @returns {Promise<Object>} Download stats
     */
    async getDownloadStats() {
        if (!this.isElectronAvailable) {
            return {
                active: 0,
                queued: 0,
                maxConcurrent: 1,
                completed: 0,
                canAcceptMore: true
            };
        }

        try {
            const result = await window.electronAPI.getDownloadStats();
            return result.stats;
        } catch (error) {
            console.error('Error getting download stats:', error);
            throw new Error(`Failed to get download stats: ${error.message}`);
        }
    }

    /**
     * Cancel a specific download
     * @param {string} videoId - Video ID to cancel
     * @returns {Promise<boolean>} Success status
     */
    async cancelDownload(videoId) {
        if (!this.isElectronAvailable) {
            throw new Error('Cancel download not available in browser mode');
        }

        try {
            const result = await window.electronAPI.cancelDownload(videoId);
            return result.success;
        } catch (error) {
            console.error('Error cancelling download:', error);
            throw new Error(`Failed to cancel download: ${error.message}`);
        }
    }

    /**
     * Cancel all queued downloads
     * @returns {Promise<Object>} Cancel result with counts
     */
    async cancelAllDownloads() {
        if (!this.isElectronAvailable) {
            throw new Error('Cancel all downloads not available in browser mode');
        }

        try {
            const result = await window.electronAPI.cancelAllDownloads();
            return result;
        } catch (error) {
            console.error('Error cancelling all downloads:', error);
            throw new Error(`Failed to cancel downloads: ${error.message}`);
        }
    }

    /**
     * Get app version information
     * @returns {string} App version
     */
    getAppVersion() {
        if (!this.isElectronAvailable) {
            return '2.1.0'; // Fallback version
        }

        try {
            return window.electronAPI.getAppVersion();
        } catch (error) {
            console.error('Error getting app version:', error);
            return '2.1.0';
        }
    }

    /**
     * Get platform information
     * @returns {string} Platform identifier (darwin, win32, linux)
     */
    getPlatform() {
        if (!this.isElectronAvailable) {
            return 'unknown';
        }

        try {
            return window.electronAPI.getPlatform();
        } catch (error) {
            console.error('Error getting platform:', error);
            return 'unknown';
        }
    }

    /**
     * Validate IPC connection and available methods
     * @returns {Object} Validation result with available methods
     */
    validateConnection() {
        if (!this.isElectronAvailable) {
            return {
                connected: false,
                error: 'Electron API not available',
                availableMethods: []
            };
        }

        const expectedMethods = [
            'selectSaveDirectory',
            'selectCookieFile',
            'checkBinaryVersions',
            'getVideoMetadata',
            'getBatchVideoMetadata',
            'downloadVideo',
            'getAppVersion',
            'getPlatform',
            'onDownloadProgress'
        ];

        const availableMethods = expectedMethods.filter(method => 
            typeof window.electronAPI[method] === 'function'
        );

        const missingMethods = expectedMethods.filter(method => 
            typeof window.electronAPI[method] !== 'function'
        );

        return {
            connected: true,
            availableMethods,
            missingMethods,
            allMethodsAvailable: missingMethods.length === 0
        };
    }
}

// Export singleton instance
const ipcManager = new IPCManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ipcManager;
} else if (typeof window !== 'undefined') {
    window.IPCManager = ipcManager;
}