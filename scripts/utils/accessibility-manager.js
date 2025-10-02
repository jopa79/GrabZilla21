/**
 * @fileoverview Accessibility Manager for GrabZilla 2.1
 * Handles keyboard navigation, focus management, ARIA labels, and live regions
 * @author GrabZilla Development Team
 * @version 2.1.0
 * @since 2024-01-01
 */

/**
 * ACCESSIBILITY MANAGER
 * 
 * Manages keyboard navigation, focus states, and screen reader announcements
 * 
 * Features:
 * - Full keyboard navigation for all interactive elements
 * - Focus management with visible indicators
 * - ARIA live regions for status announcements
 * - Screen reader support with proper labels
 * 
 * Dependencies:
 * - None (vanilla JavaScript)
 * 
 * State Management:
 * - Tracks current focus position
 * - Manages keyboard navigation state
 * - Handles live region announcements
 */

class AccessibilityManager {
    constructor() {
        this.focusableElements = [];
        this.currentFocusIndex = -1;
        this.liveRegion = null;
        this.statusRegion = null;
        this.keyboardNavigationEnabled = true;
        this.lastAnnouncementTime = 0;
        this.announcementThrottle = 1000; // 1 second between announcements
        
        this.init();
    }

    /**
     * Initialize accessibility features
     */
    init() {
        this.createLiveRegions();
        this.setupKeyboardNavigation();
        this.setupFocusManagement();
        this.setupARIALabels();
        this.setupStatusAnnouncements();
        
        console.log('AccessibilityManager initialized');
    }

    /**
     * Create ARIA live regions for announcements
     */
    createLiveRegions() {
        // Create assertive live region for important announcements
        this.liveRegion = document.createElement('div');
        this.liveRegion.setAttribute('aria-live', 'assertive');
        this.liveRegion.setAttribute('aria-atomic', 'true');
        this.liveRegion.setAttribute('class', 'sr-only');
        this.liveRegion.setAttribute('id', 'live-announcements');
        document.body.appendChild(this.liveRegion); 
       // Create polite live region for status updates
        this.statusRegion = document.createElement('div');
        this.statusRegion.setAttribute('aria-live', 'polite');
        this.statusRegion.setAttribute('aria-atomic', 'false');
        this.statusRegion.setAttribute('class', 'sr-only');
        this.statusRegion.setAttribute('id', 'status-announcements');
        document.body.appendChild(this.statusRegion);
    }

    /**
     * Setup keyboard navigation for all interactive elements
     */
    setupKeyboardNavigation() {
        // Define keyboard shortcuts
        const keyboardShortcuts = {
            'Tab': this.handleTabNavigation.bind(this),
            'Shift+Tab': this.handleShiftTabNavigation.bind(this),
            'Enter': this.handleEnterKey.bind(this),
            'Space': this.handleSpaceKey.bind(this),
            'Escape': this.handleEscapeKey.bind(this),
            'ArrowUp': this.handleArrowUp.bind(this),
            'ArrowDown': this.handleArrowDown.bind(this),
            'ArrowLeft': this.handleArrowLeft.bind(this),
            'ArrowRight': this.handleArrowRight.bind(this),
            'Home': this.handleHomeKey.bind(this),
            'End': this.handleEndKey.bind(this),
            'Delete': this.handleDeleteKey.bind(this),
            'Ctrl+a': this.handleSelectAll.bind(this),
            'Ctrl+d': this.handleDownloadShortcut.bind(this)
        };

        // Add global keyboard event listener
        document.addEventListener('keydown', (event) => {
            const key = this.getKeyString(event);
            
            if (keyboardShortcuts[key]) {
                const handled = keyboardShortcuts[key](event);
                if (handled) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }
        });

        // Update focusable elements when DOM changes
        this.updateFocusableElements();
        
        // Set up mutation observer to track DOM changes
        const observer = new MutationObserver(() => {
            this.updateFocusableElements();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['tabindex', 'disabled', 'aria-hidden']
        });
    }

    /**
     * Get keyboard shortcut string from event
     */
    getKeyString(event) {
        const parts = [];
        
        if (event.ctrlKey) parts.push('Ctrl');
        if (event.shiftKey) parts.push('Shift');
        if (event.altKey) parts.push('Alt');
        if (event.metaKey) parts.push('Meta');
        
        parts.push(event.key);
        
        return parts.join('+');
    }

