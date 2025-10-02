/**
 * @fileoverview Metadata Service for fetching video information via IPC
 * @author GrabZilla Development Team
 * @version 2.1.0
 */

/**
 * METADATA SERVICE
 *
 * Fetches video metadata (title, thumbnail, duration) from URLs using yt-dlp
 * via the Electron IPC bridge.
 *
 * Features:
 * - Async metadata fetching with timeout
 * - Caching to avoid duplicate requests
 * - Error handling and fallback
 * - Support for YouTube and Vimeo
 */

class MetadataService {
    constructor() {
        this.cache = new Map();
        this.pendingRequests = new Map();
        this.timeout = 30000; // 30 second timeout
        this.maxRetries = 2; // Maximum retry attempts
        this.retryDelay = 2000; // 2 second delay between retries
        this.ipcAvailable = typeof window !== 'undefined' && window.IPCManager;
    }

    /**
     * Get video metadata from URL
     * @param {string} url - Video URL to fetch metadata for
     * @returns {Promise<Object>} Video metadata object
     */
    async getVideoMetadata(url) {
        if (!url || typeof url !== 'string') {
            throw new Error('Valid URL is required');
        }

        const normalizedUrl = this.normalizeUrl(url);

        // Check cache first
        if (this.cache.has(normalizedUrl)) {
            return this.cache.get(normalizedUrl);
        }

        // Check if request is already pending
        if (this.pendingRequests.has(normalizedUrl)) {
            return this.pendingRequests.get(normalizedUrl);
        }

        // Create new request
        const requestPromise = this.fetchMetadata(normalizedUrl);
        this.pendingRequests.set(normalizedUrl, requestPromise);

        try {
            const metadata = await requestPromise;

            // Cache the result
            this.cache.set(normalizedUrl, metadata);

            return metadata;
        } finally {
            // Clean up pending request
            this.pendingRequests.delete(normalizedUrl);
        }
    }

    /**
     * Fetch metadata from main process via IPC with retry logic
     * @private
     * @param {string} url - Normalized video URL
     * @param {number} retryCount - Current retry attempt (default: 0)
     * @returns {Promise<Object>} Metadata object
     */
    async fetchMetadata(url, retryCount = 0) {
        if (!this.ipcAvailable) {
            console.warn('IPC not available, returning fallback metadata');
            return this.getFallbackMetadata(url);
        }

        try {
            // Create timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Metadata fetch timeout')), this.timeout);
            });

            // Race between fetch and timeout
            const metadata = await Promise.race([
                window.IPCManager.getVideoMetadata(url),
                timeoutPromise
            ]);

            // Validate and normalize metadata
            return this.normalizeMetadata(metadata, url);

        } catch (error) {
            console.error(`Error fetching metadata for ${url} (attempt ${retryCount + 1}/${this.maxRetries + 1}):`, error);

            // Retry if we haven't exceeded max retries
            if (retryCount < this.maxRetries) {
                console.log(`Retrying metadata fetch for ${url} in ${this.retryDelay}ms...`);

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));

                // Recursive retry
                return this.fetchMetadata(url, retryCount + 1);
            }

            // Return fallback metadata after all retries exhausted
            console.warn(`All retry attempts exhausted for ${url}, using fallback`);
            return this.getFallbackMetadata(url);
        }
    }

    /**
     * Normalize metadata response
     * @private
     * @param {Object} metadata - Raw metadata from IPC
     * @param {string} url - Original URL
     * @returns {Object} Normalized metadata
     */
    normalizeMetadata(metadata, url) {
        return {
            title: metadata.title || this.extractTitleFromUrl(url),
            thumbnail: metadata.thumbnail || null,
            duration: this.formatDuration(metadata.duration) || '00:00',
            filesize: metadata.filesize || null,
            uploader: metadata.uploader || null,
            uploadDate: metadata.upload_date || null,
            description: metadata.description || null,
            viewCount: metadata.view_count || null,
            likeCount: metadata.like_count || null
        };
    }

    /**
     * Get fallback metadata when fetch fails
     * @private
     * @param {string} url - Video URL
     * @returns {Object} Fallback metadata
     */
    getFallbackMetadata(url) {
        return {
            title: this.extractTitleFromUrl(url),
            thumbnail: null,
            duration: '00:00',
            filesize: null,
            uploader: null,
            uploadDate: null,
            description: null,
            viewCount: null,
            likeCount: null
        };
    }

    /**
     * Extract title from URL as fallback
     * @private
     * @param {string} url - Video URL
     * @returns {string} Extracted or placeholder title
     */
    extractTitleFromUrl(url) {
        try {
            // Extract video ID for YouTube
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                if (match) {
                    return `YouTube Video (${match[1]})`;
                }
            }

            // Extract video ID for Vimeo
            if (url.includes('vimeo.com')) {
                const match = url.match(/vimeo\.com\/(\d+)/);
                if (match) {
                    return `Vimeo Video (${match[1]})`;
                }
            }

            return url;
        } catch (error) {
            return url;
        }
    }

    /**
     * Format duration from seconds to MM:SS or HH:MM:SS
     * @private
     * @param {number} seconds - Duration in seconds
     * @returns {string} Formatted duration string
     */
    formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) {
            return '00:00';
        }

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    /**
     * Normalize URL for caching
     * @private
     * @param {string} url - Video URL
     * @returns {string} Normalized URL
     */
    normalizeUrl(url) {
        if (window.URLValidator) {
            return window.URLValidator.normalizeUrl(url);
        }
        return url.trim();
    }

    /**
     * Clear cache for specific URL or all URLs
     * @param {string} [url] - Optional URL to clear from cache
     */
    clearCache(url = null) {
        if (url) {
            const normalizedUrl = this.normalizeUrl(url);
            this.cache.delete(normalizedUrl);
        } else {
            this.cache.clear();
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            pendingRequests: this.pendingRequests.size,
            urls: Array.from(this.cache.keys())
        };
    }

    /**
     * Prefetch metadata for multiple URLs
     * @param {string[]} urls - Array of URLs to prefetch
     * @returns {Promise<Object[]>} Array of metadata objects
     */
    async prefetchMetadata(urls) {
        if (!Array.isArray(urls)) {
            throw new Error('URLs must be an array');
        }

        const promises = urls.map(url =>
            this.getVideoMetadata(url).catch(error => {
                console.warn(`Failed to prefetch metadata for ${url}:`, error);
                return this.getFallbackMetadata(url);
            })
        );

        return Promise.all(promises);
    }
}

// Create singleton instance
const metadataService = new MetadataService();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = metadataService;
} else if (typeof window !== 'undefined') {
    window.MetadataService = metadataService;
}