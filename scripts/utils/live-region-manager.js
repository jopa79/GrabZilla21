/**
 * @fileoverview Live Region Manager for GrabZilla 2.1
 * Manages ARIA live regions for screen reader announcements
 * @author GrabZilla Development Team
 * @version 2.1.0
 * @since 2024-01-01
 */

/**
 * LIVE REGION MANAGER
 * 
 * Manages ARIA live regions for dynamic content announcements
 * 
 * Features:
 * - Multiple live regions with different politeness levels
 * - Announcement queuing and throttling
 * - Context-aware announcements
 * - Progress update announcements
 * 
 * Dependencies:
 * - None (vanilla JavaScript)
 * 
 * State Management:
 * - Tracks announcement queue
 * - Manages announcement timing
 * - Handles region cleanup
 */

class LiveRegionManager {
    constructor() {
        this.regions = new Map();
        this.announcementQueue = [];
        this.isProcessingQueue = false;
        this.lastAnnouncement = '';
        this.lastAnnouncementTime = 0;
        this.throttleDelay = 1000; // 1 second between similar announcements
        
        this.init();
    }

    /**
     * Initialize live regions
     */
    init() {
        this.createLiveRegions();
        this.setupProgressAnnouncements();
        this.setupStatusMonitoring();
        
        console.log('LiveRegionManager initialized');
    }

    /**
     * Create different types of live regions
     */
    createLiveRegions() {
        // Assertive region for important announcements
        this.createRegion('assertive', {
            'aria-live': 'assertive',
            'aria-atomic': 'true',
            'aria-relevant': 'additions text'
        });

        // Polite region for status updates
        this.createRegion('polite', {
            'aria-live': 'polite',
            'aria-atomic': 'false',
            'aria-relevant': 'additions text'
        });

        // Status region for progress updates
        this.createRegion('status', {
            'aria-live': 'polite',
            'aria-atomic': 'true',
            'aria-relevant': 'text',
            'role': 'status'
        });

        // Log region for activity logs
        this.createRegion('log', {
            'aria-live': 'polite',
            'aria-atomic': 'false',
            'aria-relevant': 'additions',
            'role': 'log'
        });
    }