    /**
     * Update list of focusable elements
     */
    updateFocusableElements() {
        const focusableSelectors = [
            'button:not([disabled]):not([aria-hidden="true"])',
            'input:not([disabled]):not([aria-hidden="true"])',
            'textarea:not([disabled]):not([aria-hidden="true"])',
            'select:not([disabled]):not([aria-hidden="true"])',
            '[tabindex]:not([tabindex="-1"]):not([disabled]):not([aria-hidden="true"])',
            'a[href]:not([aria-hidden="true"])'
        ].join(', ');

        this.focusableElements = Array.from(document.querySelectorAll(focusableSelectors))
            .filter(el => this.isVisible(el))
            .sort((a, b) => {
                const aIndex = parseInt(a.getAttribute('tabindex')) || 0;
                const bIndex = parseInt(b.getAttribute('tabindex')) || 0;
                return aIndex - bIndex;
            });
    }

    /**
     * Check if element is visible and focusable
     */
    isVisible(element) {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               element.offsetParent !== null;
    }

    /**
     * Setup focus management system
     */
    setupFocusManagement() {
        // Track focus changes
        document.addEventListener('focusin', (event) => {
            this.currentFocusIndex = this.focusableElements.indexOf(event.target);
            this.announceElementFocus(event.target);
        });

        // Add focus indicators to all interactive elements
        this.addFocusIndicators();
    }

    /**
     * Add visible focus indicators
     */
    addFocusIndicators() {
        const style = document.createElement('style');
        style.textContent = `
            /* Enhanced focus indicators for accessibility */
            button:focus-visible,
            input:focus-visible,
            textarea:focus-visible,
            select:focus-visible,
            [tabindex]:focus-visible {
                outline: 3px solid var(--primary-blue) !important;
                outline-offset: 2px !important;
                box-shadow: 0 0 0 1px rgba(21, 93, 252, 0.3) !important;
            }

            /* Video item focus indicators */
            .video-item:focus-within {
                outline: 2px solid var(--primary-blue) !important;
                outline-offset: 1px !important;
                background-color: rgba(21, 93, 252, 0.1) !important;
            }

            /* High contrast mode support */
            @media (prefers-contrast: high) {
                button:focus-visible,
                input:focus-visible,
                textarea:focus-visible,
                select:focus-visible,
                [tabindex]:focus-visible {
                    outline: 3px solid #ffffff !important;
                    outline-offset: 2px !important;
                }
            }
        `;
        document.head.appendChild(style);
    } 
   /**
     * Setup comprehensive ARIA labels and descriptions
     */
    setupARIALabels() {
        // Header section
        const header = document.querySelector('header');
        if (header) {
            header.setAttribute('role', 'banner');
            header.setAttribute('aria-label', 'GrabZilla application header');
        }

        // Main content area
        const main = document.querySelector('main');
        if (main) {
            main.setAttribute('role', 'main');
            main.setAttribute('aria-label', 'Video download queue');
        }

        // Input section
        const inputSection = document.querySelector('section');
        if (inputSection) {
            inputSection.setAttribute('role', 'region');
            inputSection.setAttribute('aria-label', 'Video URL input and configuration');
        }

        // Control panel
        const footer = document.querySelector('footer');
        if (footer) {
            footer.setAttribute('role', 'contentinfo');
            footer.setAttribute('aria-label', 'Download controls and actions');
        }

        // Video list table
        const videoList = document.getElementById('videoList');
        if (videoList) {
            videoList.setAttribute('role', 'grid');
            videoList.setAttribute('aria-label', 'Video download queue');
            videoList.setAttribute('aria-describedby', 'video-list-description');
            
            // Add description for video list
            const description = document.createElement('div');
            description.id = 'video-list-description';
            description.className = 'sr-only';
            description.textContent = 'Use arrow keys to navigate between videos, Enter to select, Space to toggle selection, Delete to remove videos';
            videoList.parentNode.insertBefore(description, videoList);
        }

        // Setup video item ARIA labels
        this.setupVideoItemARIA();
        
        // Setup button ARIA labels
        this.setupButtonARIA();
        
        // Setup form control ARIA labels
        this.setupFormControlARIA();
    }

