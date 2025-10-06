// GrabZilla 2.1 - Video Model
// Core data structure for video management

class Video {
    constructor(url, options = {}) {
        this.id = this.generateId();
        this.url = this.validateUrl(url);
        this.title = options.title || 'Loading...';
        this.thumbnail = options.thumbnail || 'assets/icons/placeholder.svg';
        this.duration = options.duration || '00:00';

        // Use current app state defaults if no options provided
        const appState = window.appState || window.app?.state;
        const defaultQuality = appState?.config?.defaultQuality || window.AppConfig?.APP_CONFIG?.DEFAULT_QUALITY || '1080p';
        const defaultFormat = appState?.config?.defaultFormat || window.AppConfig?.APP_CONFIG?.DEFAULT_FORMAT || 'None';

        this.quality = options.quality || defaultQuality;
        this.format = options.format || defaultFormat;
        this.status = options.status || 'ready';
        this.progress = options.progress || 0;
        this.filename = options.filename || '';
        this.error = options.error || null;
        this.retryCount = options.retryCount || 0;
        this.maxRetries = options.maxRetries || 3;
        this.downloadSpeed = options.downloadSpeed || null;
        this.eta = options.eta || null;
        this.isFetchingMetadata = options.isFetchingMetadata !== undefined ? options.isFetchingMetadata : false;
        this.requiresAuth = options.requiresAuth || false; // Video requires cookie file for download
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    // Generate unique ID for video
    generateId() {
        return 'video_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Validate and normalize URL
    validateUrl(url) {
        if (!url || typeof url !== 'string') {
            throw new Error('Invalid URL provided');
        }

        const trimmedUrl = url.trim();
        if (window.URLValidator && !window.URLValidator.isValidVideoUrl(trimmedUrl)) {
            throw new Error('Invalid video URL format');
        }

        return trimmedUrl;
    }

    // Update video properties
    update(properties) {
        const allowedProperties = [
            'title', 'thumbnail', 'duration', 'quality', 'format',
            'status', 'progress', 'filename', 'error', 'retryCount', 'maxRetries', 'downloadSpeed', 'eta', 'isFetchingMetadata', 'requiresAuth'
        ];

        Object.keys(properties).forEach(key => {
            if (allowedProperties.includes(key)) {
                this[key] = properties[key];
            }
        });

        this.updatedAt = new Date();
        return this;
    }

    // Get video display name
    getDisplayName() {
        return this.title !== 'Loading...' ? this.title : this.url;
    }

    // Check if video is downloadable
    isDownloadable() {
        return this.status === 'ready' && !this.error;
    }

    // Check if video is currently processing
    isProcessing() {
        return ['downloading', 'converting', 'paused'].includes(this.status);
    }

    // Check if video is paused
    isPaused() {
        return this.status === 'paused';
    }

    // Check if video is completed
    isCompleted() {
        return this.status === 'completed';
    }

    // Check if video has error
    hasError() {
        return this.status === 'error' || !!this.error;
    }

    // Reset video for re-download (useful if file was deleted)
    resetForRedownload() {
        this.status = 'ready';
        this.progress = 0;
        this.error = null;
        this.filename = '';
        this.updatedAt = new Date();
        return this;
    }

    // Get formatted duration
    getFormattedDuration() {
        if (!this.duration || this.duration === '00:00') {
            return 'Unknown';
        }
        return this.duration;
    }

    // Get status display text
    getStatusText() {
        switch (this.status) {
            case 'ready':
                return 'Ready';
            case 'downloading':
                return this.progress > 0 ? `Downloading ${this.progress}%` : 'Downloading';
            case 'converting':
                return this.progress > 0 ? `Converting ${this.progress}%` : 'Converting';
            case 'completed':
                return 'Completed';
            case 'error':
                return 'Error';
            default:
                return this.status;
        }
    }

    // Get progress percentage as integer
    getProgressPercent() {
        return Math.max(0, Math.min(100, Math.round(this.progress || 0)));
    }

    // Check if video supports the specified quality
    supportsQuality(quality) {
        const supportedQualities = window.AppConfig?.APP_CONFIG?.SUPPORTED_QUALITIES ||
                                  ['720p', '1080p', '1440p', '4K'];
        return supportedQualities.includes(quality);
    }

    // Check if video supports the specified format
    supportsFormat(format) {
        const supportedFormats = window.AppConfig?.APP_CONFIG?.SUPPORTED_FORMATS ||
                                ['None', 'H264', 'ProRes', 'DNxHR', 'Audio only'];
        return supportedFormats.includes(format);
    }

    // Get video platform (YouTube, Vimeo, etc.)
    getPlatform() {
        if (window.URLValidator) {
            return window.URLValidator.getPlatform(this.url);
        }
        return 'Unknown';
    }

    // Get normalized URL
    getNormalizedUrl() {
        if (window.URLValidator) {
            return window.URLValidator.normalizeUrl(this.url);
        }
        return this.url;
    }

    // Get estimated file size (if available from metadata)
    getEstimatedFileSize() {
        // This would be populated from video metadata
        return this.estimatedSize || null;
    }

    // Get download speed (if currently downloading)
    getDownloadSpeed() {
        return this.downloadSpeed || null;
    }

    // Get time remaining (if currently processing)
    getTimeRemaining() {
        if (!this.isProcessing() || !this.progress || this.progress === 0) {
            return null;
        }

        const speed = this.getDownloadSpeed();
        if (!speed) return null;

        const remainingPercent = 100 - this.progress;
        const estimatedSeconds = (remainingPercent / this.progress) * (this.getElapsedTime() / 1000);

        return this.formatDuration(estimatedSeconds);
    }

    // Get elapsed time since creation or status change
    getElapsedTime() {
        return Date.now() - this.updatedAt.getTime();
    }

    // Format duration from seconds
    formatDuration(seconds) {
        if (!seconds || seconds < 0) return '00:00';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    // Convert to JSON for storage/transmission
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
            isFetchingMetadata: this.isFetchingMetadata,
            requiresAuth: this.requiresAuth,
            estimatedSize: this.estimatedSize,
            downloadSpeed: this.downloadSpeed,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString()
        };
    }

    // Create Video from JSON
    static fromJSON(data) {
        const video = new Video(data.url, {
            title: data.title,
            thumbnail: data.thumbnail,
            duration: data.duration,
            quality: data.quality,
            format: data.format,
            status: data.status,
            progress: data.progress,
            filename: data.filename,
            error: data.error,
            isFetchingMetadata: data.isFetchingMetadata || false,
            requiresAuth: data.requiresAuth || false
        });

        video.id = data.id;
        video.estimatedSize = data.estimatedSize;
        video.downloadSpeed = data.downloadSpeed;
        video.createdAt = new Date(data.createdAt);
        video.updatedAt = new Date(data.updatedAt);

        return video;
    }

    // Create Video from URL with metadata
    static fromUrl(url, options = {}) {
        try {
            const video = new Video(url, options);
            video.isFetchingMetadata = true;

            // Fetch metadata in background (non-blocking for instant UI update)
            if (window.MetadataService) {
                window.MetadataService.getVideoMetadata(url)
                    .then(metadata => {
                        const oldProperties = { ...video };
                        video.update({
                            title: metadata.title,
                            thumbnail: metadata.thumbnail,
                            duration: metadata.duration,
                            estimatedSize: metadata.filesize,
                            isFetchingMetadata: false
                        });

                        // Notify AppState that video was updated so UI can re-render
                        const appState = window.appState || window.app?.state;
                        if (appState && appState.emit) {
                            appState.emit('videoUpdated', { video, oldProperties });
                        }
                    })
                    .catch(metadataError => {
                        console.warn('Failed to fetch metadata for video:', metadataError.message);

                        // Check if error indicates authentication is required
                        const errorMsg = metadataError.message.toLowerCase();
                        const requiresAuth = errorMsg.includes('sign in') ||
                                            errorMsg.includes('age') ||
                                            errorMsg.includes('restricted') ||
                                            errorMsg.includes('private') ||
                                            errorMsg.includes('members');

                        const oldProperties = { ...video };
                        video.update({
                            title: video.url,
                            isFetchingMetadata: false,
                            requiresAuth: requiresAuth
                        });

                        // Notify AppState even on error so UI updates
                        const appState = window.appState || window.app?.state;
                        if (appState && appState.emit) {
                            appState.emit('videoUpdated', { video, oldProperties });
                        }
                    });
            }

            // Return immediately - don't wait for metadata
            return video;
        } catch (error) {
            throw new Error(`Failed to create video from URL: ${error.message}`);
        }
    }

    // Clone video with new properties
    clone(overrides = {}) {
        const cloned = Video.fromJSON(this.toJSON());
        if (Object.keys(overrides).length > 0) {
            cloned.update(overrides);
        }
        return cloned;
    }

    // Compare two videos for equality
    equals(other) {
        if (!(other instanceof Video)) {
            return false;
        }
        return this.getNormalizedUrl() === other.getNormalizedUrl();
    }

    // Get video summary for logging/debugging
    getSummary() {
        return {
            id: this.id,
            title: this.getDisplayName(),
            url: this.url,
            status: this.status,
            progress: this.progress,
            quality: this.quality,
            format: this.format,
            platform: this.getPlatform()
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = Video;
} else {
    // Browser environment - attach to window
    window.Video = Video;
}