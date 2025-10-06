// GrabZilla 2.1 - Application Entry Point
// Modular architecture with clear separation of concerns

class GrabZillaApp {
    constructor() {
        this.state = null;
        this.eventBus = null;
        this.initialized = false;
        this.modules = new Map();
    }

    // Initialize the application
    async init() {
        try {
            console.log('🚀 Initializing GrabZilla 2.1...');

            // Initialize event bus
            this.eventBus = window.eventBus;
            if (!this.eventBus) {
                throw new Error('EventBus not available');
            }

            // Initialize application state
            this.state = new window.AppState();
            if (!this.state) {
                throw new Error('AppState not available');
            }

            // Expose state globally for Video model to access current defaults
            window.appState = this.state;

            // Set up error handling
            this.setupErrorHandling();

            // Initialize UI components
            await this.initializeUI();

            // Set up event listeners
            this.setupEventListeners();

            // Load saved state if available
            await this.loadState();

            // Ensure save directory exists
            await this.ensureSaveDirectoryExists();

            // Check binary status and validate
            await this.checkAndValidateBinaries();

            // Initialize keyboard navigation
            this.initializeKeyboardNavigation();

            this.initialized = true;
            console.log('✅ GrabZilla 2.1 initialized successfully');

            // Notify that the app is ready
            this.eventBus.emit('app:ready', { app: this });

        } catch (error) {
            console.error('❌ Failed to initialize GrabZilla:', error);
            this.handleInitializationError(error);
        }
    }