    /**
     * Setup ARIA labels for video items
     */
    setupVideoItemARIA() {
        const videoItems = document.querySelectorAll('.video-item');
        videoItems.forEach((item, index) => {
            item.setAttribute('role', 'gridcell');
            item.setAttribute('tabindex', '0');
            item.setAttribute('aria-rowindex', index + 1);
            item.setAttribute('aria-describedby', `video-${index}-description`);
            
            // Create description for each video
            const title = item.querySelector('.text-sm.text-white.truncate')?.textContent || 'Unknown video';
            const duration = item.querySelector('.text-sm.text-\\[\\#cad5e2\\]')?.textContent || 'Unknown duration';
            const status = item.querySelector('.status-badge')?.textContent || 'Unknown status';
            
            const description = document.createElement('div');
            description.id = `video-${index}-description`;
            description.className = 'sr-only';
            description.textContent = `Video: ${title}, Duration: ${duration}, Status: ${status}`;
            item.appendChild(description);
        });
    }

    /**
     * Setup ARIA labels for buttons
     */
    setupButtonARIA() {
        const buttonLabels = {
            'addVideoBtn': 'Add video from URL input to download queue',
            'importUrlsBtn': 'Import multiple URLs from file',
            'savePathBtn': 'Select directory for downloaded videos',
            'cookieFileBtn': 'Select cookie file for authentication',
            'clearListBtn': 'Remove all videos from download queue',
            'updateDepsBtn': 'Update yt-dlp and ffmpeg to latest versions',
            'cancelDownloadsBtn': 'Cancel all active downloads',
            'downloadVideosBtn': 'Start downloading all videos in queue'
        };

        Object.entries(buttonLabels).forEach(([id, label]) => {
            const button = document.getElementById(id);
            if (button) {
                button.setAttribute('aria-label', label);
                
                // Add keyboard shortcut hints
                if (id === 'downloadVideosBtn') {
                    button.setAttribute('aria-keyshortcuts', 'Ctrl+d');
                }
            }
        });
    }