    /**
     * Create a live region with specified attributes
     */
    createRegion(name, attributes) {
        const region = document.createElement('div');
        region.id = `live-region-${name}`;
        region.className = 'sr-only';
        
        // Set ARIA attributes
        Object.entries(attributes).forEach(([key, value]) => {
            region.setAttribute(key, value);
        });
        
        document.body.appendChild(region);
        this.regions.set(name, region);
        
        return region;
    }  
  /**
     * Setup progress announcement monitoring
     */
    setupProgressAnnouncements() {
        // Monitor progress changes in status badges
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    const target = mutation.target;
                    
                    if (target.classList?.contains('status-badge') || 
                        target.parentElement?.classList?.contains('status-badge')) {
                        this.handleStatusChange(target);
                    }
                }
            });
        });

        // Observe existing status badges
        document.querySelectorAll('.status-badge').forEach(badge => {
            observer.observe(badge, {
                childList: true,
                characterData: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['data-progress']
            });
        });

        // Monitor for new status badges
        const listObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const newBadges = node.querySelectorAll('.status-badge');
                        newBadges.forEach(badge => {
                            observer.observe(badge, {
                                childList: true,
                                characterData: true,
                                subtree: true,
                                attributes: true,
                                attributeFilter: ['data-progress']
                            });
                        });
                    }
                });
            });
        });

        const videoList = document.getElementById('videoList');
        if (videoList) {
            listObserver.observe(videoList, { childList: true, subtree: true });
        }
    }

    /**
     * Setup general status monitoring
     */
    setupStatusMonitoring() {
        // Monitor status message changes
        const statusMessage = document.getElementById('statusMessage');
        if (statusMessage) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' || mutation.type === 'characterData') {
                        const newText = statusMessage.textContent.trim();
                        if (newText && newText !== this.lastStatusMessage) {
                            this.announceStatus(newText);
                            this.lastStatusMessage = newText;
                        }
                    }
                });
            });

            observer.observe(statusMessage, {
                childList: true,
                characterData: true,
                subtree: true
            });
        }
    }

    /**
     * Handle status badge changes
     */
    handleStatusChange(statusElement) {
        const statusText = statusElement.textContent || statusElement.innerText;
        if (!statusText) return;

        // Get video context
        const videoItem = statusElement.closest('.video-item');
        let videoTitle = 'Video';
        
        if (videoItem) {
            const titleElement = videoItem.querySelector('.text-sm.text-white.truncate');
            if (titleElement) {
                videoTitle = titleElement.textContent.trim();
                // Truncate long titles for announcements
                if (videoTitle.length > 50) {
                    videoTitle = videoTitle.substring(0, 47) + '...';
                }
            }
        }

        // Determine announcement type based on status
        const statusLower = statusText.toLowerCase();
        let announcementType = 'status';
        
        if (statusLower.includes('error') || statusLower.includes('failed')) {
            announcementType = 'assertive';
        } else if (statusLower.includes('completed') || statusLower.includes('finished')) {
            announcementType = 'assertive';
        }

        const announcement = `${videoTitle}: ${statusText}`;
        this.announce(announcement, announcementType);
    }    /*
*
     * Make an announcement to screen readers
     */
    announce(message, regionType = 'polite', options = {}) {
        if (!message || typeof message !== 'string') return;

        const cleanMessage = message.trim();
        if (!cleanMessage) return;

        // Check for duplicate announcements
        if (this.shouldThrottleAnnouncement(cleanMessage)) {
            return;
        }

        const announcement = {
            message: cleanMessage,
            regionType,
            timestamp: Date.now(),
            priority: options.priority || 0,
            context: options.context || null
        };

        this.queueAnnouncement(announcement);
    }

    /**
     * Check if announcement should be throttled
     */
    shouldThrottleAnnouncement(message) {
        const now = Date.now();
        
        // Don't throttle if it's been long enough
        if (now - this.lastAnnouncementTime > this.throttleDelay) {
            return false;
        }

        // Don't throttle if message is different
        if (message !== this.lastAnnouncement) {
            return false;
        }

        return true;
    }

    /**
     * Queue announcement for processing
     */
    queueAnnouncement(announcement) {
        // Insert based on priority
        let insertIndex = this.announcementQueue.length;
        for (let i = 0; i < this.announcementQueue.length; i++) {
            if (this.announcementQueue[i].priority < announcement.priority) {
                insertIndex = i;
                break;
            }
        }
        
        this.announcementQueue.splice(insertIndex, 0, announcement);
        
        if (!this.isProcessingQueue) {
            this.processAnnouncementQueue();
        }
    }

    /**
     * Process queued announcements
     */
    async processAnnouncementQueue() {
        if (this.isProcessingQueue || this.announcementQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        while (this.announcementQueue.length > 0) {
            const announcement = this.announcementQueue.shift();
            await this.makeAnnouncement(announcement);
            
            // Small delay between announcements
            await this.delay(100);
        }

        this.isProcessingQueue = false;
    }

    /**
     * Make the actual announcement
     */
    async makeAnnouncement(announcement) {
        const region = this.regions.get(announcement.regionType);
        if (!region) {
            console.warn(`Live region '${announcement.regionType}' not found`);
            return;
        }

        // Clear region first for assertive announcements
        if (announcement.regionType === 'assertive') {
            region.textContent = '';
            await this.delay(50);
        }

        // Set the announcement
        region.textContent = announcement.message;
        
        // Update tracking
        this.lastAnnouncement = announcement.message;
        this.lastAnnouncementTime = announcement.timestamp;

        // Log announcement for debugging
        console.log(`[LiveRegion:${announcement.regionType}] ${announcement.message}`);
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }  
  /**
     * Announce status message
     */
    announceStatus(message) {
        this.announce(message, 'status', { priority: 1 });
    }

    /**
     * Announce progress update
     */
    announceProgress(videoTitle, status, progress) {
        let message;
        
        if (progress !== undefined && progress !== null) {
            message = `${videoTitle}: ${status} ${progress}%`;
        } else {
            message = `${videoTitle}: ${status}`;
        }
        
        this.announce(message, 'status', { 
            priority: 2,
            context: 'progress'
        });
    }

    /**
     * Announce video list changes
     */
    announceVideoListChange(action, count, videoTitle = '') {
        let message = '';
        let priority = 1;
        
        switch (action) {
            case 'added':
                message = videoTitle ? 
                    `Added ${videoTitle} to download queue` : 
                    `Added ${count} video${count !== 1 ? 's' : ''} to download queue`;
                break;
            case 'removed':
                message = videoTitle ? 
                    `Removed ${videoTitle} from download queue` : 
                    `Removed ${count} video${count !== 1 ? 's' : ''} from download queue`;
                break;
            case 'cleared':
                message = 'Download queue cleared';
                priority = 2;
                break;
            case 'reordered':
                message = `Video queue reordered`;
                break;
        }
        
        if (message) {
            this.announce(message, 'polite', { priority });
        }
    }

    /**
     * Announce error messages
     */
    announceError(message, context = '') {
        const fullMessage = context ? `${context}: ${message}` : message;
        this.announce(fullMessage, 'assertive', { priority: 3 });
    }

    /**
     * Announce success messages
     */
    announceSuccess(message) {
        this.announce(message, 'assertive', { priority: 2 });
    }

    /**
     * Announce keyboard shortcuts
     */
    announceShortcuts(shortcuts) {
        const shortcutText = shortcuts.map(s => `${s.key}: ${s.description}`).join(', ');
        this.announce(`Available shortcuts: ${shortcutText}`, 'polite');
    }

    /**
     * Clear all regions
     */
    clearAllRegions() {
        this.regions.forEach(region => {
            region.textContent = '';
        });
        
        // Clear queue
        this.announcementQueue = [];
        this.isProcessingQueue = false;
    }

    /**
     * Get region by name
     */
    getRegion(name) {
        return this.regions.get(name);
    }

    /**
     * Remove a region
     */
    removeRegion(name) {
        const region = this.regions.get(name);
        if (region && region.parentNode) {
            region.parentNode.removeChild(region);
            this.regions.delete(name);
        }
    }

    /**
     * Get live region manager instance (singleton)
     */
    static getInstance() {
        if (!LiveRegionManager.instance) {
            LiveRegionManager.instance = new LiveRegionManager();
        }
        return LiveRegionManager.instance;
    }
}

// Export for use in other modules
window.LiveRegionManager = LiveRegionManager;