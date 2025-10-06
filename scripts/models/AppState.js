// GrabZilla 2.1 - Application State Management
// Centralized state management with event system

class AppState {
    constructor() {
        this.videos = [];
        this.history = []; // Array of completed download history entries
        this.config = {
            savePath: this.getDefaultDownloadsPath(),
            defaultQuality: window.AppConfig?.APP_CONFIG?.DEFAULT_QUALITY || '1080p',
            defaultFormat: window.AppConfig?.APP_CONFIG?.DEFAULT_FORMAT || 'None',
            filenamePattern: window.AppConfig?.APP_CONFIG?.DEFAULT_FILENAME_PATTERN || '%(title)s.%(ext)s',
            cookieFile: null,
            maxHistoryEntries: 100 // Maximum number of history entries to keep
        };
        this.ui = {
            isDownloading: false,
            selectedVideos: [],
            sortBy: 'createdAt',
            sortOrder: 'desc',
            keyboardNavigationActive: false,
            currentFocusIndex: -1
        };
        this.listeners = new Map();
        this.downloadQueue = [];
        this.downloadStats = {
            totalDownloads: 0,
            successfulDownloads: 0,
            failedDownloads: 0,
            totalBytesDownloaded: 0
        };
    }

    // Get default downloads path based on platform
    getDefaultDownloadsPath() {
        const defaultPaths = window.AppConfig?.DEFAULT_PATHS || {
            darwin: '~/Downloads/GrabZilla_Videos',
            win32: 'C:\\Users\\Admin\\Desktop\\GrabZilla_Videos',
            linux: '~/Downloads/GrabZilla_Videos'
        };

        if (window.electronAPI) {
            try {
                const platform = window.electronAPI.getPlatform();
                return defaultPaths[platform] || defaultPaths.linux;
            } catch (error) {
                console.warn('Failed to get platform:', error);
                return defaultPaths.win32;
            }
        }
        return defaultPaths.win32;
    }

    // Video management methods
    addVideo(video) {
        if (!(video instanceof window.Video)) {
            throw new Error('Invalid video object');
        }

        // Check for duplicate URLs
        const existingVideo = this.videos.find(v => v.getNormalizedUrl() === video.getNormalizedUrl());
        if (existingVideo) {
            throw new Error('Video URL already exists in the list');
        }

        this.videos.push(video);
        this.emit('videoAdded', { video });
        return video;
    }

    // Add multiple videos from URLs
    async addVideosFromUrls(urls, options = {}) {
        const { allowDuplicates = false } = options;

        const results = {
            successful: [],
            failed: [],
            duplicates: []
        };

        // Filter out duplicates first (unless allowDuplicates is true)
        const uniqueUrls = [];
        for (const url of urls) {
            if (allowDuplicates) {
                // Skip duplicate check
                uniqueUrls.push(url);
            } else {
                const normalizedUrl = window.URLValidator ? window.URLValidator.normalizeUrl(url) : url;
                const existingVideo = this.videos.find(v => v.getNormalizedUrl() === normalizedUrl);

                if (existingVideo) {
                    results.duplicates.push({ url, reason: 'URL already exists' });
                } else {
                    uniqueUrls.push(url);
                }
            }
        }

        // Create videos immediately for instant UI feedback (non-blocking)
        for (const url of uniqueUrls) {
            try {
                const video = window.Video.fromUrl(url);
                this.addVideo(video);
                results.successful.push(video);
            } catch (error) {
                results.failed.push({ url, error: error.message });
            }
        }

        // Prefetch metadata in background (non-blocking, parallel for better UX)
        // Videos will update automatically via Video.fromUrl() metadata fetch
        if (uniqueUrls.length > 0 && window.MetadataService) {
            console.log(`[Batch Metadata] Starting background fetch for ${uniqueUrls.length} URLs...`);
            const startTime = performance.now();

            // Don't await - let it run in background
            window.MetadataService.prefetchMetadata(uniqueUrls)
                .then(() => {
                    const duration = performance.now() - startTime;
                    console.log(`[Batch Metadata] Completed in ${Math.round(duration)}ms (${Math.round(duration / uniqueUrls.length)}ms avg/video)`);
                })
                .catch(error => {
                    console.warn('[Batch Metadata] Batch prefetch failed:', error.message);
                });
        }

        this.emit('videosAdded', { results });
        return results;
    }

    // Reorder videos in the array
    reorderVideos(fromIndex, toIndex) {
        if (fromIndex === toIndex) return;

        if (fromIndex < 0 || fromIndex >= this.videos.length ||
            toIndex < 0 || toIndex > this.videos.length) {
            throw new Error('Invalid indices for reordering');
        }

        // Remove from old position
        const [movedVideo] = this.videos.splice(fromIndex, 1);

        // Insert at new position
        const adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
        this.videos.splice(adjustedToIndex, 0, movedVideo);

        this.emit('videosReordered', {
            fromIndex,
            toIndex: adjustedToIndex,
            videoId: movedVideo.id
        });

        console.log(`Reordered video from position ${fromIndex} to ${adjustedToIndex}`);
    }

