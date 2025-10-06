/**
 * @fileoverview Application state management with event system
 * @author GrabZilla Development Team
 * @version 2.1.0
 * @since 2024-01-01
 */

/**
 * APPLICATION STATE MANAGEMENT
 * 
 * Central state object managing all application data
 * 
 * Structure:
 * - videos: Array of video objects in download queue
 * - config: User preferences and settings
 * - ui: Interface state and user interactions
 * 
 * Mutation Rules:
 * - Only modify state through designated functions
 * - Emit events on state changes for UI updates
 * - Validate all state changes before applying
 */
class AppState {
    /**
     * Creates new AppState instance
     * @param {Object} config - Initial configuration
     */
    constructor() {
        this.videos = [];
        this.history = []; // Array of completed download history entries
        this.config = {
            savePath: this.getDefaultDownloadsPath(),
            defaultQuality: '1080p',
            defaultFormat: 'None',
            filenamePattern: '%(title)s.%(ext)s',
            cookieFile: null,
            maxHistoryEntries: 100 // Maximum number of history entries to keep
        };
        this.ui = {
            isDownloading: false,
            selectedVideos: [],
            sortBy: 'createdAt',
            sortOrder: 'desc'
        };
        this.listeners = new Map();
    }
    
    /**
     * Get default downloads path based on platform
     * @returns {string} Default download path for current platform
     */
    getDefaultDownloadsPath() {
        const DEFAULT_PATHS = {
            darwin: '~/Downloads/GrabZilla_Videos',
            win32: 'C:\\Users\\Admin\\Desktop\\GrabZilla_Videos',
            linux: '~/Downloads/GrabZilla_Videos'
        };
        
        if (window.electronAPI) {
            const platform = window.electronAPI.getPlatform();
            return DEFAULT_PATHS[platform] || DEFAULT_PATHS.linux;
        }
        return DEFAULT_PATHS.win32;
    }
    
    /**
     * Add video to state with validation
     * @param {Video} video - Video object to add
     * @returns {Video} Added video object
     * @throws {Error} When video is invalid or URL already exists
     */
    addVideo(video) {
        if (!(video instanceof Video)) {
            throw new Error('Invalid video object');
        }
        
        // Check for duplicate URLs
        const existingVideo = this.videos.find(v => v.url === video.url);
        if (existingVideo) {
            throw new Error('Video URL already exists in the list');
        }
        
        this.videos.push(video);
        this.emit('videoAdded', { video });
        return video;
    }
    
    /**
     * Remove video from state by ID
     * @param {string} videoId - ID of video to remove
     * @returns {Video} Removed video object
     * @throws {Error} When video not found
     */
    removeVideo(videoId) {
        const index = this.videos.findIndex(v => v.id === videoId);
        if (index === -1) {
            throw new Error('Video not found');
        }
        
        const removedVideo = this.videos.splice(index, 1)[0];
        this.emit('videoRemoved', { video: removedVideo });
        return removedVideo;
    }
    
    /**
     * Update video properties by ID
     * @param {string} videoId - ID of video to update
     * @param {Object} properties - Properties to update
     * @returns {Video} Updated video object
     * @throws {Error} When video not found
     */
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
    
    /**
     * Get video by ID
     * @param {string} videoId - Video ID to find
     * @returns {Video|undefined} Video object or undefined if not found
     */
    getVideo(videoId) {
        return this.videos.find(v => v.id === videoId);
    }
    
    /**
     * Get all videos (defensive copy)
     * @returns {Video[]} Array of all video objects
     */
    getVideos() {
        return [...this.videos];
    }
    
    /**
     * Get videos filtered by status
     * @param {string} status - Status to filter by
     * @returns {Video[]} Array of videos with matching status
     */
    getVideosByStatus(status) {
        return this.videos.filter(v => v.status === status);
    }
    
    /**
     * Clear all videos from state
     * @returns {Video[]} Array of removed videos
     */
    clearVideos() {
        const removedVideos = [...this.videos];
        this.videos = [];
        this.ui.selectedVideos = [];
        this.emit('videosCleared', { removedVideos });
        return removedVideos;
    }
    
    /**
     * Update configuration with validation
     * @param {Object} newConfig - Configuration updates
     */
    updateConfig(newConfig) {
        const oldConfig = { ...this.config };
        Object.assign(this.config, newConfig);
        this.emit('configUpdated', { config: this.config, oldConfig });
    }
    
    /**
     * Update UI state
     * @param {Object} newUIState - UI state updates
     */
    updateUI(newUIState) {
        const oldUIState = { ...this.ui };
        Object.assign(this.ui, newUIState);
        this.emit('uiUpdated', { ui: this.ui, oldUIState });
    }
    
    /**
     * Register event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback function to remove
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    /**
     * Emit event to all registered listeners
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
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
    
    /**
     * Get application statistics
     * @returns {Object} Statistics object with counts by status
     */
    getStats() {
        return {
            total: this.videos.length,
            ready: this.getVideosByStatus('ready').length,
            downloading: this.getVideosByStatus('downloading').length,
            converting: this.getVideosByStatus('converting').length,
            completed: this.getVideosByStatus('completed').length,
            error: this.getVideosByStatus('error').length
        };
    }

    /**
     * Add completed video to download history
     * @param {Video} video - Completed video to add to history
     */
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

    /**
     * Get all history entries
     * @returns {Array} Array of history entries
     */
    getHistory() {
        return this.history;
    }

    /**
     * Clear all history
     */
    clearHistory() {
        this.history = [];
        this.emit('historyCleared');
    }

    /**
     * Remove specific history entry
     * @param {string} entryId - ID of history entry to remove
     */
    removeHistoryEntry(entryId) {
        const index = this.history.findIndex(entry => entry.id === entryId);
        if (index !== -1) {
            const removed = this.history.splice(index, 1)[0];
            this.emit('historyEntryRemoved', { entry: removed });
        }
    }

    /**
     * Export state to JSON for persistence
     * @returns {Object} Serializable state object
     */
    toJSON() {
        return {
            videos: this.videos.map(v => v.toJSON()),
            history: this.history,
            config: this.config,
            ui: this.ui
        };
    }
    
    /**
     * Import state from JSON data
     * @param {Object} data - State data to import
     */
    fromJSON(data) {
        this.videos = data.videos.map(v => Video.fromJSON(v));
        this.history = data.history || [];
        this.config = { ...this.config, ...data.config };
        this.ui = { ...this.ui, ...data.ui };
        this.emit('stateImported', { data });
    }
}