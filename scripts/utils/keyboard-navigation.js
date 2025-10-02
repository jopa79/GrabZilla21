/**
 * @fileoverview Keyboard Navigation Utilities for GrabZilla 2.1
 * Handles advanced keyboard navigation patterns and focus management
 * @author GrabZilla Development Team
 * @version 2.1.0
 * @since 2024-01-01
 */

/**
 * KEYBOARD NAVIGATION UTILITIES
 * 
 * Advanced keyboard navigation for complex UI interactions
 * 
 * Features:
 * - Grid navigation for video list
 * - Tab trapping for modal dialogs
 * - Focus restoration after actions
 * - Keyboard shortcuts management
 * 
 * Dependencies:
 * - AccessibilityManager for announcements
 * 
 * State Management:
 * - Tracks navigation context
 * - Manages focus history
 * - Handles keyboard mode detection
 */

class KeyboardNavigation {
    constructor() {
        this.isKeyboardMode = false;
        this.focusHistory = [];
        this.currentContext = null;
        this.shortcuts = new Map();
        
        this.init();
    }

    /**
     * Initialize keyboard navigation
     */
    init() {
        this.setupKeyboardModeDetection();
        this.setupGlobalShortcuts();
        this.setupGridNavigation();
        this.setupFocusTrapping();
        
        console.log('KeyboardNavigation initialized');
    }