    // Remove video from state
    removeVideo(videoId) {
        const index = this.videos.findIndex(v => v.id === videoId);
        if (index === -1) {
            throw new Error('Video not found');
        }

        const removedVideo = this.videos.splice(index, 1)[0];

        // Remove from selected videos if present
        this.ui.selectedVideos = this.ui.selectedVideos.filter(id => id !== videoId);

        this.emit('videoRemoved', { video: removedVideo });
        return removedVideo;
    }

    // Remove multiple videos
    removeVideos(videoIds) {
        const removedVideos = [];
        const errors = [];

        for (const videoId of videoIds) {
            try {
                const removed = this.removeVideo(videoId);
                removedVideos.push(removed);
            } catch (error) {
                errors.push({ videoId, error: error.message });
            }
        }

        this.emit('videosRemoved', { removedVideos, errors });
        return { removedVideos, errors };
    }

    // Update video in state
    updateVideo(videoId, properties) {
        const video = this.videos.find(v => v.id === videoId);
        if (!video) {
            throw new Error('Video not found');
        }

        const oldProperties = { ...video };
        video.update(properties);
        this.emit('videoUpdated', { video, oldProperties });
        return video;
    }

    // Get video by ID
    getVideo(videoId) {
        return this.videos.find(v => v.id === videoId);
    }

    // Get all videos
    getVideos() {
        return [...this.videos];
    }

    // Get videos by status
    getVideosByStatus(status) {
        return this.videos.filter(v => v.status === status);
    }

    // Get selected videos
    getSelectedVideos() {
        return this.videos.filter(v => this.ui.selectedVideos.includes(v.id));
    }

    // Clear all videos
    clearVideos() {
        const removedVideos = [...this.videos];
        this.videos = [];
        this.ui.selectedVideos = [];
        this.downloadQueue = [];
        this.emit('videosCleared', { removedVideos });
        return removedVideos;
    }

    // Selection management
    selectVideo(videoId, multiSelect = false) {
        if (!multiSelect) {
            this.ui.selectedVideos = [videoId];
        } else {
            if (!this.ui.selectedVideos.includes(videoId)) {
                this.ui.selectedVideos.push(videoId);
            }
        }
        this.emit('videoSelectionChanged', { selectedVideos: this.ui.selectedVideos });
    }

    deselectVideo(videoId) {
        this.ui.selectedVideos = this.ui.selectedVideos.filter(id => id !== videoId);
        this.emit('videoSelectionChanged', { selectedVideos: this.ui.selectedVideos });
    }

    selectAllVideos() {
        this.ui.selectedVideos = this.videos.map(v => v.id);
        this.emit('videoSelectionChanged', { selectedVideos: this.ui.selectedVideos });
    }

    deselectAllVideos() {
        this.ui.selectedVideos = [];
        this.emit('videoSelectionChanged', { selectedVideos: this.ui.selectedVideos });
    }

    toggleVideoSelection(videoId) {
        if (this.ui.selectedVideos.includes(videoId)) {
            this.deselectVideo(videoId);
        } else {
            this.selectVideo(videoId, true);
        }
    }

    // Sort videos
    sortVideos(sortBy, sortOrder = 'asc') {
        this.ui.sortBy = sortBy;
        this.ui.sortOrder = sortOrder;

        this.videos.sort((a, b) => {
            let valueA, valueB;

            switch (sortBy) {
                case 'title':
                    valueA = a.getDisplayName().toLowerCase();
                    valueB = b.getDisplayName().toLowerCase();
                    break;
                case 'duration':
                    valueA = a.duration || '00:00';
                    valueB = b.duration || '00:00';
                    break;
                case 'status':
                    valueA = a.status;
                    valueB = b.status;
                    break;
                case 'quality':
                    valueA = a.quality;
                    valueB = b.quality;
                    break;
                case 'format':
                    valueA = a.format;
                    valueB = b.format;
                    break;
                case 'createdAt':
                default:
                    valueA = a.createdAt.getTime();
                    valueB = b.createdAt.getTime();
                    break;
            }

            if (sortOrder === 'desc') {
                return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
            } else {
                return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
            }
        });

        this.emit('videosSorted', { sortBy, sortOrder });
    }

    // Configuration management
    updateConfig(newConfig) {
        const oldConfig = { ...this.config };
        Object.assign(this.config, newConfig);
        this.emit('configUpdated', { config: this.config, oldConfig });
    }

    // UI state management
    updateUI(newUIState) {
        const oldUIState = { ...this.ui };
        Object.assign(this.ui, newUIState);
        this.emit('uiUpdated', { ui: this.ui, oldUIState });
    }

    // Download queue management
    addToDownloadQueue(videoIds) {
        const newItems = videoIds.filter(id => !this.downloadQueue.includes(id));
        this.downloadQueue.push(...newItems);
        this.emit('downloadQueueUpdated', { downloadQueue: this.downloadQueue });
    }

