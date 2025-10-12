/**
 * @fileoverview Metadata Service for fetching video information via IPC
 * @author GrabZilla Development Team
 * @version 2.1.0
 */

// Use logger from window (loaded by scripts/utils/logger.js)
const logger = window.logger;

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
            logger.warn('IPC not available, returning fallback metadata');
            return this.getFallbackMetadata(url);
        }

        try {
            // Get cookie file from app state if available
            const cookieFile = window.appState?.config?.cookieFile || null;

            // Create timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Metadata fetch timeout')), this.timeout);
            });

            // Race between fetch and timeout
            const metadata = await Promise.race([
                window.IPCManager.getVideoMetadata(url, cookieFile),
                timeoutPromise
            ]);

            // Validate and normalize metadata
            return this.normalizeMetadata(metadata, url);

        } catch (error) {
            logger.error(`Error fetching metadata for ${url} (attempt ${retryCount + 1}/${this.maxRetries + 1}):`, error.message);

            // Retry if we haven't exceeded max retries
            if (retryCount < this.maxRetries) {
                logger.debug(`Retrying metadata fetch for ${url} in ${this.retryDelay}ms...`);

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));

                // Recursive retry
                return this.fetchMetadata(url, retryCount + 1);
            }

            // Return fallback metadata after all retries exhausted
            logger.warn(`All retry attempts exhausted for ${url}, using fallback`);
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
     * Prefetch metadata for multiple URLs (uses optimized batch extraction)
     * @param {string[]} urls - Array of URLs to prefetch
     * @returns {Promise<Object[]>} Array of metadata objects
     */
    async prefetchMetadata(urls) {
        if (!Array.isArray(urls)) {
            throw new Error('URLs must be an array');
        }

        // Use batch API for better performance (5-10x faster)
        if (urls.length > 1 && this.ipcAvailable && window.IPCManager.getBatchVideoMetadata) {
            return this.getBatchMetadata(urls);
        }

        // Fallback to individual requests for single URL or if batch API not available
        const promises = urls.map(url =>
            this.getVideoMetadata(url).catch(error => {
                logger.warn(`Failed to prefetch metadata for ${url}:`, error);
                return this.getFallbackMetadata(url);
            })
        );

        return Promise.all(promises);
    }

    /**
     * Get metadata for multiple URLs in a single batch request (5-10x faster)
     * @param {string[]} urls - Array of URLs to fetch metadata for
     * @returns {Promise<Object[]>} Array of metadata objects with url property
     */
    async getBatchMetadata(urls) {
        if (!Array.isArray(urls) || urls.length === 0) {
            throw new Error('Valid URL array is required');
        }

        if (!this.ipcAvailable || !window.IPCManager.getBatchVideoMetadata) {
            logger.warn('Batch metadata API not available, falling back to individual requests');
            return this.prefetchMetadata(urls);
        }

        try {
            logger.debug(`Fetching batch metadata for ${urls.length} URLs...`);
            const startTime = Date.now();

            // Normalize URLs
            const normalizedUrls = urls.map(url => this.normalizeUrl(url));

            // Check cache for existing metadata
            const cachedResults = [];
            const uncachedUrls = [];

            for (const url of normalizedUrls) {
                if (this.cache.has(url)) {
                    const cached = this.cache.get(url);
                    cachedResults.push({ ...cached, url }); // Add url to result
                } else {
                    uncachedUrls.push(url);
                }
            }

            // If all URLs are cached, return immediately
            if (uncachedUrls.length === 0) {
                const duration = Date.now() - startTime;
                logger.debug(`All ${urls.length} URLs found in cache (${duration}ms)`);
                return cachedResults;
            }

            // Get cookie file from app state if available
            const cookieFile = window.appState?.config?.cookieFile || null;

            // Fetch uncached URLs in batch
            const batchResults = await window.IPCManager.getBatchVideoMetadata(uncachedUrls, cookieFile);

            // Cache the new results
            for (const result of batchResults) {
                const normalizedUrl = this.normalizeUrl(result.url);
                this.cache.set(normalizedUrl, result);
            }

            // Combine cached and new results, maintaining original order
            const allResults = normalizedUrls.map(url => {
                // First check cached results
                const cached = cachedResults.find(r => this.normalizeUrl(r.url) === url);
                if (cached) return cached;

                // Then check new results
                const fresh = batchResults.find(r => this.normalizeUrl(r.url) === url);
                if (fresh) return fresh;

                // Fallback if not found
                logger.warn(`No metadata found for ${url}, using fallback`);
                return { ...this.getFallbackMetadata(url), url };
            });

            const duration = Date.now() - startTime;
            const avgTime = duration / urls.length;
            logger.debug(`Batch metadata complete: ${urls.length} URLs in ${duration}ms (${avgTime.toFixed(1)}ms avg/video, ${cachedResults.length} cached)`);

            return allResults;

        } catch (error) {
            logger.error('Batch metadata extraction failed, falling back to individual requests:', error.message);

            // Fallback to individual requests on error
            const promises = urls.map(url =>
                this.getVideoMetadata(url).catch(err => {
                    logger.warn(`Failed to fetch metadata for ${url}:`, err);
                    return { ...this.getFallbackMetadata(url), url };
                })
            );

            return Promise.all(promises);
        }
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