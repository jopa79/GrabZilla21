/**
 * @fileoverview Video factory with validation and creation patterns
 * @author GrabZilla Development Team
 * @version 2.1.0
 * @since 2024-01-01
 */

import { URLValidator } from '../utils/url-validator.js';
import { APP_CONFIG, VIDEO_STATUS, ERROR_TYPES } from '../constants/config.js';

/**
 * Video Model - Core data structure for video management
 * 
 * Represents a single video in the download queue with all metadata
 * and state information required for processing
 */
export class Video {
    /**
     * Creates new Video instance (use VideoFactory.create instead)
     * @param {string} id - Unique video identifier
     * @param {string} url - Validated video URL
     * @param {Object} properties - Video properties
     * @private
     */
    constructor(id, url, properties = {}) {
        this.id = id;
        this.url = url;
        this.title = properties.title || 'Loading...';
        this.thumbnail = properties.thumbnail || 'assets/icons/placeholder.svg';
        this.duration = properties.duration || '00:00';
        this.quality = properties.quality || APP_CONFIG.DEFAULT_QUALITY;
        this.format = properties.format || APP_CONFIG.DEFAULT_FORMAT;
        this.status = properties.status || VIDEO_STATUS.READY;
        this.progress = properties.progress || 0;
        this.filename = properties.filename || '';
        this.error = properties.error || null;
        this.createdAt = properties.createdAt || new Date();
        this.updatedAt = properties.updatedAt || new Date();
    }
    
    /**
     * Update video properties with validation
     * @param {Object} properties - Properties to update
     * @returns {Video} This video instance for chaining
     */
    update(properties) {
        const allowedProperties = [
            'title', 'thumbnail', 'duration', 'quality', 'format', 
            'status', 'progress', 'filename', 'error'
        ];
        
        Object.keys(properties).forEach(key => {
            if (allowedProperties.includes(key)) {
                this[key] = properties[key];
            }
        });
        
        this.updatedAt = new Date();
        return this;
    }
    
    /**
     * Get video display name
     * @returns {string} Display-friendly video name
     */
    getDisplayName() {
        return this.title !== 'Loading...' ? this.title : this.url;
    }
    
    /**
     * Check if video is downloadable
     * @returns {boolean} True if video can be downloaded
     */
    isDownloadable() {
        return this.status === VIDEO_STATUS.READY && !this.error;
    }
    
    /**
     * Check if video is currently processing
     * @returns {boolean} True if video is being processed
     */
    isProcessing() {
        return [VIDEO_STATUS.DOWNLOADING, VIDEO_STATUS.CONVERTING].includes(this.status);
    }
    
    /**
     * Get formatted duration for display
     * @returns {string} Formatted duration or 'Unknown'
     */
    getFormattedDuration() {
        if (!this.duration || this.duration === '00:00') {
            return 'Unknown';
        }
        return this.duration;
    }
    
    /**
     * Convert to JSON for storage/transmission
     * @returns {Object} Serializable video object
     */
    toJSON() {
        return {
            id: this.id,
            url: this.url,
            title: this.title,
            thumbnail: this.thumbnail,
            duration: this.duration,
            quality: this.quality,
            format: this.format,
            status: this.status,
            progress: this.progress,
            filename: this.filename,
            error: this.error,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString()
        };
    }
}

/**
 * Video Factory - Creates and validates Video instances
 * 
 * Handles video creation with proper validation, error handling,
 * and metadata extraction using the Factory pattern
 */
export class VideoFactory {
    /**
     * Create new Video instance with validation
     * @param {string} url - Video URL to create from
     * @param {Object} options - Optional video properties
     * @returns {Video} New video instance
     * @throws {Error} When URL is invalid or creation fails
     */
    static create(url, options = {}) {
        // Validate URL
        const validation = URLValidator.validateUrlWithDetails(url);
        if (!validation.valid) {
            throw new Error(`Invalid video URL: ${validation.error}`);
        }
        
        // Normalize URL
        const normalizedUrl = URLValidator.normalizeUrl(url);
        
        // Generate unique ID
        const id = this.generateId();
        
        // Extract basic info from URL
        const basicInfo = this.extractBasicInfo(normalizedUrl);
        
        // Merge options with basic info
        const properties = {
            ...basicInfo,
            ...options,
            status: options.status || VIDEO_STATUS.READY
        };
        
        return new Video(id, normalizedUrl, properties);
    }
    