    removeFromDownloadQueue(videoId) {
        this.downloadQueue = this.downloadQueue.filter(id => id !== videoId);
        this.emit('downloadQueueUpdated', { downloadQueue: this.downloadQueue });
    }

    clearDownloadQueue() {
        this.downloadQueue = [];
        this.emit('downloadQueueUpdated', { downloadQueue: this.downloadQueue });
    }

    // Event system for state changes
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    // Statistics and analytics
    getStats() {
        const statusCounts = {
            total: this.videos.length,
            ready: 0,
            downloading: 0,
            converting: 0,
            completed: 0,
            error: 0
        };

        this.videos.forEach(video => {
            statusCounts[video.status] = (statusCounts[video.status] || 0) + 1;
        });

        return {
            ...statusCounts,
            selected: this.ui.selectedVideos.length,
            queueLength: this.downloadQueue.length,
            downloadStats: { ...this.downloadStats }
        };
    }

    // Update download statistics
    updateDownloadStats(stats) {
        Object.assign(this.downloadStats, stats);
        this.emit('downloadStatsUpdated', { stats: this.downloadStats });
    }

    // Keyboard navigation support
    setKeyboardNavigationActive(active) {
        this.ui.keyboardNavigationActive = active;
        if (!active) {
            this.ui.currentFocusIndex = -1;
        }
        this.emit('keyboardNavigationChanged', { active });
    }

    setCurrentFocusIndex(index) {
        this.ui.currentFocusIndex = Math.max(-1, Math.min(index, this.videos.length - 1));
        this.emit('focusIndexChanged', { index: this.ui.currentFocusIndex });
    }

    // State persistence
    toJSON() {
        return {
            videos: this.videos.map(v => v.toJSON()),
            history: this.history,
            config: this.config,
            ui: {
                ...this.ui,
                selectedVideos: this.ui.selectedVideos // Keep selected videos
            },
            downloadQueue: this.downloadQueue,
            downloadStats: this.downloadStats,
            timestamp: new Date().toISOString()
        };
    }

    // State restoration
    fromJSON(data) {
        try {
            // Restore videos
            this.videos = (data.videos || []).map(v => window.Video.fromJSON(v));

            // Restore history
            this.history = data.history || [];

            // Restore config with defaults
            this.config = {
                ...this.config,
                ...data.config
            };

            // Restore UI state with defaults
            this.ui = {
                ...this.ui,
                ...data.ui,
                keyboardNavigationActive: false, // Reset navigation state
                currentFocusIndex: -1
            };

            // Restore download queue and stats
            this.downloadQueue = data.downloadQueue || [];
            this.downloadStats = {
                ...this.downloadStats,
                ...data.downloadStats
            };

            this.emit('stateImported', { data });
            return true;
        } catch (error) {
            console.error('Failed to restore state from JSON:', error);
            return false;
        }
    }

    // Validation and cleanup
    validateState() {
        // Remove invalid videos
        this.videos = this.videos.filter(video => {
            try {
                return video instanceof window.Video && video.url;
            } catch (error) {
                console.warn('Removing invalid video:', error);
                return false;
            }
        });

        // Clean up selected videos
        const videoIds = this.videos.map(v => v.id);
        this.ui.selectedVideos = this.ui.selectedVideos.filter(id => videoIds.includes(id));

        // Clean up download queue
        this.downloadQueue = this.downloadQueue.filter(id => videoIds.includes(id));

        this.emit('stateValidated');
    }

    // Add completed video to download history
    addToHistory(video) {
        const historyEntry = {
            id: video.id,
            url: video.url,
            title: video.title,
            thumbnail: video.thumbnail,
            duration: video.duration,
            quality: video.quality,
            format: video.format,
            filename: video.filename,
            downloadedAt: new Date().toISOString()
        };

        // Add to beginning of history array
        this.history.unshift(historyEntry);

        // Keep only maxHistoryEntries
        if (this.history.length > this.config.maxHistoryEntries) {
            this.history = this.history.slice(0, this.config.maxHistoryEntries);
        }

        this.emit('historyUpdated', { entry: historyEntry });
    }

    // Get all history entries
    getHistory() {
        return this.history;
    }

    // Clear all history
    clearHistory() {
        this.history = [];
        this.emit('historyCleared');
    }

    // Remove specific history entry
    removeHistoryEntry(entryId) {
        const index = this.history.findIndex(entry => entry.id === entryId);
        if (index !== -1) {
            const removed = this.history.splice(index, 1)[0];
            this.emit('historyEntryRemoved', { entry: removed });
        }
    }

    // Reset to initial state
    reset() {
        this.videos = [];
        this.history = [];
        this.ui.selectedVideos = [];
        this.ui.currentFocusIndex = -1;
        this.downloadQueue = [];
        this.downloadStats = {
            totalDownloads: 0,
            successfulDownloads: 0,
            failedDownloads: 0,
            totalBytesDownloaded: 0
        };
        this.emit('stateReset');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = AppState;
} else {
    // Browser environment - attach to window
    window.AppState = AppState;
}