    /**
     * Detect when user is using keyboard vs mouse
     */
    setupKeyboardModeDetection() {
        // Enable keyboard mode on first tab press
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') {
                this.enableKeyboardMode();
            }
        });

        // Disable keyboard mode on mouse interaction
        document.addEventListener('mousedown', () => {
            this.disableKeyboardMode();
        });
    }

    /**
     * Enable keyboard navigation mode
     */
    enableKeyboardMode() {
        if (!this.isKeyboardMode) {
            this.isKeyboardMode = true;
            document.body.classList.add('keyboard-navigation-active');
            
            // Announce keyboard mode to screen readers
            if (window.accessibilityManager) {
                window.accessibilityManager.announcePolite('Keyboard navigation active');
            }
        }
    }

    /**
     * Disable keyboard navigation mode
     */
    disableKeyboardMode() {
        if (this.isKeyboardMode) {
            this.isKeyboardMode = false;
            document.body.classList.remove('keyboard-navigation-active');
        }
    }  
  /**
     * Setup global keyboard shortcuts
     */
    setupGlobalShortcuts() {
        // Register common shortcuts
        this.registerShortcut('Ctrl+d', () => {
            const downloadBtn = document.getElementById('downloadVideosBtn');
            if (downloadBtn && !downloadBtn.disabled) {
                downloadBtn.click();
                return true;
            }
            return false;
        }, 'Start downloads');

        this.registerShortcut('Ctrl+a', (event) => {
            // Only handle in video list context
            if (this.isInVideoList(event.target)) {
                this.selectAllVideos();
                return true;
            }
            return false;
        }, 'Select all videos');

        this.registerShortcut('Escape', () => {
            this.clearSelections();
            this.focusUrlInput();
            return true;
        }, 'Clear selections and focus URL input');

        this.registerShortcut('Ctrl+Enter', () => {
            const urlInput = document.getElementById('urlInput');
            if (urlInput && urlInput.value.trim()) {
                const addBtn = document.getElementById('addVideoBtn');
                if (addBtn) {
                    addBtn.click();
                    return true;
                }
            }
            return false;
        }, 'Add video from URL input');

        // Listen for shortcut keys
        document.addEventListener('keydown', (event) => {
            const shortcutKey = this.getShortcutKey(event);
            const handler = this.shortcuts.get(shortcutKey);
            
            if (handler && handler.callback(event)) {
                event.preventDefault();
                event.stopPropagation();
            }
        });
    }

    /**
     * Register a keyboard shortcut
     */
    registerShortcut(key, callback, description) {
        this.shortcuts.set(key, { callback, description });
    }

    /**
     * Get shortcut key string from event
     */
    getShortcutKey(event) {
        const parts = [];
        
        if (event.ctrlKey) parts.push('Ctrl');
        if (event.shiftKey) parts.push('Shift');
        if (event.altKey) parts.push('Alt');
        if (event.metaKey) parts.push('Meta');
        
        parts.push(event.key);
        
        return parts.join('+');
    }

    /**
     * Setup grid navigation for video list
     */
    setupGridNavigation() {
        const videoList = document.getElementById('videoList');
        if (!videoList) return;

        videoList.addEventListener('keydown', (event) => {
            if (!this.isKeyboardMode) return;

            const currentItem = event.target.closest('.video-item');
            if (!currentItem) return;

            switch (event.key) {
                case 'ArrowUp':
                    event.preventDefault();
                    this.navigateToVideo(currentItem, 'up');
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    this.navigateToVideo(currentItem, 'down');
                    break;
                case 'ArrowLeft':
                    event.preventDefault();
                    this.navigateWithinVideo(currentItem, 'left');
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    this.navigateWithinVideo(currentItem, 'right');
                    break;
                case 'Home':
                    event.preventDefault();
                    this.navigateToFirstVideo();
                    break;
                case 'End':
                    event.preventDefault();
                    this.navigateToLastVideo();
                    break;
            }
        });
    }    /*
*
     * Navigate between video items
     */
    navigateToVideo(currentItem, direction) {
        const videoItems = Array.from(document.querySelectorAll('.video-item'));
        const currentIndex = videoItems.indexOf(currentItem);
        
        let targetIndex;
        if (direction === 'up') {
            targetIndex = Math.max(0, currentIndex - 1);
        } else if (direction === 'down') {
            targetIndex = Math.min(videoItems.length - 1, currentIndex + 1);
        }
        
        if (targetIndex !== undefined && videoItems[targetIndex]) {
            videoItems[targetIndex].focus();
            this.scrollIntoViewIfNeeded(videoItems[targetIndex]);
        }
    }

    /**
     * Navigate within a video item (between controls)
     */
    navigateWithinVideo(videoItem, direction) {
        const focusableElements = Array.from(videoItem.querySelectorAll(
            'button, select, input, [tabindex]:not([tabindex="-1"])'
        ));
        
        const currentElement = document.activeElement;
        const currentIndex = focusableElements.indexOf(currentElement);
        
        let targetIndex;
        if (direction === 'left') {
            targetIndex = Math.max(0, currentIndex - 1);
        } else if (direction === 'right') {
            targetIndex = Math.min(focusableElements.length - 1, currentIndex + 1);
        }
        
        if (targetIndex !== undefined && focusableElements[targetIndex]) {
            focusableElements[targetIndex].focus();
        }
    }

    /**
     * Navigate to first video
     */
    navigateToFirstVideo() {
        const firstVideo = document.querySelector('.video-item');
        if (firstVideo) {
            firstVideo.focus();
            this.scrollIntoViewIfNeeded(firstVideo);
        }
    }

    /**
     * Navigate to last video
     */
    navigateToLastVideo() {
        const videoItems = document.querySelectorAll('.video-item');
        const lastVideo = videoItems[videoItems.length - 1];
        if (lastVideo) {
            lastVideo.focus();
            this.scrollIntoViewIfNeeded(lastVideo);
        }
    }

    /**
     * Scroll element into view if needed
     */
    scrollIntoViewIfNeeded(element) {
        const container = document.getElementById('videoList');
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        if (elementRect.top < containerRect.top) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (elementRect.bottom > containerRect.bottom) {
            element.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }

    /**
     * Setup focus trapping for modal dialogs
     */
    setupFocusTrapping() {
        // This will be used when modal dialogs are implemented
        this.trapFocus = (container) => {
            const focusableElements = container.querySelectorAll(
                'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            container.addEventListener('keydown', (event) => {
                if (event.key === 'Tab') {
                    if (event.shiftKey) {
                        if (document.activeElement === firstElement) {
                            event.preventDefault();
                            lastElement.focus();
                        }
                    } else {
                        if (document.activeElement === lastElement) {
                            event.preventDefault();
                            firstElement.focus();
                        }
                    }
                }
            });
            
            // Focus first element
            if (firstElement) {
                firstElement.focus();
            }
        };
    }    /*
*
     * Check if element is in video list context
     */
    isInVideoList(element) {
        return element.closest('#videoList') !== null;
    }

    /**
     * Select all videos
     */
    selectAllVideos() {
        const videoItems = document.querySelectorAll('.video-item');
        let selectedCount = 0;
        
        videoItems.forEach(item => {
            if (!item.classList.contains('selected')) {
                item.classList.add('selected');
                const checkbox = item.querySelector('.video-checkbox');
                if (checkbox) {
                    checkbox.classList.add('checked');
                    checkbox.setAttribute('aria-checked', 'true');
                }
                selectedCount++;
            }
        });
        
        if (window.accessibilityManager) {
            window.accessibilityManager.announce(`Selected all ${videoItems.length} videos`);
        }
    }

    /**
     * Clear all selections
     */
    clearSelections() {
        const selectedItems = document.querySelectorAll('.video-item.selected');
        selectedItems.forEach(item => {
            item.classList.remove('selected');
            const checkbox = item.querySelector('.video-checkbox');
            if (checkbox) {
                checkbox.classList.remove('checked');
                checkbox.setAttribute('aria-checked', 'false');
            }
        });
        
        if (selectedItems.length > 0 && window.accessibilityManager) {
            window.accessibilityManager.announce('All selections cleared');
        }
    }

    /**
     * Focus URL input
     */
    focusUrlInput() {
        const urlInput = document.getElementById('urlInput');
        if (urlInput) {
            urlInput.focus();
        }
    }

    /**
     * Save current focus for restoration
     */
    saveFocus() {
        const activeElement = document.activeElement;
        if (activeElement && activeElement !== document.body) {
            this.focusHistory.push(activeElement);
        }
    }

    /**
     * Restore previously saved focus
     */
    restoreFocus() {
        if (this.focusHistory.length > 0) {
            const elementToFocus = this.focusHistory.pop();
            if (elementToFocus && document.contains(elementToFocus)) {
                elementToFocus.focus();
                return true;
            }
        }
        return false;
    }

    /**
     * Get list of available keyboard shortcuts
     */
    getShortcutList() {
        const shortcuts = [];
        for (const [key, handler] of this.shortcuts) {
            shortcuts.push({
                key,
                description: handler.description
            });
        }
        return shortcuts;
    }

    /**
     * Announce available shortcuts
     */
    announceShortcuts() {
        const shortcuts = this.getShortcutList();
        const shortcutText = shortcuts.map(s => `${s.key}: ${s.description}`).join(', ');
        
        if (window.accessibilityManager) {
            window.accessibilityManager.announce(`Available shortcuts: ${shortcutText}`);
        }
    }

    /**
     * Get keyboard navigation instance (singleton)
     */
    static getInstance() {
        if (!KeyboardNavigation.instance) {
            KeyboardNavigation.instance = new KeyboardNavigation();
        }
        return KeyboardNavigation.instance;
    }
}

// Export for use in other modules
window.KeyboardNavigation = KeyboardNavigation;