    /**
     * Setup ARIA labels for form controls
     */
    setupFormControlARIA() {
        // URL input
        const urlInput = document.getElementById('urlInput');
        if (urlInput) {
            urlInput.setAttribute('aria-describedby', 'url-help url-instructions');
            
            const instructions = document.createElement('div');
            instructions.id = 'url-instructions';
            instructions.className = 'sr-only';
            instructions.textContent = 'Enter YouTube or Vimeo URLs, one per line. Press Ctrl+Enter to add videos quickly.';
            urlInput.parentNode.appendChild(instructions);
        }

        // Quality and format dropdowns
        const defaultQuality = document.getElementById('defaultQuality');
        if (defaultQuality) {
            defaultQuality.setAttribute('aria-describedby', 'quality-help');
            
            const qualityHelp = document.createElement('div');
            qualityHelp.id = 'quality-help';
            qualityHelp.className = 'sr-only';
            qualityHelp.textContent = 'Default video quality for new downloads. Can be changed per video.';
            defaultQuality.parentNode.appendChild(qualityHelp);
        }

        const defaultFormat = document.getElementById('defaultFormat');
        if (defaultFormat) {
            defaultFormat.setAttribute('aria-describedby', 'format-help');
            
            const formatHelp = document.createElement('div');
            formatHelp.id = 'format-help';
            formatHelp.className = 'sr-only';
            formatHelp.textContent = 'Default conversion format. None means no conversion, Audio only extracts audio.';
            defaultFormat.parentNode.appendChild(formatHelp);
        }

        // Filename pattern
        const filenamePattern = document.getElementById('filenamePattern');
        if (filenamePattern) {
            filenamePattern.setAttribute('aria-label', 'Filename pattern for downloaded videos');
            filenamePattern.setAttribute('aria-describedby', 'filename-help');
            
            const filenameHelp = document.createElement('div');
            filenameHelp.id = 'filename-help';
            filenameHelp.className = 'sr-only';
            filenameHelp.textContent = 'Pattern for naming downloaded files. %(title)s uses video title, %(ext)s uses file extension.';
            filenamePattern.parentNode.appendChild(filenameHelp);
        }
    } 
   /**
     * Setup status announcements for download progress
     */
    setupStatusAnnouncements() {
        // Monitor status changes in video items
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    const target = mutation.target;
                    if (target.classList?.contains('status-badge') || 
                        target.parentElement?.classList?.contains('status-badge')) {
                        this.announceStatusChange(target);
                    }
                }
            });
        });

        // Observe status badge changes
        const statusBadges = document.querySelectorAll('.status-badge');
        statusBadges.forEach(badge => {
            observer.observe(badge, {
                childList: true,
                characterData: true,
                subtree: true
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
                                subtree: true
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
     * Keyboard navigation handlers
     */
    handleTabNavigation(event) {
        // Let default tab behavior work, but update our tracking
        setTimeout(() => {
            this.updateFocusableElements();
            this.currentFocusIndex = this.focusableElements.indexOf(document.activeElement);
        }, 0);
        return false; // Don't prevent default
    }

    handleShiftTabNavigation(event) {
        // Let default shift+tab behavior work
        setTimeout(() => {
            this.updateFocusableElements();
            this.currentFocusIndex = this.focusableElements.indexOf(document.activeElement);
        }, 0);
        return false; // Don't prevent default
    }

    handleEnterKey(event) {
        const activeElement = document.activeElement;
        
        // Handle video item selection
        if (activeElement.classList.contains('video-item')) {
            this.toggleVideoSelection(activeElement);
            return true;
        }
        
        // Handle button activation
        if (activeElement.tagName === 'BUTTON') {
            activeElement.click();
            return true;
        }
        
        return false;
    }    ha
ndleSpaceKey(event) {
        const activeElement = document.activeElement;
        
        // Handle video item selection toggle
        if (activeElement.classList.contains('video-item')) {
            this.toggleVideoSelection(activeElement);
            return true;
        }
        
        // Handle button activation for buttons that don't have default space behavior
        if (activeElement.tagName === 'BUTTON' && !activeElement.type) {
            activeElement.click();
            return true;
        }
        
        return false;
    }

    handleEscapeKey(event) {
        // Clear all selections
        this.clearAllSelections();
        
        // Focus the URL input
        const urlInput = document.getElementById('urlInput');
        if (urlInput) {
            urlInput.focus();
        }
        
        this.announce('Selections cleared, focus moved to URL input');
        return true;
    }

    handleArrowUp(event) {
        const activeElement = document.activeElement;
        
        // Navigate between video items
        if (activeElement.classList.contains('video-item')) {
            const videoItems = Array.from(document.querySelectorAll('.video-item'));
            const currentIndex = videoItems.indexOf(activeElement);
            
            if (currentIndex > 0) {
                videoItems[currentIndex - 1].focus();
                return true;
            }
        }
        
        return false;
    }

    handleArrowDown(event) {
        const activeElement = document.activeElement;
        
        // Navigate between video items
        if (activeElement.classList.contains('video-item')) {
            const videoItems = Array.from(document.querySelectorAll('.video-item'));
            const currentIndex = videoItems.indexOf(activeElement);
            
            if (currentIndex < videoItems.length - 1) {
                videoItems[currentIndex + 1].focus();
                return true;
            }
        }
        
        return false;
    }

    handleArrowLeft(event) {
        const activeElement = document.activeElement;
        
        // Navigate between controls within a video item
        if (activeElement.closest('.video-item')) {
            const videoItem = activeElement.closest('.video-item');
            const controls = Array.from(videoItem.querySelectorAll('button, select'));
            const currentIndex = controls.indexOf(activeElement);
            
            if (currentIndex > 0) {
                controls[currentIndex - 1].focus();
                return true;
            }
        }
        
        return false;
    }

    handleArrowRight(event) {
        const activeElement = document.activeElement;
        
        // Navigate between controls within a video item
        if (activeElement.closest('.video-item')) {
            const videoItem = activeElement.closest('.video-item');
            const controls = Array.from(videoItem.querySelectorAll('button, select'));
            const currentIndex = controls.indexOf(activeElement);
            
            if (currentIndex < controls.length - 1) {
                controls[currentIndex + 1].focus();
                return true;
            }
        }
        
        return false;
    }    handl
eHomeKey(event) {
        const videoItems = document.querySelectorAll('.video-item');
        if (videoItems.length > 0) {
            videoItems[0].focus();
            return true;
        }
        return false;
    }

    handleEndKey(event) {
        const videoItems = document.querySelectorAll('.video-item');
        if (videoItems.length > 0) {
            videoItems[videoItems.length - 1].focus();
            return true;
        }
        return false;
    }

    handleDeleteKey(event) {
        const activeElement = document.activeElement;
        
        // Delete focused video item
        if (activeElement.classList.contains('video-item')) {
            const videoId = activeElement.getAttribute('data-video-id');
            if (videoId && window.videoManager) {
                window.videoManager.removeVideo(videoId);
                this.announce('Video removed from queue');
                return true;
            }
        }
        
        return false;
    }

    handleSelectAll(event) {
        const videoItems = document.querySelectorAll('.video-item');
        videoItems.forEach(item => {
            item.classList.add('selected');
            const checkbox = item.querySelector('.video-checkbox');
            if (checkbox) {
                checkbox.classList.add('checked');
            }
        });
        
        this.announce(`All ${videoItems.length} videos selected`);
        return true;
    }

    handleDownloadShortcut(event) {
        const downloadBtn = document.getElementById('downloadVideosBtn');
        if (downloadBtn && !downloadBtn.disabled) {
            downloadBtn.click();
            return true;
        }
        return false;
    }

    /**
     * Toggle video selection state
     */
    toggleVideoSelection(videoItem) {
        const isSelected = videoItem.classList.contains('selected');
        
        if (isSelected) {
            videoItem.classList.remove('selected');
            const checkbox = videoItem.querySelector('.video-checkbox');
            if (checkbox) {
                checkbox.classList.remove('checked');
            }
            this.announce('Video deselected');
        } else {
            videoItem.classList.add('selected');
            const checkbox = videoItem.querySelector('.video-checkbox');
            if (checkbox) {
                checkbox.classList.add('checked');
            }
            this.announce('Video selected');
        }
    }

    /**
     * Clear all video selections
     */
    clearAllSelections() {
        const selectedItems = document.querySelectorAll('.video-item.selected');
        selectedItems.forEach(item => {
            item.classList.remove('selected');
            const checkbox = item.querySelector('.video-checkbox');
            if (checkbox) {
                checkbox.classList.remove('checked');
            }
        });
    }

    /**
     * Announce element focus for screen readers
     */
    announceElementFocus(element) {
        if (!element) return;
        
        let announcement = '';
        
        // Get element description
        if (element.getAttribute('aria-label')) {
            announcement = element.getAttribute('aria-label');
        } else if (element.getAttribute('aria-labelledby')) {
            const labelId = element.getAttribute('aria-labelledby');
            const labelElement = document.getElementById(labelId);
            if (labelElement) {
                announcement = labelElement.textContent;
            }
        } else if (element.textContent) {
            announcement = element.textContent.trim();
        }
        
        // Add element type context
        const tagName = element.tagName.toLowerCase();
        if (tagName === 'button') {
            announcement += ', button';
        } else if (tagName === 'select') {
            announcement += ', dropdown menu';
        } else if (tagName === 'input') {
            announcement += ', input field';
        } else if (tagName === 'textarea') {
            announcement += ', text area';
        }
        
        // Add state information
        if (element.disabled) {
            announcement += ', disabled';
        }
        
        if (element.getAttribute('aria-expanded')) {
            const expanded = element.getAttribute('aria-expanded') === 'true';
            announcement += expanded ? ', expanded' : ', collapsed';
        }
        
        // Throttle announcements to avoid spam
        const now = Date.now();
        if (now - this.lastAnnouncementTime > 500) {
            this.announcePolite(announcement);
            this.lastAnnouncementTime = now;
        }
    }

    /**
     * Announce status changes
     */
    announceStatusChange(statusElement) {
        const statusText = statusElement.textContent || statusElement.innerText;
        if (!statusText) return;
        
        // Find the video title for context
        const videoItem = statusElement.closest('.video-item');
        let videoTitle = 'Video';
        
        if (videoItem) {
            const titleElement = videoItem.querySelector('.text-sm.text-white.truncate');
            if (titleElement) {
                videoTitle = titleElement.textContent.trim();
            }
        }
        
        const announcement = `${videoTitle}: ${statusText}`;
        this.announcePolite(announcement);
    }

    /**
     * Make assertive announcement (interrupts screen reader)
     */
    announce(message) {
        if (!message || !this.liveRegion) return;
        
        // Clear and set new message
        this.liveRegion.textContent = '';
        setTimeout(() => {
            this.liveRegion.textContent = message;
        }, 100);
    }

    /**
     * Make polite announcement (waits for screen reader to finish)
     */
    announcePolite(message) {
        if (!message || !this.statusRegion) return;
        
        // Throttle announcements
        const now = Date.now();
        if (now - this.lastAnnouncementTime < this.announcementThrottle) {
            return;
        }
        
        this.statusRegion.textContent = message;
        this.lastAnnouncementTime = now;
    }   
 /**
     * Update video item accessibility when new videos are added
     */
    updateVideoItemAccessibility(videoItem, index) {
        if (!videoItem) return;
        
        videoItem.setAttribute('role', 'gridcell');
        videoItem.setAttribute('tabindex', '0');
        videoItem.setAttribute('aria-rowindex', index + 1);
        
        // Add keyboard event handlers
        videoItem.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.toggleVideoSelection(videoItem);
            }
        });
        
        // Update ARIA description
        const title = videoItem.querySelector('.text-sm.text-white.truncate')?.textContent || 'Unknown video';
        const duration = videoItem.querySelector('.text-sm.text-\\[\\#cad5e2\\]')?.textContent || 'Unknown duration';
        const status = videoItem.querySelector('.status-badge')?.textContent || 'Unknown status';
        
        let description = videoItem.querySelector(`#video-${index}-description`);
        if (!description) {
            description = document.createElement('div');
            description.id = `video-${index}-description`;
            description.className = 'sr-only';
            videoItem.appendChild(description);
        }
        
        description.textContent = `Video: ${title}, Duration: ${duration}, Status: ${status}. Press Enter or Space to select, Delete to remove.`;
        videoItem.setAttribute('aria-describedby', `video-${index}-description`);
        
        // Setup dropdown accessibility
        const qualitySelect = videoItem.querySelector('select');
        const formatSelect = videoItem.querySelectorAll('select')[1];
        
        if (qualitySelect) {
            qualitySelect.setAttribute('aria-label', `Quality for ${title}`);
        }
        
        if (formatSelect) {
            formatSelect.setAttribute('aria-label', `Format for ${title}`);
        }
        
        // Setup checkbox accessibility
        const checkbox = videoItem.querySelector('.video-checkbox');
        if (checkbox) {
            checkbox.setAttribute('role', 'checkbox');
            checkbox.setAttribute('aria-checked', 'false');
            checkbox.setAttribute('aria-label', `Select ${title}`);
            checkbox.setAttribute('tabindex', '0');
            
            checkbox.addEventListener('click', () => {
                this.toggleVideoSelection(videoItem);
            });
            
            checkbox.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.toggleVideoSelection(videoItem);
                }
            });
        }
    }

    /**
     * Announce download progress updates
     */
    announceProgress(videoTitle, status, progress) {
        if (progress !== undefined) {
            const message = `${videoTitle}: ${status} ${progress}%`;
            this.announcePolite(message);
        } else {
            const message = `${videoTitle}: ${status}`;
            this.announcePolite(message);
        }
    }

    /**
     * Announce when videos are added or removed
     */
    announceVideoListChange(action, count, videoTitle = '') {
        let message = '';
        
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
                break;
        }
        
        if (message) {
            this.announce(message);
        }
    }

    /**
     * Get accessibility manager instance (singleton)
     */
    static getInstance() {
        if (!AccessibilityManager.instance) {
            AccessibilityManager.instance = new AccessibilityManager();
        }
        return AccessibilityManager.instance;
    }
}

// Export for use in other modules
window.AccessibilityManager = AccessibilityManager;