    /**
     * Create Video from JSON data
     * @param {Object} data - JSON data from toJSON()
     * @returns {Video} Restored video instance
     * @throws {Error} When data is invalid
     */
    static fromJSON(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid JSON data for video creation');
        }
        
        // Validate required fields
        const requiredFields = ['id', 'url'];
        for (const field of requiredFields) {
            if (!data[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        
        // Create video with restored properties
        const properties = {
            title: data.title,
            thumbnail: data.thumbnail,
            duration: data.duration,
            quality: data.quality,
            format: data.format,
            status: data.status,
            progress: data.progress,
            filename: data.filename,
            error: data.error,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
        };
        
        return new Video(data.id, data.url, properties);
    }
    
    /**
     * Create multiple videos from text input
     * @param {string} text - Text containing video URLs
     * @param {Object} defaultOptions - Default options for all videos
     * @returns {Object} Creation results with success/error arrays
     */
    static createFromText(text, defaultOptions = {}) {
        const result = {
            videos: [],
            errors: [],
            duplicateUrls: []
        };
        
        if (!text || typeof text !== 'string') {
            result.errors.push({
                url: '',
                error: 'No input text provided',
                type: ERROR_TYPES.INVALID_URL
            });
            return result;
        }
        
        // Extract URLs from text
        const urls = URLValidator.extractUrlsFromText(text);
        
        if (urls.length === 0) {
            result.errors.push({
                url: text.trim(),
                error: 'No valid video URLs found in text',
                type: ERROR_TYPES.INVALID_URL
            });
            return result;
        }
        
        // Track URLs to prevent duplicates within this batch
        const seenUrls = new Set();
        
        // Create videos from extracted URLs
        urls.forEach(url => {
            try {
                // Check for duplicates within this batch
                if (seenUrls.has(url)) {
                    result.duplicateUrls.push(url);
                    return;
                }
                seenUrls.add(url);
                
                // Create video
                const video = this.create(url, defaultOptions);
                result.videos.push(video);
                
            } catch (error) {
                result.errors.push({
                    url,
                    error: error.message,
                    type: ERROR_TYPES.INVALID_URL
                });
            }
        });
        
        return result;
    }
    
    /**
     * Generate unique video ID
     * @returns {string} Unique identifier
     * @private
     */
    static generateId() {
        return `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Extract basic video information from URL
     * @param {string} url - Normalized video URL
     * @returns {Object} Basic video information
     * @private
     */
    static extractBasicInfo(url) {
        const platform = URLValidator.getVideoPlatform(url);
        const info = {
            title: 'Loading...',
            thumbnail: 'assets/icons/placeholder.svg'
        };
        
        switch (platform) {
            case 'youtube': {
                const videoId = URLValidator.extractYouTubeId(url);
                if (videoId) {
                    info.title = `YouTube Video (${videoId})`;
                    info.thumbnail = URLValidator.getYouTubeThumbnail(videoId);
                }
                break;
            }
            case 'vimeo': {
                const videoId = URLValidator.extractVimeoId(url);
                if (videoId) {
                    info.title = `Vimeo Video (${videoId})`;
                    // Vimeo thumbnails require async API call
                }
                break;
            }
        }
        
        return info;
    }
    
    /**
     * Validate video object structure
     * @param {Object} video - Video object to validate
     * @returns {boolean} True if valid video object
     */
    static isValidVideo(video) {
        return video instanceof Video &&
               typeof video.id === 'string' &&
               typeof video.url === 'string' &&
               URLValidator.isValidVideoUrl(video.url);
    }
}