    // Set up global error handling
    setupErrorHandling() {
        // Handle unhandled errors
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.eventBus.emit('app:error', {
                type: 'global',
                error: event.error,
                filename: event.filename,
                lineno: event.lineno
            });
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.eventBus.emit('app:error', {
                type: 'promise',
                error: event.reason
            });
        });

        // Listen for application errors
        this.eventBus.on('app:error', (errorData) => {
            // Handle errors appropriately
            this.displayError(errorData);
        });
    }

    // Initialize UI components
    async initializeUI() {
        // Update save path display
        this.updateSavePathDisplay();

        // Initialize dropdown values
        this.initializeDropdowns();

        // Set up video list
        this.initializeVideoList();

        // Set up status display
        this.updateStatusMessage('Ready to download videos');
    }

    // Set up main event listeners
    setupEventListeners() {
        // State change listeners
        this.state.on('videoAdded', (data) => this.onVideoAdded(data));
        this.state.on('videoRemoved', (data) => this.onVideoRemoved(data));
        this.state.on('videoUpdated', (data) => this.onVideoUpdated(data));
        this.state.on('videosReordered', (data) => this.onVideosReordered(data));
        this.state.on('videosCleared', (data) => this.onVideosCleared(data));
        this.state.on('configUpdated', (data) => this.onConfigUpdated(data));
        this.state.on('videoSelectionChanged', (data) => this.onVideoSelectionChanged(data));

        // UI event listeners
        this.setupButtonEventListeners();
        this.setupInputEventListeners();
        this.setupVideoListEventListeners();
    }

    // Set up button event listeners
    setupButtonEventListeners() {
        // Add Video button
        const addVideoBtn = document.getElementById('addVideoBtn');
        if (addVideoBtn) {
            addVideoBtn.addEventListener('click', () => this.handleAddVideo());
        }

        // Import URLs button
        const importUrlsBtn = document.getElementById('importUrlsBtn');
        if (importUrlsBtn) {
            importUrlsBtn.addEventListener('click', () => this.handleImportUrls());
        }

        // Save Path button
        const savePathBtn = document.getElementById('savePathBtn');
        if (savePathBtn) {
            savePathBtn.addEventListener('click', () => this.handleSelectSavePath());
        }

        // Note: Cookie file and save path buttons removed from main panel,
        // now only accessible via Settings modal

        // Clipboard monitoring toggle
        const clipboardToggle = document.getElementById('clipboardMonitorToggle');
        if (clipboardToggle) {
            clipboardToggle.addEventListener('change', (e) => this.handleClipboardToggle(e.target.checked));
        }

        // Control panel buttons
        const clearListBtn = document.getElementById('clearListBtn');
        if (clearListBtn) {
            clearListBtn.addEventListener('click', () => this.handleClearList());
        }

        const downloadVideosBtn = document.getElementById('downloadVideosBtn');
        if (downloadVideosBtn) {
            downloadVideosBtn.addEventListener('click', () => this.handleDownloadVideos());
        }

        const cancelDownloadsBtn = document.getElementById('cancelDownloadsBtn');
        if (cancelDownloadsBtn) {
            cancelDownloadsBtn.addEventListener('click', () => this.handleCancelDownloads());
        }

        const updateDepsBtn = document.getElementById('updateDepsBtn');
        if (updateDepsBtn) {
            updateDepsBtn.addEventListener('click', () => this.handleUpdateDependencies());
        }

        const exportListBtn = document.getElementById('exportListBtn');
        if (exportListBtn) {
            exportListBtn.addEventListener('click', () => this.handleExportList());
        }

        const importListBtn = document.getElementById('importListBtn');
        if (importListBtn) {
            importListBtn.addEventListener('click', () => this.handleImportList());
        }

        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettingsModal());
        }

        const settingsBtn2 = document.getElementById('settingsBtn2');
        if (settingsBtn2) {
            settingsBtn2.addEventListener('click', () => this.showSettingsModal());
        }

        const showHistoryBtn = document.getElementById('showHistoryBtn');
        if (showHistoryBtn) {
            showHistoryBtn.addEventListener('click', () => this.showHistoryModal());
        }
    }

    // Set up input event listeners
    setupInputEventListeners() {
        // URL input - no paste handler needed, user clicks "Add Video" button
        const urlInput = document.getElementById('urlInput');
        if (urlInput) {
            // Optional: could add real-time validation feedback here
        }

        // Configuration inputs
        const defaultQuality = document.getElementById('defaultQuality');
        if (defaultQuality) {
            defaultQuality.addEventListener('change', (e) => {
                const newValue = e.target.value;
                this.state.updateConfig({ defaultQuality: newValue });

                // Ask if user wants to update existing videos
                this.promptUpdateExistingVideos('quality', newValue);
            });
        }

        const defaultFormat = document.getElementById('defaultFormat');
        if (defaultFormat) {
            defaultFormat.addEventListener('change', (e) => {
                const newValue = e.target.value;
                this.state.updateConfig({ defaultFormat: newValue });

                // Ask if user wants to update existing videos
                this.promptUpdateExistingVideos('format', newValue);
            });
        }
    }

    // Set up video list event listeners
    setupVideoListEventListeners() {
        const videoList = document.getElementById('videoList');
        if (videoList) {
            videoList.addEventListener('click', (e) => this.handleVideoListClick(e));
            videoList.addEventListener('change', (e) => this.handleVideoListChange(e));
            this.setupDragAndDrop(videoList);
        }
    }

    // Set up drag-and-drop reordering
    setupDragAndDrop(videoList) {
        let draggedElement = null;
        let draggedVideoId = null;

        videoList.addEventListener('dragstart', (e) => {
            const videoItem = e.target.closest('.video-item');
            if (!videoItem) return;

            draggedElement = videoItem;
            draggedVideoId = videoItem.dataset.videoId;

            videoItem.classList.add('opacity-50');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', videoItem.innerHTML);
        });

        videoList.addEventListener('dragover', (e) => {
            e.preventDefault();
            const videoItem = e.target.closest('.video-item');
            if (!videoItem || videoItem === draggedElement) return;

            e.dataTransfer.dropEffect = 'move';

            // Visual feedback - show where it will drop
            const rect = videoItem.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;

            if (e.clientY < midpoint) {
                videoItem.classList.add('border-t-2', 'border-[#155dfc]');
                videoItem.classList.remove('border-b-2');
            } else {
                videoItem.classList.add('border-b-2', 'border-[#155dfc]');
                videoItem.classList.remove('border-t-2');
            }
        });

        videoList.addEventListener('dragleave', (e) => {
            const videoItem = e.target.closest('.video-item');
            if (videoItem) {
                videoItem.classList.remove('border-t-2', 'border-b-2', 'border-[#155dfc]');
            }
        });

        videoList.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetItem = e.target.closest('.video-item');
            if (!targetItem || !draggedVideoId) return;

            const targetVideoId = targetItem.dataset.videoId;

            // Calculate drop position
            const rect = targetItem.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            const dropBefore = e.clientY < midpoint;

            // Reorder in state
            this.handleVideoReorder(draggedVideoId, targetVideoId, dropBefore);

            // Clean up visual feedback
            targetItem.classList.remove('border-t-2', 'border-b-2', 'border-[#155dfc]');
        });

        videoList.addEventListener('dragend', (e) => {
            const videoItem = e.target.closest('.video-item');
            if (videoItem) {
                videoItem.classList.remove('opacity-50');
            }

            // Clean up all visual feedback
            document.querySelectorAll('.video-item').forEach(item => {
                item.classList.remove('border-t-2', 'border-b-2', 'border-[#155dfc]');
            });

            draggedElement = null;
            draggedVideoId = null;
        });
    }

    handleVideoReorder(draggedId, targetId, insertBefore) {
        const videos = this.state.getVideos();
        const draggedIndex = videos.findIndex(v => v.id === draggedId);
        const targetIndex = videos.findIndex(v => v.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        let newIndex = targetIndex;
        if (draggedIndex < targetIndex && !insertBefore) {
            newIndex = targetIndex;
        } else if (draggedIndex > targetIndex && insertBefore) {
            newIndex = targetIndex;
        } else if (insertBefore) {
            newIndex = targetIndex;
        } else {
            newIndex = targetIndex + 1;
        }

        this.state.reorderVideos(draggedIndex, newIndex);
    }

    // Handle clicks in video list (checkboxes, delete buttons)
    handleVideoListClick(event) {
        const target = event.target;
        const videoItem = target.closest('.video-item');
        if (!videoItem) return;

        const videoId = videoItem.dataset.videoId;
        if (!videoId) return;

        // Handle checkbox click
        if (target.closest('.video-checkbox')) {
            event.preventDefault();
            this.toggleVideoSelection(videoId);
            return;
        }

        // Handle thumbnail click (preview)
        if (target.closest('.video-thumbnail-container')) {
            event.preventDefault();
            const previewUrl = target.closest('.video-thumbnail-container').dataset.previewUrl;
            if (previewUrl) {
                this.showVideoPreview(videoId, previewUrl);
            }
            return;
        }

        // Handle delete button click
        if (target.closest('.delete-video-btn')) {
            event.preventDefault();
            this.handleRemoveVideo(videoId);
            return;
        }

        // Handle pause/resume button click
        if (target.closest('.pause-resume-btn')) {
            event.preventDefault();
            const btn = target.closest('.pause-resume-btn');
            const action = btn.dataset.action;
            if (action === 'pause') {
                this.handlePauseDownload(videoId);
            } else if (action === 'resume') {
                this.handleResumeDownload(videoId);
            }
            return;
        }
    }

    // Handle dropdown changes in video list (quality, format)
    handleVideoListChange(event) {
        const target = event.target;
        const videoItem = target.closest('.video-item');
        if (!videoItem) return;

        const videoId = videoItem.dataset.videoId;
        if (!videoId) return;

        // Handle quality dropdown change
        if (target.classList.contains('quality-select')) {
            const quality = target.value;
            this.state.updateVideo(videoId, { quality });
            console.log(`Updated video ${videoId} quality to ${quality}`);
            return;
        }

        // Handle format dropdown change
        if (target.classList.contains('format-select')) {
            const format = target.value;
            this.state.updateVideo(videoId, { format });
            console.log(`Updated video ${videoId} format to ${format}`);
            return;
        }
    }

    // Toggle video selection
    toggleVideoSelection(videoId) {
        this.state.toggleVideoSelection(videoId);
        this.updateVideoCheckbox(videoId);
    }

    // Update checkbox visual state
    updateVideoCheckbox(videoId) {
        const videoItem = document.querySelector(`[data-video-id="${videoId}"]`);
        if (!videoItem) return;

        const checkbox = videoItem.querySelector('.video-checkbox');
        if (!checkbox) return;

        const isSelected = this.state.ui.selectedVideos.includes(videoId);
        checkbox.setAttribute('aria-checked', isSelected ? 'true' : 'false');

        // Update checkbox SVG
        const svg = checkbox.querySelector('svg');
        if (svg) {
            if (isSelected) {
                svg.innerHTML = `<rect x="3" y="3" width="10" height="10" stroke="currentColor" stroke-width="1.5" fill="currentColor" rx="2" />
                                 <path d="M5 8L7 10L11 6" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
            } else {
                svg.innerHTML = `<rect x="3" y="3" width="10" height="10" stroke="currentColor" stroke-width="1.5" fill="none" rx="2" />`;
            }
        }
    }

    // Remove video from list
    handleRemoveVideo(videoId) {
        try {
            const video = this.state.getVideo(videoId);
            if (video && confirm(`Remove "${video.getDisplayName()}"?`)) {
                this.state.removeVideo(videoId);
                this.updateStatusMessage('Video removed');
            }
        } catch (error) {
            console.error('Error removing video:', error);
            this.showError(`Failed to remove video: ${error.message}`);
        }
    }

    /**
     * Check for duplicate URLs in the list
     * @param {string[]} urls - URLs to check
     * @returns {Object} Object with unique and duplicate URLs
     */
    checkForDuplicates(urls) {
        const unique = [];
        const duplicates = [];

        for (const url of urls) {
            const normalizedUrl = window.URLValidator ? window.URLValidator.normalizeUrl(url) : url;
            const existingVideo = this.state.videos.find(v => v.getNormalizedUrl() === normalizedUrl);

            if (existingVideo) {
                duplicates.push({
                    url,
                    existingVideo
                });
            } else {
                unique.push(url);
            }
        }

        return { unique, duplicates };
    }

    /**
     * Show dialog for handling duplicate URLs
     * @param {Object} duplicateInfo - Info about duplicates
     * @returns {Promise<string>} Action: 'skip', 'replace', 'keep-both', or null (cancel)
     */
    async handleDuplicateUrls(duplicateInfo) {
        const duplicateCount = duplicateInfo.duplicates.length;
        const uniqueCount = duplicateInfo.unique.length;

        // Show titles of duplicate videos
        const duplicateTitles = duplicateInfo.duplicates
            .map(dup => `• ${dup.existingVideo.title}`)
            .slice(0, 5) // Show max 5
            .join('\n');

        const moreText = duplicateCount > 5 ? `\n... and ${duplicateCount - 5} more` : '';

        const message =
            `Found ${duplicateCount} duplicate URL(s):\n\n` +
            duplicateTitles + moreText + '\n\n' +
            `Choose an action:\n\n` +
            `1. SKIP duplicates (add ${uniqueCount} new video(s) only)\n` +
            `2. REPLACE existing videos with new ones\n` +
            `3. KEEP BOTH (add duplicates again)\n\n` +
            `Enter 1, 2, or 3:`;

        const choice = prompt(message);

        if (choice === '1') {
            return 'skip';
        } else if (choice === '2') {
            return 'replace';
        } else if (choice === '3') {
            return 'keep-both';
        } else {
            return null; // Cancel
        }
    }

    /**
     * Handle playlist URL - show modal with all videos
     * @param {string} playlistUrl - YouTube playlist URL
     */
    async handlePlaylistUrl(playlistUrl) {
        try {
            this.updateStatusMessage('Extracting playlist...');

            const result = await window.electronAPI.extractPlaylistVideos(playlistUrl);

            if (!result.success) {
                this.showError('Failed to extract playlist');
                return;
            }

            this.showPlaylistModal(result);
        } catch (error) {
            console.error('Error handling playlist:', error);
            this.showError(`Playlist extraction failed: ${error.message}`);
        }
    }

    /**
     * Show playlist modal with video list
     * @param {Object} playlistData - Playlist data from extraction
     */
    showPlaylistModal(playlistData) {
        const modal = document.getElementById('playlistModal');
        const title = document.getElementById('playlistTitle');
        const info = document.getElementById('playlistInfo');
        const videoList = document.getElementById('playlistVideoList');

        if (!modal || !title || !info || !videoList) return;

        // Update modal content
        title.textContent = `Playlist (${playlistData.videoCount} videos)`;
        info.textContent = `${playlistData.videoCount} video(s) found in this playlist`;

        // Clear previous video list
        videoList.innerHTML = '';

        // Store playlist videos for later use
        this.currentPlaylistVideos = playlistData.videos;

        // Create checkbox for each video
        playlistData.videos.forEach((video, index) => {
            const videoItem = document.createElement('label');
            videoItem.className = 'flex items-center gap-3 p-2 hover:bg-[#45556c]/30 rounded cursor-pointer';
            videoItem.innerHTML = `
                <input type="checkbox" class="playlist-video-checkbox w-4 h-4" data-index="${index}" checked>
                <img src="${video.thumbnail || 'assets/icons/video-placeholder.svg'}" alt="" class="w-16 h-12 object-cover rounded">
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-white truncate">${video.title}</p>
                    <p class="text-xs text-[#90a1b9]">${video.duration ? this.formatDuration(video.duration) : 'Unknown duration'}</p>
                </div>
            `;
            videoList.appendChild(videoItem);
        });

        // Setup modal event listeners
        this.setupPlaylistModalListeners();

        // Show modal
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    /**
     * Setup event listeners for playlist modal
     */
    setupPlaylistModalListeners() {
        const modal = document.getElementById('playlistModal');
        const closeBtn = document.getElementById('closePlaylistModal');
        const cancelBtn = document.getElementById('cancelPlaylistBtn');
        const downloadBtn = document.getElementById('downloadSelectedPlaylistBtn');
        const selectAllCheckbox = document.getElementById('selectAllPlaylistVideos');

        // Close modal handlers
        const closeModal = () => {
            modal.classList.remove('flex');
            modal.classList.add('hidden');
            this.currentPlaylistVideos = null;
        };

        closeBtn?.addEventListener('click', closeModal);
        cancelBtn?.addEventListener('click', closeModal);

        // Select all handler
        selectAllCheckbox?.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.playlist-video-checkbox');
            checkboxes.forEach(cb => cb.checked = e.target.checked);
        });

        // Download selected handler
        downloadBtn?.addEventListener('click', async () => {
            const checkboxes = document.querySelectorAll('.playlist-video-checkbox:checked');
            const selectedIndices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index));

            if (selectedIndices.length === 0) {
                this.showError('Please select at least one video');
                return;
            }

            const selectedUrls = selectedIndices.map(i => this.currentPlaylistVideos[i].url);

            // Add selected videos to queue
            const results = await this.state.addVideosFromUrls(selectedUrls);

            this.showToast(`Added ${results.successful.length} video(s) from playlist`, 'success');
            closeModal();
        });
    }

    /**
     * Format duration in seconds to MM:SS
     * @param {number} seconds - Duration in seconds
     * @returns {string} Formatted duration
     */
    formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) return 'Unknown';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Show video preview modal
     * @param {string} videoId - Video ID
     * @param {string} url - Video URL
     */
    async showVideoPreview(videoId, url) {
        const modal = document.getElementById('previewModal');
        const player = document.getElementById('previewPlayer');
        const title = document.getElementById('previewTitle');
        const duration = document.getElementById('previewDuration');
        const views = document.getElementById('previewViews');
        const likes = document.getElementById('previewLikes');
        const description = document.getElementById('previewDescription');
        const downloadBtn = document.getElementById('downloadFromPreviewBtn');

        if (!modal || !player) return;

        const video = this.state.getVideo(videoId);
        if (!video) return;

        // Store current video for download button
        this.currentPreviewVideoId = videoId;

        // Set title
        title.textContent = video.title || video.url;

        // Extract video ID and create embed URL
        let embedUrl = '';
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const youtubeIdMatch = url.match(/(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (youtubeIdMatch) {
                embedUrl = `https://www.youtube.com/embed/${youtubeIdMatch[1]}`;
            }
        } else if (url.includes('vimeo.com')) {
            const vimeoIdMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
            if (vimeoIdMatch) {
                embedUrl = `https://player.vimeo.com/video/${vimeoIdMatch[1]}`;
            }
        }

        if (!embedUrl) {
            this.showError('Preview not available for this video');
            return;
        }

        // Set iframe src
        player.src = embedUrl;

        // Set duration
        if (video.duration) {
            duration.querySelector('span').textContent = video.duration;
        } else {
            duration.querySelector('span').textContent = '--:--';
        }

        // Show loading state for other info
        views.querySelector('span').textContent = 'Loading...';
        likes.querySelector('span').textContent = 'Loading...';
        description.textContent = 'Loading video information...';

        // Fetch full metadata (views, likes, description)
        try {
            const metadata = await window.electronAPI.getVideoMetadata(url);
            if (metadata.views) {
                views.querySelector('span').textContent = this.formatNumber(metadata.views);
            }
            if (metadata.likes) {
                likes.querySelector('span').textContent = this.formatNumber(metadata.likes);
            }
            if (metadata.description) {
                description.textContent = metadata.description.slice(0, 500) + (metadata.description.length > 500 ? '...' : '');
            }
        } catch (error) {
            console.error('Error fetching preview metadata:', error);
            views.querySelector('span').textContent = 'N/A';
            likes.querySelector('span').textContent = 'N/A';
            description.textContent = 'Unable to load video information.';
        }

        // Setup modal event listeners
        this.setupPreviewModalListeners();

        // Show modal
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    /**
     * Setup event listeners for preview modal
     */
    setupPreviewModalListeners() {
        const modal = document.getElementById('previewModal');
        const closeBtn = document.getElementById('closePreviewModal');
        const closeBtn2 = document.getElementById('closePreviewBtn');
        const downloadBtn = document.getElementById('downloadFromPreviewBtn');
        const player = document.getElementById('previewPlayer');

        const closeModal = () => {
            modal.classList.remove('flex');
            modal.classList.add('hidden');
            player.src = ''; // Stop video playback
            this.currentPreviewVideoId = null;
        };

        closeBtn?.addEventListener('click', closeModal);
        closeBtn2?.addEventListener('click', closeModal);

        downloadBtn?.addEventListener('click', async () => {
            if (this.currentPreviewVideoId) {
                // Mark video as selected and trigger download
                const video = this.state.getVideo(this.currentPreviewVideoId);
                if (video && video.status === 'ready') {
                    // Select this video only
                    this.state.clearVideoSelection();
                    this.state.toggleVideoSelection(this.currentPreviewVideoId);

                    // Trigger download
                    await this.handleDownloadVideos();
                }
            }
            closeModal();
        });
    }

    /**
     * Format number with K/M suffix
     * @param {number} num - Number to format
     * @returns {string} Formatted number
     */
    formatNumber(num) {
        if (!num || isNaN(num)) return 'N/A';
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    /**
     * Show toast notification
     * @param {string} message - Message to display
     * @param {string} type - Type of toast: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duration in milliseconds (default: 4000)
     */
    showToast(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'toast bg-[#314158] rounded-lg shadow-lg p-4 flex items-start gap-3 border border-[#45556c]';

        // Icon based on type
        let icon = '';
        let iconColor = '';
        switch (type) {
            case 'success':
                iconColor = '#00a63e';
                icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>`;
                break;
            case 'error':
                iconColor = '#e7000b';
                icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>`;
                break;
            case 'warning':
                iconColor = '#ffa500';
                icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>`;
                break;
            default: // info
                iconColor = '#155dfc';
                icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>`;
        }

        toast.innerHTML = `
            <div class="flex-shrink-0">${icon}</div>
            <div class="flex-1 text-sm text-[#cad5e2]">${message}</div>
            <button class="toast-close flex-shrink-0 text-[#90a1b9] hover:text-white transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        `;

        // Add to container
        container.appendChild(toast);

        // Close button handler
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            this.removeToast(toast);
        });

        // Auto-remove after duration
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);
    }

    /**
     * Remove toast notification
     * @param {HTMLElement} toast - Toast element to remove
     */
    removeToast(toast) {
        if (!toast || !toast.parentElement) return;

        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        }, 300);
    }

    /**
     * Show settings modal
     */
    showSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;

        // Load current settings into form
        this.loadSettingsIntoModal();

        // Set up tab switching
        this.setupSettingsTabs();

        // Set up concurrent downloads slider
        const concurrentSlider = document.getElementById('settings-concurrent-downloads');
        const concurrentValue = document.getElementById('concurrent-value');
        if (concurrentSlider && concurrentValue) {
            concurrentSlider.addEventListener('input', (e) => {
                concurrentValue.textContent = e.target.value;
            });
        }

        // Setup event listeners
        this.setupSettingsModalListeners();

        // Show modal
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    /**
     * Load current settings into modal form
     */
    loadSettingsIntoModal() {
        // General tab
        const savePathInput = document.getElementById('settings-save-path');
        if (savePathInput) {
            savePathInput.value = this.state.config.savePath || '';
        }

        // Downloads tab
        const concurrentSlider = document.getElementById('settings-concurrent-downloads');
        const concurrentValue = document.getElementById('concurrent-value');
        const concurrentDownloads = this.state.config.concurrentDownloads || 3;
        if (concurrentSlider) concurrentSlider.value = concurrentDownloads;
        if (concurrentValue) concurrentValue.textContent = concurrentDownloads;

        // Advanced tab
        const cookieFileInput = document.getElementById('settings-cookie-file');
        if (cookieFileInput) {
            cookieFileInput.value = this.state.config.cookieFile || '';
        }
    }

    /**
     * Setup tab switching for settings modal
     */
    setupSettingsTabs() {
        const tabs = document.querySelectorAll('.settings-tab');
        const contents = document.querySelectorAll('.settings-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                // Add active class to clicked tab
                tab.classList.add('active');

                // Hide all content
                contents.forEach(c => c.classList.add('hidden'));
                // Show selected content
                const tabName = tab.dataset.tab;
                const content = document.getElementById(`tab-${tabName}`);
                if (content) content.classList.remove('hidden');
            });
        });
    }

    /**
     * Setup event listeners for settings modal
     */
    setupSettingsModalListeners() {
        const modal = document.getElementById('settingsModal');
        const closeBtn = document.getElementById('closeSettingsModal');
        const cancelBtn = document.getElementById('cancelSettingsBtn');
        const saveBtn = document.getElementById('saveSettingsBtn');
        const changePathBtn = document.getElementById('settings-change-path');
        const selectCookieBtn = document.getElementById('settings-select-cookie');
        const clearCookieBtn = document.getElementById('settings-clear-cookie');

        const closeModal = () => {
            modal.classList.remove('flex');
            modal.classList.add('hidden');
        };

        closeBtn?.addEventListener('click', closeModal);
        cancelBtn?.addEventListener('click', closeModal);

        // Save settings
        saveBtn?.addEventListener('click', async () => {
            await this.saveSettings();
            closeModal();
        });

        // Change save path
        changePathBtn?.addEventListener('click', async () => {
            const result = await window.electronAPI.selectSaveDirectory();
            if (result.success && result.path) {
                document.getElementById('settings-save-path').value = result.path;
            }
        });

        // Select cookie file
        selectCookieBtn?.addEventListener('click', async () => {
            const result = await window.electronAPI.selectCookieFile();
            if (result.success && result.path) {
                document.getElementById('settings-cookie-file').value = result.path;
            }
        });

        // Clear cookie file
        clearCookieBtn?.addEventListener('click', () => {
            document.getElementById('settings-cookie-file').value = '';
        });

        // Export/Import/Update buttons in Data tab
        const exportListBtnSettings = document.getElementById('exportListBtnSettings');
        const importListBtnSettings = document.getElementById('importListBtnSettings');
        const updateDepsBtnSettings = document.getElementById('updateDepsBtnSettings');

        exportListBtnSettings?.addEventListener('click', () => {
            this.handleExportList();
        });

        importListBtnSettings?.addEventListener('click', () => {
            this.handleImportList();
        });

        updateDepsBtnSettings?.addEventListener('click', () => {
            this.handleUpdateDependencies();
        });

        // Close on Escape key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // Close on click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    /**
     * Save settings from modal to state
     */
    async saveSettings() {
        const newSettings = {
            savePath: document.getElementById('settings-save-path')?.value || this.state.config.savePath,
            concurrentDownloads: parseInt(document.getElementById('settings-concurrent-downloads')?.value) || 3,
            autoOrganize: document.getElementById('settings-auto-organize')?.checked || false,
            filenameTemplate: document.getElementById('settings-filename-template')?.value || '%(title)s',
            autoDownloadSubtitles: document.getElementById('settings-auto-download-subtitles')?.checked || false,
            subtitleLanguage: document.getElementById('settings-subtitle-language')?.value || 'en',
            desktopNotifications: document.getElementById('settings-desktop-notifications')?.checked || true,
            maxRetries: parseInt(document.getElementById('settings-max-retries')?.value) || 3,
            timeout: parseInt(document.getElementById('settings-timeout')?.value) || 30,
            cookieFile: document.getElementById('settings-cookie-file')?.value || null
        };

        // Update state
        this.state.updateConfig(newSettings);

        // Update main UI if save path changed
        if (newSettings.savePath !== this.state.config.savePath) {
            const savePathDisplay = document.getElementById('savePath');
            if (savePathDisplay) {
                savePathDisplay.textContent = newSettings.savePath;
            }
        }

        this.showToast('Settings saved successfully', 'success');
    }

    // Show history modal
    showHistoryModal() {
        const modal = document.getElementById('historyModal');
        if (!modal) return;

        this.renderHistoryList();
        this.setupHistoryModalListeners();

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    // Render history list
    renderHistoryList() {
        const historyList = document.getElementById('historyList');
        const emptyState = document.getElementById('historyEmptyState');
        const history = this.state.getHistory();

        if (!historyList) return;

        if (history.length === 0) {
            historyList.innerHTML = '';
            if (emptyState) {
                emptyState.classList.remove('hidden');
                emptyState.classList.add('flex');
            }
            return;
        }

        if (emptyState) {
            emptyState.classList.add('hidden');
            emptyState.classList.remove('flex');
        }

        historyList.innerHTML = history.map(entry => {
            const downloadDate = new Date(entry.downloadedAt);
            const dateStr = downloadDate.toLocaleDateString();
            const timeStr = downloadDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return `
                <div class="bg-[#1d293d] rounded-lg p-3 flex items-center gap-3 hover:bg-[#243447] transition-colors">
                    <img src="${entry.thumbnail || 'assets/icons/placeholder.svg'}"
                         alt="${entry.title}"
                         class="w-16 h-12 object-cover rounded flex-shrink-0">
                    <div class="flex-1 min-w-0">
                        <h3 class="text-sm text-white font-medium truncate">${entry.title}</h3>
                        <div class="flex items-center gap-3 text-xs text-[#90a1b9] mt-1">
                            <span>${entry.quality} • ${entry.format !== 'None' ? entry.format : 'MP4'}</span>
                            <span>•</span>
                            <span>${dateStr} ${timeStr}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <button class="redownload-history-btn text-[#155dfc] hover:text-white px-3 py-1 rounded border border-[#155dfc] hover:bg-[#155dfc] transition-colors text-xs"
                                data-entry-id="${entry.id}"
                                data-url="${entry.url}"
                                title="Re-download this video">
                            Re-download
                        </button>
                        <button class="delete-history-btn text-[#90a1b9] hover:text-[#e7000b] transition-colors p-1"
                                data-entry-id="${entry.id}"
                                title="Remove from history">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M3 4h10M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v4M10 7v4M4 4l1 9a1 1 0 001 1h4a1 1 0 001-1l1-9"
                                    stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Setup history modal listeners
    setupHistoryModalListeners() {
        const closeBtn = document.getElementById('closeHistoryModal');
        const clearBtn = document.getElementById('clearHistoryBtn');
        const historyList = document.getElementById('historyList');
        const modal = document.getElementById('historyModal');

        // Remove existing listeners if any
        if (closeBtn) {
            closeBtn.replaceWith(closeBtn.cloneNode(true));
            const newCloseBtn = document.getElementById('closeHistoryModal');
            newCloseBtn.addEventListener('click', () => {
                modal.classList.remove('flex');
                modal.classList.add('hidden');
            });
        }

        if (clearBtn) {
            clearBtn.replaceWith(clearBtn.cloneNode(true));
            const newClearBtn = document.getElementById('clearHistoryBtn');
            newClearBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all download history? This cannot be undone.')) {
                    this.state.clearHistory();
                    this.renderHistoryList();
                    this.showToast('Download history cleared', 'info');
                }
            });
        }

        // Handle delete and redownload buttons
        if (historyList) {
            historyList.addEventListener('click', (e) => {
                const deleteBtn = e.target.closest('.delete-history-btn');
                const redownloadBtn = e.target.closest('.redownload-history-btn');

                if (deleteBtn) {
                    const entryId = deleteBtn.dataset.entryId;
                    this.state.removeHistoryEntry(entryId);
                    this.renderHistoryList();
                    this.showToast('Removed from history', 'info');
                }

                if (redownloadBtn) {
                    const url = redownloadBtn.dataset.url;
                    // Close history modal
                    modal.classList.remove('flex');
                    modal.classList.add('hidden');
                    // Add video to queue
                    const urlInput = document.getElementById('urlInput');
                    if (urlInput) {
                        urlInput.value = url;
                        this.handleAddVideo();
                    }
                }
            });
        }

        // Close on outside click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('flex');
                    modal.classList.add('hidden');
                }
            });
        }
    }

    // Event handlers
    async handleAddVideo() {
        const urlInput = document.getElementById('urlInput');
        const inputText = urlInput?.value.trim();

        if (!inputText) {
            this.showError('Please enter a URL');
            return;
        }

        try {
            this.updateStatusMessage('Adding videos...');

            // Check if it's a playlist URL
            const playlistPattern = /[?&]list=([\w\-]+)/;
            if (playlistPattern.test(inputText)) {
                await this.handlePlaylistUrl(inputText);
                if (urlInput) {
                    urlInput.value = '';
                }
                return;
            }

            // Validate URLs
            const validation = window.URLValidator.validateMultipleUrls(inputText);

            if (validation.invalid.length > 0) {
                this.showError(`Invalid URLs found: ${validation.invalid.join(', ')}`);
                return;
            }

            if (validation.valid.length === 0) {
                this.showError('No valid URLs found');
                return;
            }

            // Check for duplicates first
            const duplicateInfo = this.checkForDuplicates(validation.valid);

            let urlsToAdd = validation.valid;

            let addOptions = {};

            // If duplicates found, ask user what to do
            if (duplicateInfo.duplicates.length > 0) {
                const action = await this.handleDuplicateUrls(duplicateInfo);

                if (action === 'skip') {
                    // Only add non-duplicate URLs
                    urlsToAdd = duplicateInfo.unique;
                } else if (action === 'replace') {
                    // Remove existing duplicates, then add all URLs
                    duplicateInfo.duplicates.forEach(dup => {
                        this.state.removeVideo(dup.existingVideo.id);
                    });
                    urlsToAdd = validation.valid;
                } else if (action === 'keep-both') {
                    // Add all URLs (duplicates will be added again)
                    urlsToAdd = validation.valid;
                    addOptions = { allowDuplicates: true };
                } else {
                    // User cancelled
                    return;
                }
            }

            // Add videos to state
            const results = await this.state.addVideosFromUrls(urlsToAdd, addOptions);

            // Clear input on success
            if (urlInput) {
                urlInput.value = '';
            }

            // Show results with toast
            const successCount = results.successful.length;
            const failedCount = results.failed.length;

            if (successCount > 0) {
                const message = `Added ${successCount} video(s)`;
                this.showToast(message, 'success');
            }

            if (failedCount > 0) {
                this.showToast(`${failedCount} video(s) failed to add`, 'error');
            }

        } catch (error) {
            console.error('Error adding videos:', error);
            this.showError(`Failed to add videos: ${error.message}`);
        }
    }

    async handleImportUrls() {
        if (!window.electronAPI) {
            this.showError('File import requires Electron environment');
            return;
        }

        try {
            // Implementation would use Electron file dialog
            this.updateStatusMessage('Import URLs functionality coming soon');
        } catch (error) {
            this.showError(`Failed to import URLs: ${error.message}`);
        }
    }

    async handleSelectSavePath() {
        if (!window.IPCManager || !window.IPCManager.isAvailable()) {
            this.showError('Path selection requires Electron environment');
            return;
        }

        try {
            this.updateStatusMessage('Select download directory...');

            const result = await window.IPCManager.selectSaveDirectory();

            if (result && result.success && result.path) {
                this.state.updateConfig({ savePath: result.path });
                await this.ensureSaveDirectoryExists(); // Auto-create directory
                this.updateSavePathDisplay();
                this.updateStatusMessage(`Save path set to: ${result.path}`);
            } else if (result && result.error) {
                this.showError(result.error);
            } else {
                this.updateStatusMessage('No directory selected');
            }

        } catch (error) {
            console.error('Error selecting save path:', error);
            this.showError(`Failed to select save path: ${error.message}`);
        }
    }

    async handleSelectCookieFile() {
        if (!window.IPCManager || !window.IPCManager.isAvailable()) {
            this.showError('File selection requires Electron environment');
            return;
        }

        try {
            this.updateStatusMessage('Select cookie file...');

            const result = await window.IPCManager.selectCookieFile();

            if (result && result.success && result.path) {
                this.state.updateConfig({ cookieFile: result.path });
                this.updateStatusMessage(`Cookie file set: ${result.path}`);

                // Update UI to show selected cookie file
                const cookieFilePathElement = document.getElementById('cookieFilePath');
                if (cookieFilePathElement) {
                    const fileName = result.path.split('/').pop() || result.path.split('\\').pop();
                    cookieFilePathElement.textContent = fileName;
                    cookieFilePathElement.title = result.path;
                }
            } else if (result && result.error) {
                this.showError(result.error);
            } else {
                this.updateStatusMessage('No file selected');
            }

        } catch (error) {
            console.error('Error selecting cookie file:', error);
            this.showError(`Failed to select cookie file: ${error.message}`);
        }
    }

    async handleOpenFolder() {
        // Check if IPC is available
        if (!window.electronAPI || !window.electronAPI.openDownloadsFolder) {
            this.showError('Open folder functionality requires Electron environment');
            return;
        }

        // Get save path from state
        const savePath = this.state.config.savePath;

        if (!savePath) {
            this.showError('No download folder configured. Please set a save path first.');
            return;
        }

        try {
            const result = await window.electronAPI.openDownloadsFolder(savePath);

            if (!result.success) {
                this.showError(result.error || 'Failed to open folder');
            }
            // On success, no message needed - folder opens in file explorer

        } catch (error) {
            console.error('Error opening folder:', error);
            this.showError(`Failed to open folder: ${error.message}`);
        }
    }

    async handleClipboardToggle(enabled) {
        if (!window.electronAPI) {
            this.showError('Clipboard monitoring requires Electron environment');
            return;
        }

        try {
            if (enabled) {
                const result = await window.electronAPI.startClipboardMonitor();
                if (result.success) {
                    // Set up listener for detected URLs
                    window.electronAPI.onClipboardUrlDetected((event, url) => {
                        this.showClipboardNotification(url);
                    });
                    this.updateStatusMessage('Clipboard monitoring enabled');
                } else {
                    this.showError('Failed to start clipboard monitoring');
                    document.getElementById('clipboardMonitorToggle').checked = false;
                }
            } else {
                await window.electronAPI.stopClipboardMonitor();
                this.updateStatusMessage('Clipboard monitoring disabled');
            }
        } catch (error) {
            console.error('Error toggling clipboard monitor:', error);
            this.showError(`Clipboard monitoring error: ${error.message}`);
        }
    }

    async showClipboardNotification(url) {
        if (!window.electronAPI) return;

        try {
            await window.electronAPI.showNotification({
                title: 'Video URL Detected',
                message: `Click to add: ${url.substring(0, 50)}...`,
                sound: true
            });

            // Auto-add the URL
            const urlInput = document.getElementById('urlInput');
            if (urlInput) {
                urlInput.value = url;
                // Trigger add action
                await this.handleAddVideo();
            }
        } catch (error) {
            console.error('Error showing clipboard notification:', error);
        }
    }

    /**
     * Export current video list to JSON file
     */
    async handleExportList() {
        const videos = this.state.videos;

        if (videos.length === 0) {
            this.showError('No videos to export');
            return;
        }

        try {
            const result = await window.electronAPI.exportVideoList(videos);

            if (result.cancelled) {
                return; // User cancelled dialog
            }

            if (result.success) {
                this.showToast(`Exported ${videos.length} video(s)`, 'success');
            } else {
                this.showToast(`Export failed: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error exporting video list:', error);
            this.showError('Failed to export video list');
        }
    }

    /**
     * Import video list from JSON file
     */
    async handleImportList() {
        try {
            const result = await window.electronAPI.importVideoList();

            if (result.cancelled) {
                return; // User cancelled dialog
            }

            if (!result.success) {
                this.showError(`Import failed: ${result.error}`);
                return;
            }

            // Ask user if they want to replace or merge
            const action = confirm(
                `Import ${result.videos.length} video(s)?\n\n` +
                `Click OK to REPLACE current list\n` +
                `Click Cancel to MERGE with current list`
            );

            if (action) {
                // Replace: clear current list first
                this.state.clearVideos();
            }

            // Add imported videos
            let addedCount = 0;
            let skippedCount = 0;

            for (const videoData of result.videos) {
                // Check for duplicates (only if merging)
                if (!action) {
                    const existingVideo = this.state.videos.find(v => v.url === videoData.url);
                    if (existingVideo) {
                        skippedCount++;
                        continue;
                    }
                }

                // Create new video with imported data - Video constructor takes (url, options)
                const video = new Video(videoData.url, {
                    title: videoData.title || 'Imported Video',
                    thumbnail: videoData.thumbnail || '',
                    duration: videoData.duration || '',
                    quality: videoData.quality || this.state.config.defaultQuality,
                    format: videoData.format || this.state.config.defaultFormat,
                    status: 'ready' // Always reset to ready on import
                });

                this.state.addVideo(video);
                addedCount++;
            }

            const message = action
                ? `Imported ${addedCount} video(s)`
                : `Imported ${addedCount} video(s)${skippedCount > 0 ? `, skipped ${skippedCount} duplicate(s)` : ''}`;

            this.showToast(message, 'success');
            this.renderVideoList();
        } catch (error) {
            console.error('Error importing video list:', error);
            this.showError('Failed to import video list');
        }
    }

    handleClearList() {
        const selectedVideos = this.state.getSelectedVideos();
        const hasSelection = selectedVideos.length > 0;

        if (hasSelection) {
            // Clear only selected videos
            selectedVideos.forEach(video => {
                this.state.removeVideo(video.id);
            });
            this.updateStatusMessage(`Cleared ${selectedVideos.length} selected video(s)`);
        } else {
            // Clear all videos
            if (this.state.getVideos().length === 0) {
                this.updateStatusMessage('No videos to clear');
                return;
            }
            const removedVideos = this.state.clearVideos();
            this.updateStatusMessage(`Cleared ${removedVideos.length} video(s)`);
        }
    }

    async handleDownloadVideos() {
        // Check if IPC is available
        if (!window.IPCManager || !window.IPCManager.isAvailable()) {
            this.showError('Download functionality requires Electron environment');
            return;
        }

        // Check completed videos for missing files and reset them to ready
        const completedVideos = this.state.getVideosByStatus('completed');
        for (const video of completedVideos) {
            if (video.filename) {
                const filePath = `${this.state.config.savePath}/${video.filename}`;
                try {
                    const result = await window.electronAPI.checkFileExists(filePath);
                    if (!result.exists) {
                        console.log(`File missing for ${video.title}, resetting to ready`);
                        this.state.updateVideo(video.id, {
                            status: 'ready',
                            progress: 0,
                            filename: '',
                            error: null
                        });
                    }
                } catch (error) {
                    console.error(`Error checking file existence for ${video.title}:`, error);
                }
            }
        }

        // Get downloadable videos (either selected or all ready videos)
        const selectedVideos = this.state.getSelectedVideos().filter(v => v.isDownloadable());
        const videos = selectedVideos.length > 0
            ? selectedVideos
            : this.state.getVideos().filter(v => v.isDownloadable());

        if (videos.length === 0) {
            this.showError('No videos ready for download');
            return;
        }

        // Validate save path
        if (!this.state.config.savePath) {
            this.showError('Please select a save directory first');
            return;
        }

        this.state.updateUI({ isDownloading: true });
        this.updateStatusMessage(`Starting parallel download of ${videos.length} video(s)...`);

        // Set up download progress listener
        window.IPCManager.onDownloadProgress('app', (progressData) => {
            this.handleDownloadProgress(progressData);
        });

        // PARALLEL DOWNLOADS: Start all downloads simultaneously
        // The DownloadManager will handle concurrency limits automatically
        console.log(`Starting ${videos.length} downloads in parallel...`);

        const downloadPromises = videos.map(async (video) => {
            try {
                // Update video status to downloading
                this.state.updateVideo(video.id, { status: 'downloading', progress: 0 });

                const result = await window.IPCManager.downloadVideo({
                    videoId: video.id,
                    url: video.url,
                    quality: video.quality,
                    format: video.format,
                    savePath: this.state.config.savePath,
                    cookieFile: this.state.config.cookieFile
                });

                if (result.success) {
                    this.state.updateVideo(video.id, {
                        status: 'completed',
                        progress: 100,
                        filename: result.filename
                    });

                    // Add to download history
                    const completedVideo = this.state.getVideo(video.id);
                    if (completedVideo) {
                        this.state.addToHistory(completedVideo);
                    }

                    // Show notification for successful download
                    this.showDownloadNotification(video, 'success');
                    return { success: true, video };
                } else {
                    this.state.updateVideo(video.id, {
                        status: 'error',
                        error: result.error || 'Download failed'
                    });

                    // Show notification for failed download
                    this.showDownloadNotification(video, 'error', result.error);
                    return { success: false, video, error: result.error };
                }

            } catch (error) {
                console.error(`Error downloading video ${video.id}:`, error);
                this.state.updateVideo(video.id, {
                    status: 'error',
                    error: error.message
                });
                return { success: false, video, error: error.message };
            }
        });

        // Wait for all downloads to complete
        const results = await Promise.all(downloadPromises);

        // Count successes and failures
        const successCount = results.filter(r => r.success).length;
        const failedCount = results.filter(r => !r.success).length;

        // Clean up progress listener
        window.IPCManager.removeDownloadProgressListener('app');

        this.state.updateUI({ isDownloading: false });

        // Show final status
        let message = `Download complete: ${successCount} succeeded`;
        if (failedCount > 0) {
            message += `, ${failedCount} failed`;
        }
        this.updateStatusMessage(message);
    }

    // Handle pause download
    async handlePauseDownload(videoId) {
        if (!window.electronAPI) {
            this.showToast('Pause functionality requires Electron environment', 'error');
            return;
        }

        try {
            const result = await window.electronAPI.pauseDownload(videoId);
            if (result.success) {
                this.state.updateVideo(videoId, { status: 'paused' });
                this.showToast('Download paused', 'info');
            } else {
                this.showToast(result.message || 'Failed to pause download', 'error');
            }
        } catch (error) {
            console.error('Error pausing download:', error);
            this.showToast('Failed to pause download', 'error');
        }
    }

    // Handle resume download
    async handleResumeDownload(videoId) {
        if (!window.electronAPI) {
            this.showToast('Resume functionality requires Electron environment', 'error');
            return;
        }

        try {
            const result = await window.electronAPI.resumeDownload(videoId);
            if (result.success) {
                this.state.updateVideo(videoId, { status: 'downloading' });
                this.showToast('Download resumed', 'success');
            } else {
                this.showToast(result.message || 'Failed to resume download', 'error');
            }
        } catch (error) {
            console.error('Error resuming download:', error);
            this.showToast('Failed to resume download', 'error');
        }
    }

    // Handle download progress updates from IPC
    handleDownloadProgress(progressData) {
        const { url, progress, status, stage, message, speed, eta } = progressData;

        // Find video by URL
        const video = this.state.getVideos().find(v => v.url === url);
        if (!video) return;

        // Update video progress
        this.state.updateVideo(video.id, {
            progress: Math.round(progress),
            status: status || 'downloading',
            downloadSpeed: speed,
            eta: eta
        });
    }

    // Show download notification
    async showDownloadNotification(video, type, errorMessage = null) {
        if (!window.electronAPI) return;

        try {
            const notificationOptions = {
                title: type === 'success' ? 'Download Complete' : 'Download Failed',
                message: type === 'success'
                    ? `${video.getDisplayName()}`
                    : `${video.getDisplayName()}: ${errorMessage || 'Unknown error'}`,
                sound: true
            };

            await window.electronAPI.showNotification(notificationOptions);
        } catch (error) {
            console.warn('Failed to show notification:', error);
        }
    }

    async handleCancelDownloads() {
        const selectedVideos = this.state.getSelectedVideos();
        const hasSelection = selectedVideos.length > 0;

        if (!window.IPCManager || !window.IPCManager.isAvailable()) {
            this.showError('Cancel functionality requires Electron environment');
            return;
        }

        try {
            let videosToCancel = [];

            if (hasSelection) {
                // Cancel only selected videos that are downloading or converting
                videosToCancel = selectedVideos.filter(v =>
                    v.status === 'downloading' || v.status === 'converting'
                );

                if (videosToCancel.length === 0) {
                    this.updateStatusMessage('No active downloads in selection');
                    return;
                }

                this.updateStatusMessage(`Cancelling ${videosToCancel.length} selected download(s)...`);

                // Cancel each selected video individually
                for (const video of videosToCancel) {
                    try {
                        await window.electronAPI.cancelDownload(video.id);
                    } catch (error) {
                        console.error(`Error cancelling download for ${video.id}:`, error);
                    }
                }
            } else {
                // Cancel all active downloads
                const downloadingVideos = this.state.getVideosByStatus('downloading');
                const convertingVideos = this.state.getVideosByStatus('converting');
                videosToCancel = [...downloadingVideos, ...convertingVideos];

                if (videosToCancel.length === 0) {
                    this.updateStatusMessage('No active downloads to cancel');
                    return;
                }

                this.updateStatusMessage(`Cancelling ${videosToCancel.length} active download(s)...`);

                // Cancel all downloads via IPC
                await window.electronAPI.cancelAllDownloads();
                // Cancel all conversions via IPC
                await window.electronAPI.cancelAllConversions();
            }

            // Update video statuses to ready
            videosToCancel.forEach(video => {
                this.state.updateVideo(video.id, {
                    status: 'ready',
                    progress: 0,
                    error: 'Cancelled by user'
                });
            });

            this.state.updateUI({ isDownloading: false });
            this.updateStatusMessage(hasSelection ? 'Selected downloads cancelled' : 'Downloads cancelled');

        } catch (error) {
            console.error('Error cancelling downloads:', error);
            this.showError(`Failed to cancel downloads: ${error.message}`);
        }
    }

    async handleUpdateDependencies() {
        if (!window.IPCManager || !window.IPCManager.isAvailable()) {
            this.showError('Update functionality requires Electron environment');
            return;
        }

        const btn = document.getElementById('updateDepsBtn');
        const originalBtnHTML = btn ? btn.innerHTML : '';

        try {
            // Show loading state
            this.updateStatusMessage('Checking binary versions...');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<img src="assets/icons/refresh.svg" alt="" width="16" height="16" loading="lazy" class="animate-spin">Checking...';
            }

            const versions = await window.IPCManager.checkBinaryVersions();

            // Handle both ytDlp (from main.js) and ytdlp (legacy) formats
            const ytdlp = versions.ytDlp || versions.ytdlp;
            const ffmpeg = versions.ffmpeg;

            if (versions && (ytdlp || ffmpeg)) {
                // Update both button status and version display
                const ytdlpMissing = !ytdlp || !ytdlp.available;
                const ffmpegMissing = !ffmpeg || !ffmpeg.available;

                if (ytdlpMissing || ffmpegMissing) {
                    this.updateDependenciesButtonStatus('missing');
                    this.updateBinaryVersionDisplay(null);
                } else {
                    this.updateDependenciesButtonStatus('ok');
                    // Normalize the format for display
                    const normalizedVersions = {
                        ytdlp: ytdlp,
                        ffmpeg: ffmpeg
                    };
                    this.updateBinaryVersionDisplay(normalizedVersions);

                    // Show dialog if updates are available
                    if (ytdlp.updateAvailable) {
                        this.showInfo({
                            title: 'Update Available',
                            message: `A newer version of yt-dlp is available:\nInstalled: ${ytdlp.version}\nLatest: ${ytdlp.latestVersion || 'newer version'}\n\nPlease run 'npm run setup' to update.`
                        });
                    }
                }
            } else {
                this.showError('Could not check binary versions');
            }

        } catch (error) {
            console.error('Error checking dependencies:', error);
            this.showError(`Failed to check dependencies: ${error.message}`);
        } finally {
            // Restore button state
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalBtnHTML || '<img src="assets/icons/refresh.svg" alt="" width="16" height="16" loading="lazy">Check for Updates';
            }
        }
    }

    // State change handlers
    onVideoAdded(data) {
        this.renderVideoList();
        this.updateStatsDisplay();
    }

    onVideoRemoved(data) {
        this.renderVideoList();
        this.updateStatsDisplay();
    }

    onVideoUpdated(data) {
        this.updateVideoElement(data.video);
        this.updateStatsDisplay();
    }

    onVideosReordered(data) {
        // Re-render entire list to reflect new order
        this.renderVideoList();
        console.log('Video order updated:', data);
    }

    onVideosCleared(data) {
        this.renderVideoList();
        this.updateStatsDisplay();
    }

    onConfigUpdated(data) {
        this.updateConfigUI(data.config);
    }

    onVideoSelectionChanged(data) {
        const selectedVideos = data.selectedVideos || [];
        const hasSelection = selectedVideos.length > 0;

        // Update Clear List button
        const clearListBtn = document.getElementById('clearListBtn');
        if (clearListBtn) {
            clearListBtn.textContent = hasSelection ? 'Clear Selected' : 'Clear List';
            clearListBtn.setAttribute('aria-label', hasSelection ? 'Clear selected videos' : 'Clear all videos');
        }

        // Update Cancel Downloads button
        const cancelDownloadsBtn = document.getElementById('cancelDownloadsBtn');
        if (cancelDownloadsBtn) {
            cancelDownloadsBtn.textContent = hasSelection ? 'Cancel Selected' : 'Cancel Downloads';
            cancelDownloadsBtn.setAttribute('aria-label', hasSelection ? 'Cancel selected downloads' : 'Cancel all downloads');
        }

        // Update Download Videos button
        const downloadVideosBtn = document.getElementById('downloadVideosBtn');
        if (downloadVideosBtn) {
            downloadVideosBtn.textContent = hasSelection ? 'Download Selected' : 'Download Videos';
            downloadVideosBtn.setAttribute('aria-label', hasSelection ? 'Download selected videos' : 'Download all videos');
        }
    }

    // UI update methods
    updateSavePathDisplay() {
        const savePathElement = document.getElementById('savePath');
        if (savePathElement) {
            savePathElement.textContent = this.state.config.savePath;
        }
    }

    initializeDropdowns() {
        // Set dropdown values from config
        const defaultQuality = document.getElementById('defaultQuality');
        if (defaultQuality) {
            defaultQuality.value = this.state.config.defaultQuality;
        }

        const defaultFormat = document.getElementById('defaultFormat');
        if (defaultFormat) {
            defaultFormat.value = this.state.config.defaultFormat;
        }
    }

    initializeVideoList() {
        this.renderVideoList();
    }

    renderVideoList() {
        const videoList = document.getElementById('videoList');
        if (!videoList) return;

        const videos = this.state.getVideos();

        // Clear all existing videos (including mockups)
        videoList.innerHTML = '';

        // If no videos, show empty state
        if (videos.length === 0) {
            videoList.innerHTML = `
                <div class="text-center py-12 text-[#90a1b9]">
                    <p class="text-lg mb-2">No videos yet</p>
                    <p class="text-sm">Paste YouTube or Vimeo URLs above to get started</p>
                </div>
            `;
            return;
        }

        // Render each video
        videos.forEach(video => {
            const videoElement = this.createVideoElement(video);
            videoList.appendChild(videoElement);
        });
    }

    createVideoElement(video) {
        const div = document.createElement('div');
        div.className = 'video-item grid grid-cols-[40px_40px_1fr_120px_100px_120px_100px_40px] gap-4 items-center p-2 rounded bg-[#314158] hover:bg-[#3a4a68] transition-colors duration-200';
        div.dataset.videoId = video.id;
        div.setAttribute('draggable', 'true'); // Make video item draggable

        div.innerHTML = `
            <!-- Checkbox -->
            <div class="flex items-center justify-center">
                <button class="video-checkbox w-6 h-6 rounded flex items-center justify-center hover:bg-[#45556c] transition-colors"
                    role="checkbox" aria-checked="false" aria-label="Select ${video.getDisplayName()}">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="text-white">
                        <rect x="3" y="3" width="10" height="10" stroke="currentColor" stroke-width="1.5" fill="none" rx="2" />
                    </svg>
                </button>
            </div>

            <!-- Drag Handle -->
            <div class="flex items-center justify-center text-[#90a1b9] hover:text-white cursor-grab transition-colors">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="4" cy="4" r="1" />
                    <circle cx="4" cy="8" r="1" />
                    <circle cx="4" cy="12" r="1" />
                    <circle cx="8" cy="4" r="1" />
                    <circle cx="8" cy="8" r="1" />
                    <circle cx="8" cy="12" r="1" />
                    <circle cx="12" cy="4" r="1" />
                    <circle cx="12" cy="8" r="1" />
                    <circle cx="12" cy="12" r="1" />
                </svg>
            </div>

            <!-- Video Info -->
            <div class="flex items-center gap-3 min-w-0">
                <div class="video-thumbnail-container w-16 h-12 bg-[#45556c] rounded overflow-hidden flex-shrink-0 relative group cursor-pointer" data-preview-url="${video.url}">
                    ${video.isFetchingMetadata ?
                        `<div class="w-full h-full bg-gradient-to-br from-[#4a5568] to-[#2d3748] flex items-center justify-center">
                            <svg class="animate-spin h-5 w-5 text-[#155dfc]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>` :
                        video.thumbnail ?
                            `<img src="${video.thumbnail}" alt="${video.getDisplayName()}" class="w-full h-full object-cover">` :
                            `<div class="w-full h-full bg-gradient-to-br from-[#4a5568] to-[#2d3748] flex items-center justify-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="text-[#90a1b9]">
                                    <path d="M8 5V19L19 12L8 5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
                                </svg>
                            </div>`
                    }
                    <!-- Preview Overlay -->
                    <div class="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path fill-rule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                        <div class="text-sm text-white truncate font-medium flex-1">${video.getDisplayName()}</div>
                        ${video.requiresAuth ? `
                            <div class="flex-shrink-0 group relative">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-[#f59e0b]" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                                <div class="absolute bottom-full right-0 mb-2 hidden group-hover:block z-10 w-48">
                                    <div class="bg-[#1d293d] border border-[#45556c] rounded-lg p-2 text-xs text-[#cad5e2] shadow-lg">
                                        <div class="flex items-start gap-1">
                                            <svg width="12" height="12" class="mt-0.5 flex-shrink-0 text-[#f59e0b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <circle cx="12" cy="12" r="10"/>
                                                <line x1="12" y1="8" x2="12" y2="12"/>
                                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                                            </svg>
                                            <span>Requires cookie file. Set in Settings → Advanced.</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    ${video.isFetchingMetadata ?
                        `<div class="text-xs text-[#155dfc] animate-pulse">Fetching info...</div>` :
                        video.requiresAuth && !window.appState?.config?.cookieFile ?
                            `<div class="text-xs text-[#f59e0b]">⚠️ Cookie file needed</div>` :
                            ''
                    }
                </div>
            </div>

            <!-- Duration -->
            <div class="text-sm text-[#cad5e2] text-center">${video.duration || '--:--'}</div>

            <!-- Quality Dropdown -->
            <div class="flex justify-center">
                <select class="quality-select bg-[#314158] border border-[#45556c] text-[#cad5e2] px-2 py-1 rounded text-xs font-medium min-w-0 w-full text-center"
                    aria-label="Quality for ${video.getDisplayName()}">
                    <option value="Best" ${video.quality === 'Best' ? 'selected' : ''}>Best</option>
                    <option value="4K" ${video.quality === '4K' ? 'selected' : ''}>4K</option>
                    <option value="1080p" ${video.quality === '1080p' ? 'selected' : ''}>1080p</option>
                    <option value="720p" ${video.quality === '720p' ? 'selected' : ''}>720p</option>
                </select>
            </div>

            <!-- Format Dropdown -->
            <div class="flex justify-center">
                <select class="format-select bg-[#314158] border border-[#45556c] text-[#cad5e2] px-2 py-1 rounded text-xs font-medium min-w-0 w-full text-center"
                    aria-label="Format for ${video.getDisplayName()}">
                    <option value="None" ${video.format === 'None' ? 'selected' : ''}>None</option>
                    <option value="H264" ${video.format === 'H264' ? 'selected' : ''}>H264</option>
                    <option value="ProRes" ${video.format === 'ProRes' ? 'selected' : ''}>ProRes</option>
                    <option value="DNxHR" ${video.format === 'DNxHR' ? 'selected' : ''}>DNxHR</option>
                    <option value="Audio only" ${video.format === 'Audio only' ? 'selected' : ''}>Audio only</option>
                </select>
            </div>

            <!-- Status Badge with Pause/Resume -->
            <div class="flex items-center justify-center gap-2 status-column">
                <span class="status-badge ${video.status}" role="status" aria-live="polite">
                    ${this.getStatusText(video)}
                </span>
                ${video.status === 'downloading' || video.status === 'paused' ? `
                    <button class="pause-resume-btn w-6 h-6 rounded flex items-center justify-center hover:bg-[#45556c] text-[#90a1b9] hover:text-white transition-colors duration-200"
                        data-video-id="${video.id}"
                        data-action="${video.status === 'paused' ? 'resume' : 'pause'}"
                        aria-label="${video.status === 'paused' ? 'Resume' : 'Pause'} download"
                        title="${video.status === 'paused' ? 'Resume download (Space)' : 'Pause download (Space)'}">
                        ${video.status === 'paused' ? `
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M3 2l10 6-10 6V2z"/>
                            </svg>
                        ` : `
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M5 3h2v10H5V3zm4 0h2v10H9V3z"/>
                            </svg>
                        `}
                    </button>
                ` : ''}
            </div>

            <!-- Delete Button -->
            <div class="flex items-center justify-center">
                <button class="delete-video-btn w-6 h-6 rounded flex items-center justify-center hover:bg-red-600 hover:text-white text-[#90a1b9] transition-colors duration-200"
                    aria-label="Delete ${video.getDisplayName()}" title="Remove from queue">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M3 4h10M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v4M10 7v4M4 4l1 9a1 1 0 001 1h4a1 1 0 001-1l1-9"
                            stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
        `;

        return div;
    }

    getStatusText(video) {
        switch (video.status) {
            case 'downloading':
                let downloadText = `Downloading ${video.progress || 0}%`;
                if (video.downloadSpeed) {
                    downloadText += ` (${video.downloadSpeed})`;
                }
                if (video.eta) {
                    downloadText += ` ETA ${video.eta}`;
                }
                return downloadText;
            case 'paused':
                return `Paused ${video.progress || 0}%`;
            case 'converting':
                return `Converting ${video.progress || 0}%`;
            case 'completed':
                return 'Completed';
            case 'error':
                const retryText = video.retryCount > 0 ? ` (Retry ${video.retryCount}/${video.maxRetries})` : '';
                return `Error${retryText}`;
            case 'ready':
            default:
                return 'Ready';
        }
    }

    updateVideoElement(video) {
        const videoElement = document.querySelector(`[data-video-id="${video.id}"]`);
        if (!videoElement) return;

        // Update thumbnail - show loading spinner if fetching metadata
        const thumbnailContainer = videoElement.querySelector('.w-16.h-12');
        if (thumbnailContainer) {
            if (video.isFetchingMetadata) {
                thumbnailContainer.innerHTML = `
                    <div class="w-full h-full bg-gradient-to-br from-[#4a5568] to-[#2d3748] flex items-center justify-center">
                        <svg class="animate-spin h-5 w-5 text-[#155dfc]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>`;
            } else if (video.thumbnail) {
                thumbnailContainer.innerHTML = `<img src="${video.thumbnail}" alt="${video.getDisplayName()}" class="w-full h-full object-cover">`;
            } else {
                thumbnailContainer.innerHTML = `
                    <div class="w-full h-full bg-gradient-to-br from-[#4a5568] to-[#2d3748] flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="text-[#90a1b9]">
                            <path d="M8 5V19L19 12L8 5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
                        </svg>
                    </div>`;
            }
        }

        // Update title and loading message
        const titleContainer = videoElement.querySelector('.min-w-0.flex-1');
        if (titleContainer) {
            const titleElement = titleContainer.querySelector('.text-sm.text-white.truncate');
            if (titleElement) {
                titleElement.textContent = video.getDisplayName();
            }

            // Update or remove "Fetching info..." message
            const existingLoadingMsg = titleContainer.querySelector('.text-xs.text-\\[\\#155dfc\\]');
            if (video.isFetchingMetadata && !existingLoadingMsg) {
                const loadingMsg = document.createElement('div');
                loadingMsg.className = 'text-xs text-[#155dfc] animate-pulse';
                loadingMsg.textContent = 'Fetching info...';
                titleContainer.appendChild(loadingMsg);
            } else if (!video.isFetchingMetadata && existingLoadingMsg) {
                existingLoadingMsg.remove();
            }
        }

        // Update duration
        const durationElement = videoElement.querySelector('.text-sm.text-\\[\\#cad5e2\\].text-center');
        if (durationElement) {
            durationElement.textContent = video.duration || '--:--';
        }

        // Update quality dropdown
        const qualitySelect = videoElement.querySelector('.quality-select');
        if (qualitySelect) {
            qualitySelect.value = video.quality;
        }

        // Update format dropdown
        const formatSelect = videoElement.querySelector('.format-select');
        if (formatSelect) {
            formatSelect.value = video.format;
        }

        // Update status badge with progress
        const statusBadge = videoElement.querySelector('.status-badge');
        if (statusBadge) {
            statusBadge.className = `status-badge ${video.status}`;
            statusBadge.textContent = this.getStatusText(video);

            // Add progress bar for downloading/converting states
            if (video.status === 'downloading' || video.status === 'converting') {
                const progress = video.progress || 0;
                statusBadge.style.background = `linear-gradient(to right, #155dfc ${progress}%, #314158 ${progress}%)`;
            } else {
                statusBadge.style.background = '';
            }
        }
    }

    updateStatsDisplay() {
        const stats = this.state.getStats();
        // Update UI with current statistics
    }

    updateConfigUI(config) {
        this.updateSavePathDisplay();
        this.initializeDropdowns();
    }

    updateStatusMessage(message) {
        const statusElement = document.getElementById('statusMessage');
        if (statusElement) {
            statusElement.textContent = message;
        }

        // Auto-clear success messages
        if (!message.toLowerCase().includes('error') && !message.toLowerCase().includes('failed')) {
            setTimeout(() => {
                if (statusElement && statusElement.textContent === message) {
                    statusElement.textContent = 'Ready to download videos';
                }
            }, 5000);
        }
    }

    showError(message) {
        this.updateStatusMessage(`Error: ${message}`);
        console.error('App Error:', message);
        this.eventBus.emit('app:error', { type: 'user', message });
    }

    displayError(errorData) {
        const message = errorData.error?.message || errorData.message || 'An error occurred';
        this.updateStatusMessage(`Error: ${message}`);
    }

    /**
     * Prompt user to update existing videos with new default settings
     * @param {string} property - 'quality' or 'format'
     * @param {string} newValue - New default value
     */
    promptUpdateExistingVideos(property, newValue) {
        const allVideos = this.state.getVideos();
        const selectedVideos = this.state.getSelectedVideos();

        // Determine which videos to potentially update
        // If videos are selected, only update those; otherwise, update all downloadable videos
        const videosToCheck = selectedVideos.length > 0
            ? selectedVideos.filter(v => v.status === 'ready' || v.status === 'error')
            : allVideos.filter(v => v.status === 'ready' || v.status === 'error');

        // Only prompt if there are videos that could be updated
        if (videosToCheck.length === 0) {
            return;
        }

        const propertyName = property === 'quality' ? 'quality' : 'format';
        const scope = selectedVideos.length > 0 ? 'selected' : 'all';
        const message = `Update ${scope} ${videosToCheck.length} video(s) in the list to use ${propertyName}: ${newValue}?`;

        if (confirm(message)) {
            let updatedCount = 0;
            videosToCheck.forEach(video => {
                this.state.updateVideo(video.id, { [property]: newValue });
                updatedCount++;
            });

            this.updateStatusMessage(`Updated ${updatedCount} ${scope} video(s) with new ${propertyName}: ${newValue}`);
            this.renderVideoList();
        }
    }

    // Keyboard navigation
    initializeKeyboardNavigation() {
        // Enhanced keyboard navigation setup
        document.addEventListener('keydown', (e) => {
            // Ignore if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }

            // Ctrl/Cmd shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'a':
                        e.preventDefault();
                        this.state.selectAllVideos();
                        this.updateStatusMessage('All videos selected');
                        break;
                    case 'd':
                        e.preventDefault();
                        this.handleDownloadVideos();
                        break;
                    case ',':
                        e.preventDefault();
                        this.showSettingsModal();
                        break;
                    case '/':
                        e.preventDefault();
                        // Show shortcuts tab in settings
                        this.showSettingsModal();
                        // Switch to shortcuts tab
                        setTimeout(() => {
                            const shortcutsTab = document.querySelector('.settings-tab[data-tab="shortcuts"]');
                            if (shortcutsTab) shortcutsTab.click();
                        }, 100);
                        break;
                }
            }
            // Non-modifier shortcuts
            else {
                switch (e.key) {
                    case 'Delete':
                    case 'Backspace':
                        e.preventDefault();
                        const selectedVideos = this.state.getSelectedVideos();
                        if (selectedVideos.length > 0) {
                            selectedVideos.forEach(video => {
                                this.state.removeVideo(video.id);
                            });
                            this.updateStatusMessage(`Removed ${selectedVideos.length} video(s)`);
                        }
                        break;
                    case ' ':
                        // Space to toggle selection of focused video
                        e.preventDefault();
                        const focusedItem = document.querySelector('.video-item:focus-within');
                        if (focusedItem) {
                            const videoId = focusedItem.dataset.videoId;
                            if (videoId) {
                                this.state.toggleVideoSelection(videoId);
                            }
                        }
                        break;
                    case 'Escape':
                        // Close any open modals
                        const modals = ['settingsModal', 'playlistModal', 'previewModal', 'historyModal'];
                        modals.forEach(modalId => {
                            const modal = document.getElementById(modalId);
                            if (modal && modal.classList.contains('flex')) {
                                modal.classList.remove('flex');
                                modal.classList.add('hidden');
                            }
                        });
                        break;
                    case 'p':
                    case 'P':
                        // Pause/Resume selected downloading videos
                        e.preventDefault();
                        const selectedVids = this.state.getSelectedVideos();
                        if (selectedVids.length > 0) {
                            selectedVids.forEach(video => {
                                if (video.status === 'downloading') {
                                    this.handlePauseDownload(video.id);
                                } else if (video.status === 'paused') {
                                    this.handleResumeDownload(video.id);
                                }
                            });
                        }
                        break;
                }
            }
        });
    }

    // Ensure save directory exists
    async ensureSaveDirectoryExists() {
        const savePath = this.state.config.savePath;
        if (!savePath || !window.electronAPI) return;

        try {
            const result = await window.electronAPI.createDirectory(savePath);
            if (!result.success) {
                console.warn('Failed to create save directory:', result.error);
            } else {
                console.log('Save directory ready:', result.path);
            }
        } catch (error) {
            console.error('Error creating directory:', error);
        }
    }

    // Check binary status and validate with blocking dialog if missing
    async checkAndValidateBinaries() {
        if (!window.IPCManager || !window.IPCManager.isAvailable()) return;

        try {
            const versions = await window.IPCManager.checkBinaryVersions();

            // Handle both ytDlp (from main.js) and ytdlp (legacy) formats
            const ytdlp = versions.ytDlp || versions.ytdlp;
            const ffmpeg = versions.ffmpeg;

            if (!versions || !ytdlp || !ytdlp.available || !ffmpeg || !ffmpeg.available) {
                this.updateDependenciesButtonStatus('missing');
                this.updateBinaryVersionDisplay(null);

                // Show blocking dialog to warn user
                await this.showMissingBinariesDialog(ytdlp, ffmpeg);
            } else {
                this.updateDependenciesButtonStatus('ok');
                // Normalize the format for display
                const normalizedVersions = {
                    ytdlp: ytdlp,
                    ffmpeg: ffmpeg
                };
                this.updateBinaryVersionDisplay(normalizedVersions);
            }
        } catch (error) {
            console.error('Error checking binary status:', error);
            // Set missing status on error
            this.updateDependenciesButtonStatus('missing');
            this.updateBinaryVersionDisplay(null);

            // Show dialog on error too
            await this.showMissingBinariesDialog(null, null);
        }
    }

    // Show blocking dialog when binaries are missing
    async showMissingBinariesDialog(ytdlp, ffmpeg) {
        // Determine which binaries are missing
        const missingBinaries = [];
        if (!ytdlp || !ytdlp.available) missingBinaries.push('yt-dlp');
        if (!ffmpeg || !ffmpeg.available) missingBinaries.push('ffmpeg');

        const missingList = missingBinaries.length > 0
            ? missingBinaries.join(', ')
            : 'yt-dlp and ffmpeg';

        if (window.electronAPI && window.electronAPI.showErrorDialog) {
            // Use native Electron dialog
            await window.electronAPI.showErrorDialog({
                title: 'Required Binaries Missing',
                message: `The following required binaries are missing: ${missingList}`,
                detail: 'Please run "npm run setup" in the terminal to download the required binaries.\n\n' +
                       'Without these binaries, GrabZilla cannot download or convert videos.\n\n' +
                       'After running "npm run setup", restart the application.'
            });
        } else {
            // Fallback to browser alert
            alert(
                `⚠️ Required Binaries Missing\n\n` +
                `Missing: ${missingList}\n\n` +
                `Please run "npm run setup" to download the required binaries.\n\n` +
                `Without these binaries, GrabZilla cannot download or convert videos.`
            );
        }
    }

    // Check binary status and update UI (non-blocking version for updates)
    async checkBinaryStatus() {
        if (!window.IPCManager || !window.IPCManager.isAvailable()) return;

        try {
            const versions = await window.IPCManager.checkBinaryVersions();

            // Handle both ytDlp (from main.js) and ytdlp (legacy) formats
            const ytdlp = versions.ytDlp || versions.ytdlp;
            const ffmpeg = versions.ffmpeg;

            if (!versions || !ytdlp || !ytdlp.available || !ffmpeg || !ffmpeg.available) {
                this.updateDependenciesButtonStatus('missing');
                this.updateBinaryVersionDisplay(null);
            } else {
                this.updateDependenciesButtonStatus('ok');
                // Normalize the format for display
                const normalizedVersions = {
                    ytdlp: ytdlp,
                    ffmpeg: ffmpeg
                };
                this.updateBinaryVersionDisplay(normalizedVersions);
            }
        } catch (error) {
            console.error('Error checking binary status:', error);
            // Set missing status on error
            this.updateDependenciesButtonStatus('missing');
            this.updateBinaryVersionDisplay(null);
        }
    }

    updateBinaryVersionDisplay(versions) {
        const statusMessage = document.getElementById('statusMessage');
        const ytdlpVersionNumber = document.getElementById('ytdlpVersionNumber');
        const ytdlpUpdateBadge = document.getElementById('ytdlpUpdateBadge');
        const ffmpegVersionNumber = document.getElementById('ffmpegVersionNumber');
        const lastUpdateCheck = document.getElementById('lastUpdateCheck');

        if (!versions) {
            // Binaries missing
            if (statusMessage) statusMessage.textContent = 'Ready to download videos - Binaries required';
            if (ytdlpVersionNumber) ytdlpVersionNumber.textContent = 'missing';
            if (ffmpegVersionNumber) ffmpegVersionNumber.textContent = 'missing';
            if (ytdlpUpdateBadge) ytdlpUpdateBadge.classList.add('hidden');
            if (lastUpdateCheck) lastUpdateCheck.textContent = '--';
            return;
        }

        // Update yt-dlp version
        if (ytdlpVersionNumber) {
            const ytdlpVersion = versions.ytdlp?.version || 'unknown';
            ytdlpVersionNumber.textContent = ytdlpVersion;
        }

        // Show/hide update badge for yt-dlp
        if (ytdlpUpdateBadge) {
            if (versions.ytdlp?.updateAvailable) {
                ytdlpUpdateBadge.classList.remove('hidden');
                ytdlpUpdateBadge.title = `Update available: ${versions.ytdlp.latestVersion || 'newer version'}`;
            } else {
                ytdlpUpdateBadge.classList.add('hidden');
            }
        }

        // Update ffmpeg version
        if (ffmpegVersionNumber) {
            const ffmpegVersion = versions.ffmpeg?.version || 'unknown';
            ffmpegVersionNumber.textContent = ffmpegVersion;
        }

        // Update last check timestamp
        if (lastUpdateCheck) {
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            lastUpdateCheck.textContent = `checked ${timeString}`;
            lastUpdateCheck.title = `Last update check: ${now.toLocaleString()}`;
        }

        // Update status message
        if (statusMessage) {
            const hasUpdates = versions.ytdlp?.updateAvailable;
            statusMessage.textContent = hasUpdates ?
                'Update available for yt-dlp' :
                'Ready to download videos';
        }
    }

    updateDependenciesButtonStatus(status) {
        const btn = document.getElementById('updateDepsBtn');
        if (!btn) return;

        if (status === 'missing') {
            btn.classList.add('bg-red-600', 'animate-pulse');
            btn.classList.remove('bg-[#314158]');
            btn.innerHTML = '<img src="assets/icons/refresh.svg" alt="" width="16" height="16" loading="lazy">⚠️ Required';
        } else {
            btn.classList.remove('bg-red-600', 'animate-pulse');
            btn.classList.add('bg-[#314158]');
            btn.innerHTML = '<img src="assets/icons/refresh.svg" alt="" width="16" height="16" loading="lazy">Check for Updates';
        }
    }

    // State persistence
    async loadState() {
        try {
            const savedState = localStorage.getItem('grabzilla-state');
            if (savedState) {
                const data = JSON.parse(savedState);
                this.state.fromJSON(data);
                console.log('✅ Loaded saved state');

                // Re-render video list to show restored videos
                this.renderVideoList();
                this.updateSavePathDisplay();
                this.updateStatsDisplay();
            }
        } catch (error) {
            console.warn('Failed to load saved state:', error);
        }
    }

    async saveState() {
        try {
            const stateData = this.state.toJSON();
            localStorage.setItem('grabzilla-state', JSON.stringify(stateData));
        } catch (error) {
            console.warn('Failed to save state:', error);
        }
    }

    // Lifecycle methods
    handleInitializationError(error) {
        // Show fallback UI or error message
        const statusElement = document.getElementById('statusMessage');
        if (statusElement) {
            statusElement.textContent = 'Failed to initialize application';
        }
    }

    destroy() {
        // Clean up resources
        if (this.state) {
            this.saveState();
        }

        // Remove event listeners
        this.eventBus?.removeAllListeners();

        this.initialized = false;
        console.log('🧹 GrabZilla app destroyed');
    }
}

// Initialize function to be called after all scripts are loaded
window.initializeGrabZilla = function() {
    window.app = new GrabZillaApp();
    window.app.init();
};

// Auto-save state on page unload
window.addEventListener('beforeunload', () => {
    if (window.app?.initialized) {
        window.app.saveState();
    }
});

// Export the app class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GrabZillaApp;
} else {
    window.GrabZillaApp = GrabZillaApp;
}